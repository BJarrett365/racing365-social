import "server-only";

import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { loadPuppeteer, resolvePuppeteerLaunchOptions } from "@/app/lib/puppeteer-launch";

export type WhoScoredCapturedJson = {
  url: string;
  data: unknown;
};

export type WhoScoredFetchResult = {
  html: string;
  jsonCaptures: WhoScoredCapturedJson[];
  via: "puppeteer" | "apify";
};

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function isCloudflareBlock(html: string): boolean {
  const sample = html.slice(0, 8000).toLowerCase();
  return (
    sample.includes("attention required") ||
    (sample.includes("cloudflare") && sample.includes("ray id")) ||
    sample.includes("cf-browser-verification") ||
    (sample.includes("403") && sample.includes("forbidden") && html.length < 20_000)
  );
}

function isStatisticsFeedUrl(responseUrl: string): boolean {
  return /getmatchcentreplayerstatistics/i.test(responseUrl);
}

function isPreviewFeedUrl(responseUrl: string): boolean {
  if (!/whoscored\.com/i.test(responseUrl)) return false;
  return /(statisticsfeed|feeds|tournamentsfeed)/i.test(responseUrl);
}

function shouldCaptureJsonResponse(responseUrl: string, mode: "playerStats" | "preview"): boolean {
  return mode === "playerStats" ? isStatisticsFeedUrl(responseUrl) : isPreviewFeedUrl(responseUrl);
}

function pageLooksLikePlayerStatistics(html: string, jsonCaptures: WhoScoredCapturedJson[]): boolean {
  if (jsonCaptures.length > 0) return true;
  if (html.includes("statistics-table-home-summary") || html.includes("statistics-table-away-summary")) {
    return true;
  }
  return /rating/i.test(html);
}

function pageLooksLikePreviewPage(html: string, jsonCaptures: WhoScoredCapturedJson[]): boolean {
  if (
    jsonCaptures.some((capture) =>
      /previous|meeting|form|fact|preview|fixture|streak|head/i.test(capture.url),
    )
  ) {
    return true;
  }
  const sample = html.toLowerCase();
  return (
    sample.includes("previous meetings") ||
    sample.includes("head to head") ||
    sample.includes("match forecast") ||
    sample.includes("form guide") ||
    /fifa world cup|premier league|serie a/i.test(sample)
  );
}

function describeEmptyWhoScoredPreviewPage(html: string): string {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
  if (html.length < 2_000 || title === "WhoScored.com") {
    return "WhoScored returned an empty or invalid preview page — check the match URL uses the show or preview tab.";
  }
  if (isCloudflareBlock(html)) {
    return "WhoScored returned a Cloudflare block page.";
  }
  return "WhoScored preview page did not load head-to-head or form data — paste the match show/preview URL from WhoScored.";
}

function describeEmptyWhoScoredPage(html: string): string {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
  if (html.length < 2_000 || title === "WhoScored.com") {
    return "WhoScored returned an empty or invalid match page — check the match ID and use the Live Statistics tab URL for a finished match.";
  }
  if (isCloudflareBlock(html)) {
    return "WhoScored returned a Cloudflare block page.";
  }
  return "WhoScored page did not load player statistics — open Live Statistics on WhoScored for this fixture and paste that URL.";
}

async function fetchViaPuppeteer(url: string, mode: "playerStats" | "preview"): Promise<WhoScoredFetchResult> {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch(await resolvePuppeteerLaunchOptions());
  const jsonCaptures: WhoScoredCapturedJson[] = [];
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60_000);
    await page.setUserAgent(BROWSER_UA);
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-GB,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });
    page.on("response", (res) => {
      const responseUrl = res.url();
      if (!shouldCaptureJsonResponse(responseUrl, mode)) return;
      void res
        .text()
        .then((text) => {
          const trimmed = text.trim();
          if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return;
          jsonCaptures.push({ url: responseUrl, data: JSON.parse(trimmed) as unknown });
        })
        .catch(() => undefined);
    });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
    if (mode === "playerStats") {
      await Promise.race([
        page.waitForFunction(
          () => {
            const feeds = performance.getEntriesByType("resource").filter((e) =>
              /getmatchcentreplayerstatistics/i.test(e.name),
            ).length;
            return (
              feeds >= 2 ||
              Boolean(document.querySelector("#statistics-table-home-summary tbody tr")) ||
              Boolean(document.querySelector("#statistics-table-away-summary tbody tr"))
            );
          },
          { timeout: 25_000 },
        ),
        page.waitForSelector("#statistics-table-home-summary tbody tr, #statistics-table-away-summary tbody tr", {
          timeout: 25_000,
        }),
      ]).catch(() => undefined);
      await new Promise((r) => setTimeout(r, 1500));
    } else {
      await Promise.race([
        page.waitForFunction(
          () => {
            const body = document.body?.innerText?.toLowerCase() ?? "";
            return (
              body.includes("previous meetings") ||
              body.includes("head to head") ||
              body.includes("match forecast") ||
              performance
                .getEntriesByType("resource")
                .some((e) => /statisticsfeed|tournamentsfeed|feeds/i.test(e.name))
            );
          },
          { timeout: 30_000 },
        ),
        new Promise((r) => setTimeout(r, 30_000)),
      ]).catch(() => undefined);
      await new Promise((r) => setTimeout(r, 2500));
    }
    const html = await page.content();
    if (mode === "playerStats") {
      if (!pageLooksLikePlayerStatistics(html, jsonCaptures)) {
        throw new Error(describeEmptyWhoScoredPage(html));
      }
    } else if (!pageLooksLikePreviewPage(html, jsonCaptures)) {
      throw new Error(describeEmptyWhoScoredPreviewPage(html));
    }
    return { html, jsonCaptures, via: "puppeteer" };
  } finally {
    await browser.close();
  }
}

