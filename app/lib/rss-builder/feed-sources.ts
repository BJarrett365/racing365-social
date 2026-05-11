import type { RssFeedSourceType } from "@/app/lib/rss-builder/types";

/** Split textarea / stored text into non-empty trimmed URLs (one per line). */
export function splitFeedSourceUrls(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map((u) => u.trim())
    .filter(Boolean);
}

function dedupePreserveOrder(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/**
 * URLs to fetch for one feed crawl. Merges `source_url` and `manual_urls` when both are set
 * (multiple sites / feeds in one export). `manual_urls` source type uses the manual field first.
 * `xml_feed` merges URLs the same way as `rss_url`; crawl treats each URL as strict RSS/Atom only.
 */
export function collectFeedCrawlUrls(feed: {
  source_type: RssFeedSourceType;
  source_url: string | null;
  manual_urls: string | null;
}): string[] {
  const primary = splitFeedSourceUrls(feed.source_url);
  const secondary = splitFeedSourceUrls(feed.manual_urls);
  if (feed.source_type === "manual_urls") {
    const list = secondary.length > 0 ? secondary : primary;
    if (list.length === 0) {
      throw new Error("Feed has no manual URLs. Add one URL per line in Manual URLs (or Source URL as fallback).");
    }
    return dedupePreserveOrder(list);
  }
  const merged = [...primary, ...secondary];
  if (merged.length === 0) {
    throw new Error("Feed has no source URLs. Add one or more URLs — one per line — in Source URL and/or Manual URLs.");
  }
  return dedupePreserveOrder(merged);
}
