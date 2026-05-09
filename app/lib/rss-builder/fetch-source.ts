import { extractXmlPayload } from "@/app/lib/language-studio/import-feed";

export async function fetchRssXml(sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl, {
    cache: "no-store",
    headers: { "user-agent": "PlanetSportStudio-RssBuilder/1.0", accept: "application/rss+xml,application/xml,text/xml,*/*" },
  });
  if (!res.ok) throw new Error(`Could not fetch feed (${res.status}).`);
  return extractXmlPayload(await res.text());
}
