import { NextResponse } from "next/server";
import { exportJson, exportXml } from "@/app/lib/language-studio/language-engine";
import { copyLanguageArticleImageForExport } from "@/app/lib/language-studio/library-images";
import { addAuditLog, newLanguageId, readLanguageStudioData, upsertExport } from "@/app/lib/language-studio/store";
import type { LanguageExport } from "@/app/lib/language-studio/types";

type Body = { translationId?: string; format?: "xml" | "json" };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const data = await readLanguageStudioData();
  const translation = body.translationId ? data.translations[body.translationId] : undefined;
  if (!translation) return NextResponse.json({ error: "Translation not found." }, { status: 404 });
  if (translation.status !== "approved") return NextResponse.json({ error: "Only approved translations can be exported." }, { status: 400 });
  const article = data.articles[translation.articleId];
  if (!article) return NextResponse.json({ error: "Source article not found." }, { status: 404 });
  const format = body.format ?? "xml";
  const translatedImageLibraryRel = await copyLanguageArticleImageForExport(article, translation);
  const payload = format === "json"
    ? exportJson(article, translation, { imageLibraryRel: translatedImageLibraryRel })
    : exportXml(article, translation, { imageLibraryRel: translatedImageLibraryRel });
  const row: LanguageExport = {
    id: newLanguageId("lexport"),
    translationId: translation.id,
    articleId: article.id,
    targetLanguage: translation.targetLanguage,
    format,
    payload,
    createdAt: new Date().toISOString(),
  };
  await upsertExport(row);
  await addAuditLog({
    entityType: "language_export",
    entityId: row.id,
    action: `export_${format}`,
    detail: translatedImageLibraryRel
      ? `${translation.id}; translated image saved as ${translatedImageLibraryRel}`
      : translation.id,
  });
  return NextResponse.json({ success: true, export: row });
}
