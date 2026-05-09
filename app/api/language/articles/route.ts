import { NextResponse } from "next/server";
import {
  cleanupStaleUnusedLanguageImports,
  deleteLanguageArticles,
  readLanguageStudioData,
  reopenLanguageArticleForPipeline,
  sortDesc,
  updateLanguageArticleFields,
} from "@/app/lib/language-studio/store";
import { uniqueTags } from "@/app/lib/language-studio/tags";
import { LANGUAGE_SPORT_CONTEXTS, type LanguageArticle, type LanguageSportContext } from "@/app/lib/language-studio/types";

function sortArticlesLatest(rows: LanguageArticle[]): LanguageArticle[] {
  return [...rows].sort((a, b) => {
    const aTime = Date.parse(a.publishDate || a.createdAt || a.updatedAt || "");
    const bTime = Date.parse(b.publishDate || b.createdAt || b.updatedAt || "");
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return bTime - aTime;
    return String(b.updatedAt ?? b.createdAt ?? "").localeCompare(String(a.updatedAt ?? a.createdAt ?? ""));
  });
}

export async function GET() {
  await cleanupStaleUnusedLanguageImports(24);
  const data = await readLanguageStudioData();
  return NextResponse.json({
    imports: sortDesc(Object.values(data.imports)),
    articles: sortArticlesLatest(Object.values(data.articles)),
  });
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as { articleId?: string; sport?: unknown; tags?: unknown } | null;
  const articleId = typeof body?.articleId === "string" ? body.articleId.trim() : "";
  if (!articleId) return NextResponse.json({ error: "articleId is required." }, { status: 400 });

  const hasSport = Boolean(body && Object.prototype.hasOwnProperty.call(body, "sport"));
  const hasTags = Boolean(body && Object.prototype.hasOwnProperty.call(body, "tags"));

  if (hasSport || hasTags) {
    const fields: { sport?: LanguageSportContext | undefined; tags?: string[] } = {};
    if (hasSport) {
      const raw = body!.sport;
      if (raw === null || raw === "") {
        fields.sport = undefined;
      } else if (typeof raw === "string" && LANGUAGE_SPORT_CONTEXTS.includes(raw as LanguageSportContext)) {
        fields.sport = raw as LanguageSportContext;
      } else {
        return NextResponse.json({ error: "Invalid sport value." }, { status: 400 });
      }
    }
    if (hasTags) {
      if (!Array.isArray(body!.tags)) return NextResponse.json({ error: "tags must be an array of strings." }, { status: 400 });
      fields.tags = uniqueTags(body!.tags.map((item) => String(item)));
    }
    const article = await updateLanguageArticleFields(articleId, fields);
    if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json({ success: true, article });
  }

  const article = await reopenLanguageArticleForPipeline(articleId);
  if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
  return NextResponse.json({ success: true, article });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { articleIds?: string[] } | null;
  const articleIds = Array.isArray(body?.articleIds) ? body.articleIds : [];
  if (articleIds.length === 0) return NextResponse.json({ error: "Select at least one article to delete." }, { status: 400 });
  const result = await deleteLanguageArticles(articleIds);
  return NextResponse.json({ success: true, ...result });
}
