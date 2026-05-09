import { NextResponse } from "next/server";
import { stripGeneratedArticleMetadataLines } from "@/app/lib/language-studio/article-pages";
import { uniqueTags } from "@/app/lib/language-studio/tags";
import { addAuditLog, readLanguageStudioData, upsertTranslation } from "@/app/lib/language-studio/store";

type Body = {
  translationId?: string;
  title?: string;
  standfirst?: string;
  body?: string;
  seoTitle?: string;
  metaDescription?: string;
  tags?: string[];
  clientIds?: string[];
  socialEmbeds?: unknown[];
  socialPosts?: unknown[];
  slug?: string;
  editorNotes?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const data = await readLanguageStudioData();
  const current = body.translationId ? data.translations[body.translationId] : undefined;
  if (!current) return NextResponse.json({ error: "Translation not found." }, { status: 404 });
  const article = data.articles[current.articleId];
  const next = {
    ...current,
    title: body.title ?? current.title,
    standfirst: body.standfirst ?? current.standfirst,
    body: article ? stripGeneratedArticleMetadataLines(body.body ?? current.body, article, body.title ?? current.title) : body.body ?? current.body,
    seoTitle: body.seoTitle ?? current.seoTitle,
    metaDescription: body.metaDescription ?? current.metaDescription,
    tags: Array.isArray(body.tags) ? uniqueTags(body.tags.map(String)) : uniqueTags(current.tags),
    clientIds: Array.isArray(body.clientIds) ? body.clientIds.map(String).filter(Boolean) : current.clientIds,
    socialEmbeds: Array.isArray(body.socialEmbeds) ? body.socialEmbeds as typeof current.socialEmbeds : current.socialEmbeds,
    socialPosts: Array.isArray(body.socialPosts) ? body.socialPosts as typeof current.socialPosts : current.socialPosts,
    slug: body.slug ?? current.slug,
    editorNotes: body.editorNotes ?? current.editorNotes,
    updatedAt: new Date().toISOString(),
  };
  await upsertTranslation(next);
  await addAuditLog({ entityType: "language_translation", entityId: next.id, action: "review_save", detail: "Editor saved changes" });
  return NextResponse.json({ success: true, translation: next });
}
