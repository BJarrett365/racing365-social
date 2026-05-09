/** Parse RSS / article publish strings to epoch ms; 0 if unknown. */
export function parsePublishMs(publishDate?: string): number {
  if (!publishDate?.trim()) return 0;
  const t = Date.parse(publishDate.trim());
  return Number.isFinite(t) ? t : 0;
}

export function sortArticlesByPublishDateDesc<T extends { publishDate?: string }>(articles: readonly T[]): T[] {
  return [...articles].sort((a, b) => parsePublishMs(b.publishDate) - parsePublishMs(a.publishDate));
}

/** Advance stored watermark to the latest publish time seen (feed or stored). */
export function mergePublishWatermark(prevIso: string | null | undefined, articles: readonly { publishDate?: string }[]): string | undefined {
  const prev = prevIso?.trim() ? parsePublishMs(prevIso) : 0;
  const fromArticles = articles.map((a) => parsePublishMs(a.publishDate)).filter((n) => n > 0);
  const runMax = fromArticles.length ? Math.max(...fromArticles) : 0;
  const m = Math.max(prev, runMax);
  return m > 0 ? new Date(m).toISOString() : prevIso?.trim() || undefined;
}
