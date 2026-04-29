import type { ArticleHtmlParser } from "@/features/editing-studio/lib/article-import/parser-types";
import { GenericArticleHtmlParser } from "@/features/editing-studio/lib/article-import/generic-html-parser";

/**
 * Host-specific parsers run first; add entries here for bespoke site patterns.
 * Example: `{ matches: (h) => h.endsWith('football365.com'), parser: new Football365Parser() }`
 */
const HOST_CHAIN: Array<{ matches: (hostname: string) => boolean; create: () => ArticleHtmlParser }> = [
  // Future: Planet Sport / Football365-specific parsers
];

const generic = new GenericArticleHtmlParser();

export function selectArticleParser(hostname: string): ArticleHtmlParser {
  const host = hostname.toLowerCase();
  for (const entry of HOST_CHAIN) {
    if (entry.matches(host)) return entry.create();
  }
  return generic;
}
