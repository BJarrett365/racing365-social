import { extractXmlPayload } from "@/app/lib/language-studio/import-feed";

const fetchHeaders = {
  "user-agent": "PlanetSportStudio-RssBuilder/1.0",
  accept: "application/rss+xml,application/xml,text/xml,*/*",
} as const;

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
