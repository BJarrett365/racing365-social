/**
 * Modular article HTML parsing — add host-specific parsers later by extending
 * {@link ArticleHtmlParser} and registering in {@link selectArticleParser}.
 */

export type ParsedArticleFields = {
  title?: string;
  summary?: string;
  bodyText?: string;
  heroImageUrl?: string;
  sourceName?: string;
  author?: string;
  publishDate?: string;
  tags?: string[];
};

export interface ArticleHtmlParser {
  /** Stable id for logging / debugging. */
  readonly id: string;
  /** Whether this parser should run for the given hostname (e.g. `www.football365.com`). */
  matches(hostname: string): boolean;
  parse(html: string, canonicalUrl: string): ParsedArticleFields;
}
