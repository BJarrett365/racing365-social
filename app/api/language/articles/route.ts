import { NextResponse } from "next/server";
import { readLanguageStudioData, sortDesc } from "@/app/lib/language-studio/store";
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
  const data = await readLanguageStudioData();
  return NextResponse.json({
    imports: sortDesc(Object.values(data.imports)),
    articles: sortArticlesLatest(Object.values(data.articles)),
  });
}
