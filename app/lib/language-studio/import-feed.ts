import { enrichLanguageArticlesFromPages, extractSocialEmbedsFromBody } from "@/app/lib/language-studio/article-pages";
import { saveLanguageArticleImagesToLibrary } from "@/app/lib/language-studio/library-images";
import {
  newLanguageId,
  readLanguageStudioData,
  writeLanguageStudioData,
} from "@/app/lib/language-studio/store";
import { parseLanguageXmlFeed } from "@/app/lib/language-studio/xml";
import type { LanguageArticle, LanguageCode, LanguageImport } from "@/app/lib/language-studio/types";

export const DEFAULT_LANGUAGE_FEED_URL = "https://www.planetf1.com/partner-media-content-feed";

export type ImportLanguageFeedInput = {
  sourceBrand?: string;
  sourceLanguage?: LanguageCode;
  sourceUrl?: string;
  xml?: string;
  processImages?: boolean;
  importFullArticles?: boolean;
};

export type ImportLanguageFeedResult = {
  import: LanguageImport;
  articles: LanguageArticle[];
  createdCount: number;
  updatedCount: number;
  imageCount: number;
};

export function extractXmlPayload(input: string): string {
  const start = input.indexOf("<?xml");
  if (start >= 0) return input.slice(start).trim();
  const rssStart = input.indexOf("<rss");
  if (rssStart >= 0) return input.slice(rssStart).trim();
  const feedStart = input.indexOf("<feed");
  if (feedStart >= 0) return input.slice(feedStart).trim();
  return input.trim();
}

function articleKey(article: Pick<LanguageArticle, "sourceBrand" | "sourceArticleId" | "canonicalUrl">): string {
  const sourceKey = article.sourceArticleId?.trim() || article.canonicalUrl?.trim() || "";
  return `${article.sourceBrand.trim().toLowerCase()}::${sourceKey.toLowerCase()}`;
}

async function fetchXml(sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl, {
    cache: "no-store",
    headers: { "user-agent": "PLEXA Language Studio/1.0", accept: "application/rss+xml,application/xml,text/xml,*/*" },
  });
  if (!res.ok) throw new Error(`Could not fetch XML feed (${res.status}).`);
  return extractXmlPayload(await res.text());
}

export async function importLanguageFeed(input: ImportLanguageFeedInput): Promise<ImportLanguageFeedResult> {
  const sourceBrand = input.sourceBrand?.trim() || "PlanetF1";
  const sourceLanguage = input.sourceLanguage || "en";
  const sourceUrl = input.sourceUrl?.trim();
  let xml = extractXmlPayload(input.xml?.trim() || "");
  if (!xml && sourceUrl) xml = await fetchXml(sourceUrl);
  if (!xml) throw new Error("XML content or sourceUrl is required.");

  const importId = newLanguageId("limport");
  const parsed = parseLanguageXmlFeed(xml, { importId, sourceBrand, sourceLanguage, sourceUrl });
  const fullArticles = input.importFullArticles === false
    ? parsed.articles
    : await enrichLanguageArticlesFromPages(parsed.articles);
  const processedArticles = input.processImages === false
    ? fullArticles
    : await saveLanguageArticleImagesToLibrary(fullArticles);
  const articlesWithSocialEmbeds = processedArticles.map((article) => {
    if (article.socialEmbeds?.length) return article;
    const social = extractSocialEmbedsFromBody(article.body);
    return social.socialEmbeds.length
      ? { ...article, body: social.body, socialEmbeds: social.socialEmbeds, updatedAt: new Date().toISOString() }
      : article;
  });

  const existing = await readLanguageStudioData();
  const existingByKey = new Map<string, LanguageArticle>();
  for (const article of Object.values(existing.articles)) {
    const key = articleKey(article);
    if (key.endsWith("::")) continue;
    existingByKey.set(key, article);
  }

  let createdCount = 0;
  let updatedCount = 0;
  const now = new Date().toISOString();
  const articles = articlesWithSocialEmbeds.map((article) => {
    const match = existingByKey.get(articleKey(article));
    if (!match) {
      createdCount += 1;
      return article;
    }
    updatedCount += 1;
    return {
      ...match,
      ...article,
      id: match.id,
      createdAt: match.createdAt,
      status: match.status,
      updatedAt: now,
    };
  });

  const row: LanguageImport = {
    id: importId,
    sourceBrand,
    sourceLanguage,
    sourceUrl,
    title: parsed.feedTitle,
    articleIds: articles.map((article) => article.id),
    createdAt: now,
  };
  existing.imports[row.id] = row;
  for (const article of articles) existing.articles[article.id] = article;
  const auditId = newLanguageId("laudit");
  existing.auditLogs[auditId] = {
    id: auditId,
    createdAt: now,
    entityType: "language_import",
    entityId: importId,
    action: input.sourceUrl === DEFAULT_LANGUAGE_FEED_URL ? "cron_import_feed" : "import_xml",
    detail: `${articles.length} article(s) checked from ${sourceBrand}; ${createdCount} new; ${updatedCount} updated; ${articles.filter((article) => article.imageLibraryRel).length} image(s) saved to Library`,
  };
  await writeLanguageStudioData(existing);

  return {
    import: row,
    articles,
    createdCount,
    updatedCount,
    imageCount: articles.filter((article) => article.imageLibraryRel).length,
  };
}
