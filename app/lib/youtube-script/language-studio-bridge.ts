import "server-only";

import {
  newLanguageId,
  readLanguageStudioData,
  writeLanguageStudioData,
} from "@/app/lib/language-studio/store";
import type { LanguageArticle, LanguageImport, LanguageTranslation } from "@/app/lib/language-studio/types";
import type {
  TranscriptResult,
  YouTubeGeneratedOutput,
  YouTubeVideoMeta,
} from "@/app/lib/youtube-script/types";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "youtube-article";
}

function plainText(input: string): string {
  return input
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .trim();
}

function splitGeneratedArticle(content: string, meta: YouTubeVideoMeta): { title: string; standfirst: string; body: string } {
  const rows = content.replace(/\r/g, "").split("\n").map((row) => row.trim()).filter(Boolean);
  const fallbackTitle = `${meta.title} - ${meta.channelName ?? "YouTube"}`;
  const heading = rows.find((row) => /^#{1,2}\s+/.test(row));
  const title = plainText(heading ?? rows.find((row) => !/^standfirst:/i.test(row)) ?? fallbackTitle);
  const standfirstRow = rows.find((row) => /^standfirst:/i.test(row));
  const standfirst = plainText(
    standfirstRow?.replace(/^standfirst:\s*/i, "")
      ?? rows.find((row) => row !== heading && row !== title && row.split(/\s+/).length > 8)
      ?? `Article generated from ${meta.channelName ?? "the YouTube channel"} transcript.`,
  );
  const body = content
    .replace(heading ?? "", "")
    .replace(standfirstRow ?? "", "")
    .trim();
  return {
    title: title || fallbackTitle,
    standfirst,
    body: body || content.trim(),
  };
}

function metaDescriptionFrom(standfirst: string, body: string): string {
  return plainText(standfirst || body).replace(/\s+/g, " ").slice(0, 155);
}

function articleBodyWithSource(transcript: TranscriptResult, generatedBody?: string, summary?: string): string {
  const blocks = [
    "## Original YouTube script source",
    "",
    transcript.fullText.trim(),
  ];
  if (summary?.trim()) {
    blocks.push("", "## AI summary", "", summary.trim());
  }
  if (generatedBody?.trim()) {
    blocks.push("", "## Generated article", "", generatedBody.trim());
  }
  return blocks.join("\n");
}

function upsertYouTubeReviewQueueTranslation(
  data: Awaited<ReturnType<typeof readLanguageStudioData>>,
  article: LanguageArticle,
  meta: YouTubeVideoMeta,
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
      "Imported from Planet Sport Studio YouTube Transcript Generator.",
      `YouTube URL: ${meta.url}`,
      meta.thumbnailUrl ? `Thumbnail: ${meta.thumbnailUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    createdAt: existingReview?.createdAt ?? now,
    updatedAt: now,
  };
  data.translations[id] = review;
  article.status = "review_needed";
  article.updatedAt = now;
}

export type CreateYouTubeLanguageArticleOptions = {
  output?: YouTubeGeneratedOutput;
  summary?: string;
  /** When true, article stays on Rewrite pipeline (imported). When false, also queues Review Queue translation. */
  forRewrite?: boolean;
  editorNotes?: string;
};

export async function createLanguageArticleFromYouTubeTranscript(
  meta: YouTubeVideoMeta,
  transcript: TranscriptResult,
  options: CreateYouTubeLanguageArticleOptions = {},
): Promise<LanguageArticle> {
  const data = await readLanguageStudioData();
  const now = new Date().toISOString();
  const sourceArticleId = `youtube-${meta.videoId}`;
  const existing = Object.values(data.articles).find((article) =>
    article.sourceArticleId === sourceArticleId || article.sourceUrl === meta.url,
  );
  const sourceBrand = meta.channelName?.trim() || "YouTube";
  const articleParts = options.output?.type === "article"
    ? splitGeneratedArticle(options.output.content, meta)
    : {
        title: `${meta.title} - ${sourceBrand}`,
        standfirst:
          options.summary?.trim().split("\n").find((line) => line.trim())?.slice(0, 220)
          ?? `YouTube transcript imported from ${sourceBrand} for rewrite and translation workflows.`,
        body: "",
      };
  const articleId = existing?.id ?? newLanguageId("larticle");
  const importId = existing?.importId ?? newLanguageId("limport");
  const tags = [
    "YouTube",
    "Transcript",
    sourceBrand.includes("Leeds United") ? "Leeds United" : "",
    sourceBrand.includes("Leeds United") || /football|leeds/i.test(`${meta.title} ${sourceBrand}`) ? "Football" : "",
  ].filter(Boolean);
  const publishDate =
    typeof meta.publishedAt === "string" && meta.publishedAt.trim() && !Number.isNaN(Date.parse(meta.publishedAt.trim()))
      ? meta.publishedAt.trim()
      : now;

  const article: LanguageArticle = {
    id: articleId,
    importId,
    sourceBrand,
    sourceLanguage: "en",
    sourceUrl: meta.url,
    canonicalUrl: meta.url,
    sourceArticleId,
    author: sourceBrand,
    publishDate,
    category: tags.includes("Football") ? "Football" : "YouTube",
    tags,
    imageUrl: meta.thumbnailUrl,
    title: articleParts.title,
    standfirst: articleParts.standfirst,
    body: articleBodyWithSource(
      transcript,
      options.output?.type === "article" ? articleParts.body : undefined,
      options.summary,
    ),
    seoTitle: articleParts.title,
    metaDescription: metaDescriptionFrom(articleParts.standfirst, articleParts.body),
    slug: slugify(articleParts.title),
    status: "imported",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const languageImport: LanguageImport = {
    id: importId,
    sourceBrand,
    sourceLanguage: "en",
    sourceUrl: meta.url,
    title: `${sourceBrand} YouTube Script Import`,
    articleIds: [article.id],
    createdAt: data.imports[importId]?.createdAt ?? now,
  };
  data.imports[importId] = languageImport;
  data.articles[article.id] = article;
  if (!options.forRewrite) {
    upsertYouTubeReviewQueueTranslation(data, article, meta, now);
  }
  await writeLanguageStudioData(data);
  return article;
}
