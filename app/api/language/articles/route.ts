import { NextResponse } from "next/server";
import { cleanupStaleUnusedLanguageImports, deleteLanguageArticles, readLanguageStudioData, sortDesc } from "@/app/lib/language-studio/store";
import type { LanguageArticle } from "@/app/lib/language-studio/types";

function sortArticlesLatest(rows: LanguageArticle[]): LanguageArticle[] {
  return [...rows].sort((a, b) => {
    const aTime = Date.parse(a.publishDate || a.createdAt || a.updatedAt || "");
    const bTime = Date.parse(b.publishDate || b.createdAt || b.updatedAt || "");
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return bTime - aTime;
    return String(b.updatedAt ?? b.createdAt ?? "").localeCompare(String(a.updatedAt ?? a.createdAt ?? ""));
  });
}

export async function GET() {
  await cleanupStaleUnusedLanguageImports(48);
  const data = await readLanguageStudioData();
  return NextResponse.json({
    imports: sortDesc(Object.values(data.imports)),
    articles: sortArticlesLatest(Object.values(data.articles)),
  });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { articleIds?: string[] } | null;
  const articleIds = Array.isArray(body?.articleIds) ? body.articleIds : [];
  if (articleIds.length === 0) return NextResponse.json({ error: "Select at least one article to delete." }, { status: 400 });
  const result = await deleteLanguageArticles(articleIds);
  return NextResponse.json({ success: true, ...result });
}
