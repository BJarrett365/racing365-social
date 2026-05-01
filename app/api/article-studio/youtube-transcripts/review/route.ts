import { NextResponse } from "next/server";
import {
  newLanguageId,
  readLanguageStudioData,
  writeLanguageStudioData,
} from "@/app/lib/language-studio/store";
import type { LanguageArticle, LanguageSocialPost, LanguageTranslation } from "@/app/lib/language-studio/types";
import { listYouTubeScriptImports } from "@/app/lib/youtube-script/storage";
import type { YouTubeScriptImport } from "@/app/lib/youtube-script/types";

type Body = {
  importIds?: string[];
};

const socialPlatforms: LanguageSocialPost["platform"][] = [
  "appAlerts",
  "facebook",
  "x",
  "instagram",
  "youtube",
  "tiktok",
  "whatsapp",
  "telegram",
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "youtube-article";
}

function excerpt(value: string, max = 220): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trim()}...` : clean;
}

function metaDescriptionFrom(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 155);
}

function articleBody(row: YouTubeScriptImport): string {
  const articleOutput = row.outputs.find((output) => output.type === "article");
  const sourceBlock = [
    "## Original YouTube script source",
    "",
    row.transcript.fullText.trim(),
  ].join("\n");
  if (!articleOutput?.content.trim()) return sourceBlock;
  return [
    sourceBlock,
    "",
    "## Generated article",
    "",
    articleOutput.content.trim(),
  ].join("\n");
}

function socialPostsFor(row: YouTubeScriptImport): LanguageSocialPost[] {
  const socialOutput = row.outputs.find((output) => output.type === "social_captions")?.content;
  const articleOutput = row.outputs.find((output) => output.type === "article")?.content;
  const base = excerpt(socialOutput || articleOutput || row.transcript.fullText, 240);
  return socialPlatforms.map((platform) => ({
    platform,
    headline: row.meta.title,
    text: `${base}\n\nSource: ${row.meta.url}`,
    hashtags: row.meta.channelName?.includes("Leeds United") ? ["LeedsUnited", "LUFC"] : ["YouTube"],
    callToAction: "Watch the source clip and review the article in Plexa Studio.",
  }));
}

function ensureArticle(data: Awaited<ReturnType<typeof readLanguageStudioData>>, row: YouTubeScriptImport, now: string): LanguageArticle {
  const sourceArticleId = `youtube-${row.meta.videoId}`;
  const existing = Object.values(data.articles).find((article) =>
    article.sourceArticleId === sourceArticleId || article.sourceUrl === row.meta.url,
  );
  const sourceBrand = row.meta.channelName?.trim() || "YouTube";
  const title = `${row.meta.title} - ${sourceBrand}`;
  const tags = [
    "YouTube",
    "Transcript",
    sourceBrand.includes("Leeds United") ? "Leeds United" : "",
    sourceBrand.includes("Leeds United") || /football|leeds/i.test(`${row.meta.title} ${sourceBrand}`) ? "Football" : "",
  ].filter(Boolean);
  const article: LanguageArticle = {
    id: existing?.id ?? newLanguageId("larticle"),
    importId: existing?.importId ?? newLanguageId("limport"),
    sourceBrand,
    sourceLanguage: "en",
    sourceUrl: row.meta.url,
    canonicalUrl: row.meta.url,
    sourceArticleId,
    author: sourceBrand,
    publishDate: row.meta.publishedAt,
    category: tags.includes("Football") ? "Football" : "YouTube",
    tags,
    imageUrl: row.meta.thumbnailUrl,
    title,
    standfirst: `YouTube transcript imported from ${sourceBrand} for Article Studio review.`,
    body: articleBody(row),
    socialPosts: socialPostsFor(row),
    seoTitle: title,
    metaDescription: metaDescriptionFrom(row.transcript.fullText),
    slug: slugify(title),
    status: "review_needed",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  data.imports[article.importId] = {
    id: article.importId,
    sourceBrand,
    sourceLanguage: "en",
    sourceUrl: row.meta.url,
    title: `${sourceBrand} YouTube Script Import`,
    articleIds: [article.id],
    createdAt: data.imports[article.importId]?.createdAt ?? now,
  };
  data.articles[article.id] = article;
  return article;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const importIds = Array.isArray(body.importIds) ? body.importIds.map((id) => id.trim()).filter(Boolean) : [];
  if (importIds.length === 0) return NextResponse.json({ error: "Select at least one YouTube script." }, { status: 400 });

  const rows = await listYouTubeScriptImports();
  const selected = rows.filter((row) => importIds.includes(row.id));
  if (selected.length === 0) return NextResponse.json({ error: "Selected scripts were not found." }, { status: 404 });

  const data = await readLanguageStudioData();
  const now = new Date().toISOString();
  const reviewItems: LanguageTranslation[] = [];

  for (const row of selected) {
    const article = ensureArticle(data, row, now);
    const existingReview = Object.values(data.translations).find((translation) =>
      translation.articleId === article.id && translation.translationMode === "rewrite-only" && translation.status !== "approved",
    );
    const review: LanguageTranslation = {
      id: existingReview?.id ?? newLanguageId("lreview"),
      articleId: article.id,
      targetLanguage: article.sourceLanguage,
      providerMode: "openai",
      translationMode: "rewrite-only",
      title: article.title,
      standfirst: article.standfirst,
      body: article.body,
      socialPosts: socialPostsFor(row),
      seoTitle: article.seoTitle,
      metaDescription: article.metaDescription,
      tags: article.tags,
      slug: article.slug,
      status: "review_needed",
      editorNotes: [
        "Moved from Article Studio YouTube Transcripts.",
        `YouTube URL: ${row.meta.url}`,
        row.meta.thumbnailUrl ? `Thumbnail: ${row.meta.thumbnailUrl}` : "",
      ].filter(Boolean).join("\n"),
      createdAt: existingReview?.createdAt ?? now,
      updatedAt: now,
    };
    data.translations[review.id] = review;
    article.status = "review_needed";
    article.updatedAt = now;
    reviewItems.push(review);
  }

  await writeLanguageStudioData(data);
  return NextResponse.json({ success: true, reviewItems });
}
