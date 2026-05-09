import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/app/lib/auth/sessions";
import { stripGeneratedArticleMetadataLines } from "@/app/lib/language-studio/article-pages";
import { exportJson, exportXml } from "@/app/lib/language-studio/language-engine";
import { copyLanguageArticleImageForExport } from "@/app/lib/language-studio/library-images";
import { applyStoredQualityDecisions, runLanguageQualityChecks, sanitizeIgnoredQualityIssueTypes } from "@/app/lib/language-studio/quality-checks";
import { newLanguageId, readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";
import type { LanguageExport } from "@/app/lib/language-studio/types";

type Body = { translationId?: string; approved?: boolean; reason?: string; adminOverride?: boolean; overrideReason?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  try {
    const data = await readLanguageStudioData();
    const current = body.translationId ? data.translations[body.translationId] : undefined;
    if (!current) return NextResponse.json({ error: "Translation not found." }, { status: 404 });
    const article = data.articles[current.articleId];
    if (!article) return NextResponse.json({ error: "Source article not found." }, { status: 404 });
    const approved = body.approved !== false;
    const existingChecks = Object.values(data.qualityChecks).filter((row) => row.translationId === current.id);
    const latest = existingChecks.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    const suppressed = sanitizeIgnoredQualityIssueTypes(data.ignoredQualityIssueTypes);
    const freshCheck = runLanguageQualityChecks(article, current, Object.values(data.protectedTerms), suppressed);
    const qualityCheck = applyStoredQualityDecisions(
      {
        ...freshCheck,
        id: latest?.id ?? freshCheck.id,
        createdAt: latest?.createdAt ?? freshCheck.createdAt,
      },
      existingChecks,
    );
    const session = sessionFromRequest(req);
    if (approved && qualityCheck.score === "red" && !(body.adminOverride && session?.role === "admin" && body.overrideReason?.trim())) {
      data.qualityChecks[qualityCheck.id] = qualityCheck;
      await writeLanguageStudioData(data);
      return NextResponse.json({ error: "Approval blocked by red quality issues.", qualityCheck }, { status: 400 });
    }
    if (approved && qualityCheck.score === "red") {
      qualityCheck.overrideBy = session?.email ?? "admin";
      qualityCheck.overrideReason = body.overrideReason?.trim();
    }
    data.qualityChecks[qualityCheck.id] = qualityCheck;
    const now = new Date().toISOString();
    if (!approved) {
      delete data.translations[current.id];
      for (const [id, check] of Object.entries(data.qualityChecks)) {
        if (check.translationId === current.id) delete data.qualityChecks[id];
      }
      const storedArticle = data.articles[current.articleId];
      if (storedArticle) {
        storedArticle.status = "translated";
        storedArticle.updatedAt = now;
      }
      const auditId = newLanguageId("laudit");
      data.auditLogs[auditId] = {
        id: auditId,
        createdAt: now,
        entityType: "language_translation",
        entityId: current.id,
        action: "reject_delete",
        detail: body.reason ?? "",
      };
      await writeLanguageStudioData(data);
      return NextResponse.json({ success: true, deleted: true, translationId: current.id });
    }
    const next = {
      ...current,
      body: stripGeneratedArticleMetadataLines(current.body, article, current.title),
      status: "approved" as const,
      approvedAt: now,
      editorNotes: body.reason ?? current.editorNotes,
      updatedAt: now,
    };
    data.translations[next.id] = next;
    const storedArticle = data.articles[next.articleId];
    if (storedArticle) {
      storedArticle.status = next.status;
      storedArticle.updatedAt = now;
    }
    const auditId = newLanguageId("laudit");
    data.auditLogs[auditId] = {
      id: auditId,
      createdAt: now,
      entityType: "language_translation",
      entityId: next.id,
      action: "approve",
      detail: body.adminOverride ? `Admin override: ${body.overrideReason ?? ""}` : body.reason ?? "",
    };
    const memoryId = newLanguageId("ltm");
    data.translationMemory[memoryId] = {
      id: memoryId,
      sourceText: article.body,
      approvedTranslation: next.body,
      language: next.targetLanguage,
      brand: article.sourceBrand,
      editor: session?.email,
      dateApproved: next.approvedAt ?? now,
      usageCount: 1,
      createdAt: now,
      updatedAt: now,
    };
    const translatedImageLibraryRel = await copyLanguageArticleImageForExport(article, next);
    for (const format of ["xml", "json"] as const) {
      for (const [exportId, existing] of Object.entries(data.exports)) {
        if (existing.translationId === next.id && existing.format === format) delete data.exports[exportId];
      }
      const exportRow: LanguageExport = {
        id: newLanguageId("lexport"),
        translationId: next.id,
        articleId: article.id,
        targetLanguage: next.targetLanguage,
        format,
        payload: format === "json"
          ? exportJson(article, next, { imageLibraryRel: translatedImageLibraryRel })
          : exportXml(article, next, { imageLibraryRel: translatedImageLibraryRel }),
        createdAt: now,
      };
      data.exports[exportRow.id] = exportRow;
      const exportAuditId = newLanguageId("laudit");
      data.auditLogs[exportAuditId] = {
        id: exportAuditId,
        createdAt: now,
        entityType: "language_export",
        entityId: exportRow.id,
        action: `auto_export_${format}`,
        detail: translatedImageLibraryRel
          ? `${next.id}; translated image saved as ${translatedImageLibraryRel}`
          : next.id,
      };
    }
    await writeLanguageStudioData(data);
    return NextResponse.json({ success: true, translation: next, qualityCheck });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Approval failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
