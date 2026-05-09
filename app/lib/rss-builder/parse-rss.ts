import { XMLParser } from "fast-xml-parser";
import { decodeHtmlEntities } from "@/app/lib/html-entities";
import { sanitizeImportedContent } from "@/app/lib/language-studio/sanitize";
import type { RssChannelItem } from "@/app/lib/rss-builder/types";

type UnknownRecord = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "__cdata",
  parseTagValue: false,
  trimValues: true,
  stopNodes: [
    "*.content:encoded",
    "*.content",
    "*.atom:content",
    "*.description",
    "*.summary",
    "*.media:description",
  ],
});

function arr<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function rec(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  const r = rec(value);
  const cdata = r.__cdata;
  const inner = r["#text"];
  if (typeof cdata === "string") return cdata.trim();
  if (typeof inner === "string" || typeof inner === "number") return String(inner).trim();
  return "";
}

function first(...values: unknown[]): string {
  for (const value of values) {
    const t = text(value);
    if (t) return t;
  }
  return "";
}

function clean(value: string): string {
  return sanitizeImportedContent(decodeHtmlEntities(value));
}

function extractLink(item: UnknownRecord): string {
  const link = item.link;
  if (Array.isArray(link)) return first(...link);
  const linkRecord = rec(link);
  return first(linkRecord["@_href"], link);
}

function extractImageUrl(item: UnknownRecord): string {
  const mediaContent = arr(item["media:content"]).map((entry) => rec(entry)["@_url"]);
  const mediaThumbnail = arr(item["media:thumbnail"]).map((entry) => rec(entry)["@_url"]);
  const enclosures = arr(item.enclosure).map((entry) => rec(entry)["@_url"]);
  const candidates: unknown[] = [
    ...mediaContent,
    ...mediaThumbnail,
    ...enclosures,
    rec(item["media:content"])["@_url"],
    rec(item["media:thumbnail"])["@_url"],
    rec(item.enclosure)["@_url"],
    rec(item.image).url,
    item.image,
  ];
  const mediaGroup = rec(item["media:group"]);
  if (mediaGroup["media:content"]) {
    candidates.unshift(...arr(mediaGroup["media:content"]).map((entry) => rec(entry)["@_url"]));
  }
  return first(...candidates);
}

function extractEnclosureUrl(item: UnknownRecord): string {
  const enc = rec(arr(item.enclosure)[0] ?? item.enclosure);
  return first(enc["@_url"], enc.url);
}

function extractBodySnippet(item: UnknownRecord, fallback: string): string {
  const candidates = [item["content:encoded"], item["content"], item["atom:content"], item["media:description"], item.description, item.summary, fallback];
  const best = candidates.map(text).sort((a, b) => b.length - a.length)[0] ?? "";
  return best;
}

/**
 * Parse RSS 2.0 or Atom XML into channel title + normalized items (no DB writes).
 */
export function parseRssXmlToChannel(xml: string): { channelTitle: string; items: RssChannelItem[] } {
  const parsed = parser.parse(xml) as UnknownRecord;
  const rssChannel = rec(rec(parsed.rss).channel);
  const atomFeed = rec(parsed.feed);
  const channelTitle = clean(first(rssChannel.title, atomFeed.title, "Untitled feed"));
  const rawItems = arr<unknown>(rssChannel.item).length ? arr<unknown>(rssChannel.item) : arr<unknown>(atomFeed.entry);

  const items: RssChannelItem[] = rawItems.map((row, index) => {
    const item = rec(row);
    const title = clean(first(item.title, `Item ${index + 1}`));
    const link = extractLink(item) || `#${index}`;
    const guid = clean(first(item.guid, item.id, link));
    const descriptionRaw = first(item.description, item.summary, item.subtitle);
    const descriptionHtml = clean(extractBodySnippet(item, descriptionRaw));
    const imageUrl = clean(extractImageUrl(item));
    const enclosureUrl = clean(extractEnclosureUrl(item));
    const publishedRaw = first(item.pubDate, item.published, item.updated, item["atom:updated"]);
    return {
      title,
      link,
      guid,
      descriptionHtml,
      imageUrl,
      enclosureUrl,
      publishedRaw,
    };
  });

  return { channelTitle, items };
}
