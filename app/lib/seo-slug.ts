/**
 * URL- and filename-safe slugs for video names and downloads (no Node APIs).
 */

const MAX_DEFAULT = 80;

/** Lowercase slug: letters, digits, hyphens only. */
export function slugifyForSeo(input: string, maxLen = MAX_DEFAULT): string {
  const s = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  const cut = s.slice(0, maxLen).replace(/-+$/g, "");
  return cut || "racing365";
}

/** Unique-ish stem for MP4/SRT naming (no `-short` suffix — that is appended by the pipeline). */
export function buildVideoSlug(seoTitle: string, contentId: string): string {
  const a = slugifyForSeo(seoTitle.trim() || contentId, 56);
  const b = slugifyForSeo(contentId.trim(), 36);
  const joined = [a, b].filter(Boolean).join("-");
  return slugifyForSeo(joined, MAX_DEFAULT);
}
