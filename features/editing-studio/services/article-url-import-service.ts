import { newEditingStudioId } from "@/features/editing-studio/lib/new-id";
import { selectArticleParser } from "@/features/editing-studio/lib/article-import/select-parser";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";
import type { ContentType, EditingAsset } from "@/features/editing-studio/types/domain";
import type { ImportExtractedArticle, ImportUrlRequest, ImportUrlResponse } from "@/features/editing-studio/types/import-url";

const MAX_BODY_STORE = 500_000;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeUrl(raw: string): URL {
  const u = new URL(raw.trim());
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("URL must use http or https");
  }
  return u;
}

/**
 * Fetches HTML, runs modular parser chain, persists a new {@link EditingProject}.
 */
export class ArticleUrlImportService {
  async importFromUrlAndCreate(req: ImportUrlRequest): Promise<ImportUrlResponse> {
    const url = normalizeUrl(req.url);
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "PlexaEditingStudioImport/1.0",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Could not fetch this URL (${res.status}).`);
    }
    const html = await res.text();
    if (!html.trim()) {
      throw new Error("The page returned empty content.");
    }

    const parser = selectArticleParser(url.hostname);
    const parsed = parser.parse(html, url.toString());

    const extracted: ImportExtractedArticle = {
      title: parsed.title,
      summary: parsed.summary,
      bodyText: parsed.bodyText,
      heroImageUrl: parsed.heroImageUrl,
      sourceName: parsed.sourceName,
      author: parsed.author,
      publishDate: parsed.publishDate,
      tags: parsed.tags,
    };

    const ts = nowIso();
    const builtAssets: EditingAsset[] = [];

    if (parsed.heroImageUrl?.trim()) {
      builtAssets.push({
        id: newEditingStudioId("ast"),
        kind: "image",
        label: "Hero",
        url: parsed.heroImageUrl.trim(),
        createdAt: ts,
        updatedAt: ts,
        meta: { fromImport: true },
      });
    }

    builtAssets.push({
      id: newEditingStudioId("ast"),
      kind: "link",
      label: "Source",
      url: url.toString(),
      createdAt: ts,
      updatedAt: ts,
    });

    const summaryTrim = parsed.summary?.trim();
    const title =
      parsed.title?.trim() ||
      (summaryTrim ? summaryTrim.slice(0, 120) : "") ||
      url.hostname.replace(/^www\./, "");

    const description =
      parsed.summary?.trim() ||
      (parsed.bodyText?.trim() ? parsed.bodyText.trim().slice(0, 600) : undefined) ||
      `Imported from ${url.hostname}`;

    const bodyStore = parsed.bodyText ? parsed.bodyText.slice(0, MAX_BODY_STORE) : undefined;

    const contentType: ContentType = req.contentType ?? "article_promo";

    const project = await getEditingStudioRepository().createProject({
      title,
      sourceUrl: url.toString(),
      brand: req.brand?.trim() || undefined,
      description,
      contentType,
      status: "draft",
      platforms: [],
      assets: builtAssets,
      copyVariants: [],
      integrationMeta: {
        articleImport: {
          parserId: parser.id,
          sourceUrl: url.toString(),
          sourceName: parsed.sourceName,
          author: parsed.author,
          publishDate: parsed.publishDate,
          tags: parsed.tags,
          fetchedAt: ts,
        },
        ...(bodyStore ? { articleBody: bodyStore } : {}),
      },
    });

    return { project, extracted };
  }
}
