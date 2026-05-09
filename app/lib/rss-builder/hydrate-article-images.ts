import type { PreparedItem } from "@/app/lib/rss-builder/apply-filters";
import { fetchArticlePageBody } from "@/app/lib/rss-builder/fetch-source";
import { extractHeroImageFromArticleHtml } from "@/app/lib/rss-builder/html-listing";

const FETCH_CONCURRENCY = 3;

/**
 * When listing/hub HTML did not yield per-item `imageUrl`, fetch each article page and read
 * og:image / Sporting Life CDN. Runs before `hideNoImage` filters so those items can stay visible.
 */
export async function hydrateMissingArticleHeroImages(
  items: PreparedItem[],
  opts?: { maxFetches?: number },
): Promise<PreparedItem[]> {
  const maxFetches = Math.min(Math.max(1, opts?.maxFetches ?? 40), 80);
  const missing = items.filter((it) => !it.imageUrl?.trim() && /^https:\/\//i.test(it.link));
  if (missing.length === 0) return items;

  const toProbe = missing.slice(0, maxFetches);
  const linkToImage = new Map<string, string>();

  for (let i = 0; i < toProbe.length; i += FETCH_CONCURRENCY) {
    const batch = toProbe.slice(i, i + FETCH_CONCURRENCY);
    await Promise.all(
      batch.map(async (it) => {
        try {
          const html = await fetchArticlePageBody(it.link);
          if (!html.trim()) return;
          const img = extractHeroImageFromArticleHtml(html, it.link);
          if (img) linkToImage.set(it.link, img);
        } catch {
          /* timeout / network */
        }
      }),
    );
  }

  if (linkToImage.size === 0) return items;
  return items.map((it) => {
    if (it.imageUrl?.trim()) return it;
    const img = linkToImage.get(it.link);
    return img ? { ...it, imageUrl: img } : it;
  });
}
