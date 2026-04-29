import type { ContentType, EditingProject } from "@/features/editing-studio/types/domain";

/**
 * POST /api/editing/import/url — request body.
 */
export type ImportUrlRequest = {
  url: string;
  brand?: string;
  /** Defaults to article_promo when omitted. */
  contentType?: ContentType;
};

/**
 * Normalised fields extracted from HTML (all optional — parsers best-effort).
 */
export type ImportExtractedArticle = {
  title?: string;
  summary?: string;
  bodyText?: string;
  heroImageUrl?: string;
  sourceName?: string;
  author?: string;
  publishDate?: string;
  tags?: string[];
};

/**
 * POST /api/editing/import/url — success payload.
 */
export type ImportUrlResponse = {
  project: EditingProject;
  extracted: ImportExtractedArticle;
};
