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

async function fetchViaPuppeteer(url: string): Promise<WhoScoredFetchResult> {
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
      if (!isStatisticsFeedUrl(responseUrl)) return;
      void res
        .text()
        .then((text) => {
          const trimmed = text.trim();
          if (!trimmed.startsWith("{")) return;
          jsonCaptures.push({ url: responseUrl, data: JSON.parse(trimmed) as unknown });
        })
        .catch(() => undefined);
    });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
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
    const html = await page.content();
    if (isCloudflareBlock(html)) {
      throw new Error("WhoScored returned a Cloudflare block page.");
    }
    if (
      jsonCaptures.length === 0 &&
      !html.includes("statistics-table-home-summary") &&
      !html.includes("statistics-table-away-summary") &&
      !/rating/i.test(html)
    ) {
      throw new Error("WhoScored page did not load player statistics.");
    }
    return { html, jsonCaptures, via: "puppeteer" };
  } finally {
    await browser.close();
  }
}

type ApifyRunResponse = {
  data?: {
    status?: string;
    defaultDatasetId?: string;
  };
};

async function fetchViaApify(url: string, token: string): Promise<WhoScoredFetchResult> {
  const runUrl = new URL("https://api.apify.com/v2/acts/apify~playwright-scraper/runs");
  runUrl.searchParams.set("token", token);
  runUrl.searchParams.set("waitForFinish", "120");

  const input = {
    startUrls: [{ url }],
    proxyConfiguration: { useApifyProxy: true },
    maxRequestsPerCrawl: 1,
    headless: true,
    pageFunction: `async function pageFunction(context) {
      const jsonCaptures = [];
      context.page.on('response', async (res) => {
        const u = res.url();
        if (!/getmatchcentreplayerstatistics/i.test(u)) return;
        try {
          const text = await res.text();
          if (text.trim().startsWith('{')) jsonCaptures.push({ url: u, data: JSON.parse(text) });
        } catch (e) {}
      });
      await context.page.goto(context.request.url, { waitUntil: 'networkidle2', timeout: 60000 });
      await context.page.waitForSelector('#statistics-table-home-summary tbody tr, #statistics-table-away-summary tbody tr', { timeout: 25000 }).catch(() => {});
      await context.page.waitForTimeout(2000);
      return { html: await context.page.content(), jsonCaptures, title: await context.page.title(), url: context.request.url };
    }`,
    pageFunctionTimeoutSecs: 120,
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
  const datasetId = runPayload.data?.defaultDatasetId;
  if (!datasetId) throw new Error("Apify WhoScored run did not return a dataset.");

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?token=${encodeURIComponent(token)}&clean=true&limit=1`,
    { cache: "no-store" },
  );
  if (!itemsRes.ok) throw new Error(`Apify dataset read failed (HTTP ${itemsRes.status}).`);

  const items = (await itemsRes.json()) as Array<{ html?: string; jsonCaptures?: WhoScoredCapturedJson[] }>;
  const html = items[0]?.html?.trim() ?? "";
  if (!html) throw new Error("Apify returned an empty WhoScored page.");
  if (isCloudflareBlock(html)) {
    throw new Error("Apify still received a Cloudflare block from WhoScored.");
  }
  return { html, jsonCaptures: items[0]?.jsonCaptures ?? [], via: "apify" };
}

export async function fetchWhoScoredPage(url: string): Promise<WhoScoredFetchResult> {
  try {
    return await fetchViaPuppeteer(url);
  } catch (puppeteerError) {
    const token = await getServerSecretAsync("APIFY_API_TOKEN");
    if (token) {
      try {
        return await fetchViaApify(url, token);
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
