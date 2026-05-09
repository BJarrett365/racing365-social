import { extractXmlPayload } from "@/app/lib/language-studio/import-feed";

const fetchHeaders = {
  "user-agent": "PlanetSportStudio-RssBuilder/1.0",
  accept: "application/rss+xml,application/xml,text/xml,*/*",
} as const;

const articlePageHeaders = {
  "user-agent": "PlanetSportStudio-RssBuilder/1.0",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
} as const;

/** Fetch an HTML article page (Accept: text/html) for hero image extraction. */
export async function fetchArticlePageBody(articleUrl: string): Promise<string> {
  const res = await fetch(articleUrl, {
    cache: "no-store",
    headers: articlePageHeaders,
    signal: AbortSignal.timeout(14_000),
  });
  if (!res.ok) return "";
  return res.text();
}

/** Raw response body (before XML extraction). */
export async function fetchRssSourceBody(sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl, {
    cache: "no-store",
    headers: fetchHeaders,
  });
  if (!res.ok) throw new Error(`Could not fetch feed (${res.status}): ${sourceUrl}`);
  return res.text();
}

export async function fetchRssXml(sourceUrl: string): Promise<string> {
  return extractXmlPayload(await fetchRssSourceBody(sourceUrl));
}
