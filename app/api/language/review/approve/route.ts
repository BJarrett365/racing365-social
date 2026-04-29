import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/app/lib/auth/sessions";
import { runLanguageQualityChecks } from "@/app/lib/language-studio/quality-checks";
import { addAuditLog, newLanguageId, readLanguageStudioData, upsertQualityCheck, upsertTranslation, upsertTranslationMemory } from "@/app/lib/language-studio/store";

type Body = { translationId?: string; approved?: boolean; reason?: string; adminOverride?: boolean; overrideReason?: string };

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
  if (!article) return NextResponse.json({ error: "Source article not found." }, { status: 404 });
  const approved = body.approved !== false;
  const qualityCheck = runLanguageQualityChecks(article, current, Object.values(data.protectedTerms));
  const session = sessionFromRequest(req);
  if (approved && qualityCheck.score === "red" && !(body.adminOverride && session?.role === "admin" && body.overrideReason?.trim())) {
    await upsertQualityCheck(qualityCheck);
    return NextResponse.json({ error: "Approval blocked by red quality issues.", qualityCheck }, { status: 400 });
  }
  if (approved && qualityCheck.score === "red") {
    qualityCheck.overrideBy = session?.email ?? "admin";
    qualityCheck.overrideReason = body.overrideReason?.trim();
  }
  await upsertQualityCheck(qualityCheck);
  const next = {
    ...current,
    status: approved ? ("approved" as const) : ("rejected" as const),
    approvedAt: approved ? new Date().toISOString() : current.approvedAt,
    editorNotes: body.reason ?? current.editorNotes,
    updatedAt: new Date().toISOString(),
  };
  await upsertTranslation(next);
  await addAuditLog({
    entityType: "language_translation",
    entityId: next.id,
    action: approved ? "approve" : "reject",
    detail: body.adminOverride ? `Admin override: ${body.overrideReason ?? ""}` : body.reason ?? "",
  });
  if (approved) {
    await upsertTranslationMemory({
      id: newLanguageId("ltm"),
      sourceText: article.body,
      approvedTranslation: next.body,
      language: next.targetLanguage,
      brand: article.sourceBrand,
      editor: session?.email,
      dateApproved: next.approvedAt ?? new Date().toISOString(),
      usageCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return NextResponse.json({ success: true, translation: next, qualityCheck });
}