type ApifyRunResponse = {
  data?: {
    id?: string;
    status?: string;
    defaultDatasetId?: string;
  };
};

const APIFY_TERMINAL_STATUSES = new Set(["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]);

async function pollApifyRun(
  runId: string,
  token: string,
  timeoutMs = 120_000,
): Promise<ApifyRunResponse["data"]> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Apify WhoScored status check failed (HTTP ${res.status}).`);
    }
    const payload = (await res.json()) as ApifyRunResponse;
    const data = payload.data;
    if (data?.status && APIFY_TERMINAL_STATUSES.has(data.status)) {
      if (data.status !== "SUCCEEDED") {
        throw new Error(`Apify WhoScored run ${data.status.toLowerCase()}.`);
      }
      return data;
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error("Apify WhoScored run timed out after 120 seconds.");
}

function apifyPageFunction(mode: "playerStats" | "preview"): string {
  const feedRe =
    mode === "playerStats"
      ? "getmatchcentreplayerstatistics"
      : "statisticsfeed|feeds|tournamentsfeed";
  const waitSnippet =
    mode === "playerStats"
      ? `await context.page.waitForSelector('#statistics-table-home-summary tbody tr, #statistics-table-away-summary tbody tr', { timeout: 25000 }).catch(() => {});
      await context.page.waitForTimeout(2000);`
      : `await context.page.waitForTimeout(8000);`;
  return `async function pageFunction(context) {
      const jsonCaptures = [];
      context.page.on('response', async (res) => {
        const u = res.url();
        if (!new RegExp('${feedRe}', 'i').test(u)) return;
        try {
          const text = await res.text();
          const t = text.trim();
          if (t.startsWith('{') || t.startsWith('[')) jsonCaptures.push({ url: u, data: JSON.parse(t) });
        } catch (e) {}
      });
      await context.page.goto(context.request.url, { waitUntil: 'networkidle2', timeout: 90000 });
      ${waitSnippet}
      return { html: await context.page.content(), jsonCaptures, title: await context.page.title(), url: context.request.url };
    }`;
}

async function fetchViaApify(
  url: string,
  token: string,
  mode: "playerStats" | "preview",
): Promise<WhoScoredFetchResult> {
  const runUrl = new URL("https://api.apify.com/v2/acts/apify~playwright-scraper/runs");
  runUrl.searchParams.set("token", token);

  const input = {
    startUrls: [{ url }],
    proxyConfiguration: { useApifyProxy: true },
    maxRequestsPerCrawl: 1,
    headless: true,
    pageFunction: apifyPageFunction(mode),
    pageFunctionTimeoutSecs: mode === "preview" ? 150 : 120,
  };

  const runRes = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(input),
  });
  if (!runRes.ok) {
    throw new Error(`Apify WhoScored fetch failed (HTTP ${runRes.status}).`);
  }

  const runPayload = (await runRes.json()) as ApifyRunResponse;
  const runId = runPayload.data?.id;
  if (!runId) throw new Error("Apify WhoScored run did not return a run id.");

  const finished = await pollApifyRun(runId, token);
  const datasetId = finished?.defaultDatasetId;
  if (!datasetId) throw new Error("Apify WhoScored run did not return a dataset.");

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?token=${encodeURIComponent(token)}&clean=true&limit=1`,
    { cache: "no-store" },
  );
  if (!itemsRes.ok) throw new Error(`Apify dataset read failed (HTTP ${itemsRes.status}).`);

  const items = (await itemsRes.json()) as Array<{ html?: string; jsonCaptures?: WhoScoredCapturedJson[] }>;
  const html = items[0]?.html?.trim() ?? "";
  const jsonCaptures = items[0]?.jsonCaptures ?? [];
  if (!html) throw new Error("Apify returned an empty WhoScored page.");
  if (mode === "playerStats") {
    if (!pageLooksLikePlayerStatistics(html, jsonCaptures)) {
      throw new Error(describeEmptyWhoScoredPage(html));
    }
  } else if (!pageLooksLikePreviewPage(html, jsonCaptures)) {
    throw new Error(describeEmptyWhoScoredPreviewPage(html));
  }
  return { html, jsonCaptures, via: "apify" };
}

async function fetchWhoScoredPageInternal(
  url: string,
  mode: "playerStats" | "preview",
): Promise<WhoScoredFetchResult> {
  try {
    return await fetchViaPuppeteer(url, mode);
  } catch (puppeteerError) {
    const token = await getServerSecretAsync("APIFY_API_TOKEN");
    if (token) {
      try {
        return await fetchViaApify(url, token, mode);
      } catch (apifyError) {
        const pe = puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError);
        const ae = apifyError instanceof Error ? apifyError.message : String(apifyError);
        throw new Error(`WhoScored fetch failed (browser: ${pe}; Apify: ${ae})`);
      }
    }
    const pe = puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError);
    throw new Error(
      `${pe} WhoScored blocks direct server requests. Ensure Chrome is available locally, or set APIFY_API_TOKEN in admin settings.`,
    );
  }
}

export async function fetchWhoScoredPage(url: string): Promise<WhoScoredFetchResult> {
  return fetchWhoScoredPageInternal(url, "playerStats");
}

export async function fetchWhoScoredPreviewPage(url: string): Promise<WhoScoredFetchResult> {
  return fetchWhoScoredPageInternal(url, "preview");
}
