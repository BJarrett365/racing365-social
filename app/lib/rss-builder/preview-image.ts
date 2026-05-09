/**
 * Logic shared with the RSS Import Builder preview cards: which URL to use for `<img src>`.
 */

export function extractFirstImageSrcFromHtml(html: string): string {
  if (!html?.trim()) return "";
  const patterns = [/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i, /\bdata-src\s*=\s*["']([^"']+)["']/i];
  for (const re of patterns) {
    const m = re.exec(html);
    const u = m?.[1]?.trim();
    if (u) return u;
  }
  return "";
}

export function urlLooksLikeImage(url: string): boolean {
  return (
    /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?|#|$)/i.test(url) ||
    /\/image\/|\/images?\/|\/images\/news\/|imgix|cloudinary/i.test(url) ||
    /\/_next\/image\?/i.test(url)
  );
}

/** Preview: DB `image_url`, then first `<img>` / `data-src` in description, then image-like `enclosure_url`. */
export function resolvePreviewImageUrl(item: {
  image_url: string | null;
  enclosure_url: string | null;
  description_html: string | null;
}): string {
  const direct = item.image_url?.trim() ?? "";
  if (direct) return direct;
  const fromDesc = extractFirstImageSrcFromHtml(item.description_html ?? "");
  if (fromDesc) return fromDesc;
  const enc = item.enclosure_url?.trim() ?? "";
  if (enc && urlLooksLikeImage(enc)) return enc;
  return "";
}
