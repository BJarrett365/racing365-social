import { extractXmlPayload } from "@/app/lib/language-studio/import-feed";

/** Many publisher WAFs return 403/406 for non-browser UAs or Accept headers that omit text/html. */
function rssBuilderUserAgent(): string {
  const fromEnv = process.env.RSS_BUILDER_USER_AGENT?.trim();
  if (fromEnv) return fromEnv;
  return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
}

function rssBuilderFetchHeaders(sourceUrl: string): Record<string, string> {
  let referer = "";
  try {
    referer = new URL(sourceUrl).origin + "/";
  } catch {
    /* ignore */
  }
  return {
    "user-agent": rssBuilderUserAgent(),
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,text/xml;q=0.9,application/rss+xml;q=0.9,application/atom+xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-GB,en;q=0.9",
    ...(referer ? { referer } : {}),
  };
}

const articlePageHeaders = (): Record<string, string> => ({
  "user-agent": rssBuilderUserAgent(),
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-GB,en;q=0.9",
});

/** Fetch an HTML article page (Accept: text/html) for hero image extraction. */
export async function fetchArticlePageBody(articleUrl: string): Promise<string> {
  let referer = "";
  try {
    referer = new URL(articleUrl).origin + "/";
  } catch {
    /* ignore */
  }
  const res = await fetch(articleUrl, {
    cache: "no-store",
    headers: { ...articlePageHeaders(), ...(referer ? { referer } : {}) },
    signal: AbortSignal.timeout(14_000),
  });
  if (!res.ok) return "";
  return res.text();
}

const RSS_SOURCE_FETCH_TIMEOUT_MS = 25_000;

/** Raw response body (before XML extraction). */
export async function fetchRssSourceBody(sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl, {
    cache: "no-store",
    headers: rssBuilderFetchHeaders(sourceUrl),
    signal: AbortSignal.timeout(RSS_SOURCE_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const hint =
      res.status === 403 || res.status === 401
        ? " (site may block automated requests from this server; try an official RSS URL or a different host)"
        : res.status === 406
          ? " (site rejected this request — try the page’s direct RSS/Atom link if one exists)"
          : "";
    throw new Error(`Could not fetch feed (${res.status}): ${sourceUrl}${hint}`);
  }
  return res.text();
}

export async function fetchRssXml(sourceUrl: string): Promise<string> {
  return extractXmlPayload(await fetchRssSourceBody(sourceUrl));
}
