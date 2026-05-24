import "server-only";

import { slugifyArticleTitle } from "@/app/lib/data-studio/markdown-to-article";
import { withAppPathPrefix } from "@/app/lib/app-base-path";
import { BRAND_LABEL_BY_TARGET } from "@/app/lib/match-report/editorial-governance";
import { renderPlayerRatingsHtml } from "@/app/lib/match-report/player-ratings-html";
import type { MatchReportProject } from "@/app/lib/match-report/types";
import { newLanguageId, readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";
import { uniqueTags } from "@/app/lib/language-studio/tags";
import type { LanguageArticle, LanguageImport, LanguageTranslation } from "@/app/lib/language-studio/types";

export function matchReportBuilderSourceUrl(projectId: string): string {
  return `match-report-builder://${projectId}`;
}

export function matchReportLanguageStudioRewriteUrl(articleId: string): string {
  return withAppPathPrefix(
    `/language-studio?tab=${encodeURIComponent("Rewrite")}&articleId=${encodeURIComponent(articleId)}`,
  );
}

export function matchReportLanguageStudioTranslationsUrl(articleId: string): string {
  return withAppPathPrefix(
    `/language-studio?tab=${encodeURIComponent("Translations")}&articleId=${encodeURIComponent(articleId)}`,
  );
}

export function matchReportLanguageStudioReviewQueueUrl(): string {
  return withAppPathPrefix("/language-studio?tab=Review%20Queue");
}

export function buildMatchReportArticleHtml(project: MatchReportProject): string {
  const media = project.mediaOutputs;
  if (!media) throw new Error("Generate media outputs before sending to Language Studio.");
  const playerRatingsHtml =
    media.playerRatingsHtml ??
    (project.playerIntelligence ? renderPlayerRatingsHtml(project.playerIntelligence, project) : "");
  return [media.reportHtml, media.sixteenConclusionsHtml ?? "", playerRatingsHtml].filter(Boolean).join("\n\n");
}

function upsertMatchReportReviewTranslation(
  data: Awaited<ReturnType<typeof readLanguageStudioData>>,
  article: LanguageArticle,
  project: MatchReportProject,
  now: string,
): void {
  const existingReview = Object.values(data.translations).find(
    (translation) =>
      translation.articleId === article.id &&
      translation.translationMode === "rewrite-only" &&
      translation.status !== "approved" &&
      translation.status !== "exported",
  );
  const id = existingReview?.id ?? newLanguageId("lreview");
  const review: LanguageTranslation = {
    id,
    articleId: article.id,
    targetLanguage: article.sourceLanguage,
    providerMode: "openai",
    translationMode: "rewrite-only",
    title: article.title,
    standfirst: article.standfirst,
    body: article.body,
    socialPosts: article.socialPosts,
    seoTitle: article.seoTitle,
    metaDescription: article.metaDescription,
    tags: article.tags,
    slug: article.slug,
    status: "review_needed",
    editorNotes: [
      "Match Report Builder — ready for editorial review.",
      `${project.homeTeam} ${project.homeScore ?? "?"}-${project.awayScore ?? "?"} ${project.awayTeam}`,
      `Match ID ${project.matchId} · Project ${project.id}`,
    ].join("\n"),
    createdAt: existingReview?.createdAt ?? now,
    updatedAt: now,
  };
  data.translations[id] = review;
  article.status = "review_needed";
  article.updatedAt = now;
}

export type SyncMatchReportLanguageStudioResult = {
  articleId: string;
  importId: string;
  rewriteUrl: string;
};

export async function syncMatchReportToLanguageStudio(
  project: MatchReportProject,
  opts?: { heroImageUrl?: string; queueForReview?: boolean },
): Promise<SyncMatchReportLanguageStudioResult> {
  const media = project.mediaOutputs;
  if (!media) throw new Error("Generate media outputs before sending to Language Studio.");

  const data = await readLanguageStudioData();
  const now = new Date().toISOString();
  const sourceUrl = matchReportBuilderSourceUrl(project.id);
  const existing =
    (project.archive?.languageStudioArticleId
      ? data.articles[project.archive.languageStudioArticleId]
      : undefined) ??
    Object.values(data.articles).find((article) => article.sourceUrl === sourceUrl);

  const sourceBrand = BRAND_LABEL_BY_TARGET[project.editorial.targetBrand];
  const author = project.editorial.creatorName ?? "Match Report Builder";
  const articleId = existing?.id ?? project.archive?.languageStudioArticleId ?? newLanguageId("larticle");
  const importId = existing?.importId ?? project.archive?.languageStudioImportId ?? newLanguageId("limport");
  const html = buildMatchReportArticleHtml(project);
  const slug = slugifyArticleTitle(media.headline) || articleId;
  const heroImageUrl = opts?.heroImageUrl?.trim() || project.imageIntelligence?.hero?.url;

  const article: LanguageArticle = {
    id: articleId,
    importId,
    sourceBrand,
    sourceLanguage: "en",
    sourceUrl,
    canonicalUrl: sourceUrl,
    sourceArticleId: `match-report-${project.matchId}-${project.id}`,
    title: media.headline,
    standfirst: media.standfirst,
    body: html,
    author,
    sport: "Football",
    category: "Match report",
    tags: uniqueTags([
      "match-report-builder",
      `match-${project.matchId}`,
      `sport-${project.sportId}`,
      `project-${project.id}`,
      project.competition?.includes("Premier League") ? "Premier League" : "",
    ]),
    imageUrl: heroImageUrl,
    seoTitle: media.headline.slice(0, 120),
    metaDescription: media.standfirst.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180)
      || media.headline.slice(0, 180),
    slug,
    status: opts?.queueForReview ? "review_needed" : "imported",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const imp: LanguageImport = {
    id: importId,
    sourceBrand,
    sourceLanguage: "en",
    sourceUrl,
    title: `Match Report Builder · ${media.headline}`,
    articleIds: [articleId],
    createdAt: data.imports[importId]?.createdAt ?? now,
  };

  data.articles[articleId] = article;
  data.imports[importId] = imp;
  if (opts?.queueForReview) {
    upsertMatchReportReviewTranslation(data, article, project, now);
  }
  await writeLanguageStudioData(data);

  return {
    articleId,
    importId,
    rewriteUrl: matchReportLanguageStudioRewriteUrl(articleId),
  };
}
