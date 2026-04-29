/**
 * Decodes common HTML entities in plain text (e.g. from meta tags, CMS copy).
 * Apply before HTML-escaping when inserting into templates so literals like
 * `&quot;` become real quotes instead of showing on screen.
 */
export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#0*([0-9]+);?/g, (_, dec: string) => {
      const n = Number(dec);
      if (!Number.isFinite(n)) return "";
      try {
        return String.fromCodePoint(n);
      } catch {
        return "";
      }
    })
    .replace(/&#x0*([0-9a-fA-F]+);?/g, (_, hex: string) => {
      const n = Number.parseInt(hex, 16);
      if (!Number.isFinite(n)) return "";
      try {
        return String.fromCodePoint(n);
      } catch {
        return "";
      }
    })
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;|&prime;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
