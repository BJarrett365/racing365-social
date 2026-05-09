import { NextResponse } from "next/server";
import { stripGeneratedArticleMetadataLines } from "@/app/lib/language-studio/article-pages";
import { fixQualityIssues } from "@/app/lib/language-studio/language-engine";
import {
  applyStoredQualityDecisions,
  LANGUAGE_QUALITY_ISSUE_TYPES,
  runLanguageQualityChecks,
  sanitizeIgnoredQualityIssueTypes,
} from "@/app/lib/language-studio/quality-checks";
import { newLanguageId, readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";
import type { LanguageKnowledgeFile, LanguageTranslation } from "@/app/lib/language-studio/types";

type Body = {
  checkId?: string;
  issueId?: string;
  issueIds?: string[];
  issueType?: string;
  action?:
    | "ignore"
    | "ignore-all"
    | "escalate"
    | "escalate-all"
    | "apply-fix"
    | "restore-issue-type"
    | "clear-all-suppressed-issue-types";
  preview?: boolean;
  proposedTranslation?: Partial<LanguageTranslation>;
  fixSummary?: string;
  learnedRule?: string;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const translationId = url.searchParams.get("translationId") ?? "";
    const data = await readLanguageStudioData();
    const translation = data.translations[translationId];
    if (!translation) return NextResponse.json({ error: "Translation not found." }, { status: 404 });
    const article = data.articles[translation.articleId];
    if (!article) return NextResponse.json({ error: "Source article not found." }, { status: 404 });
    const existingChecks = Object.values(data.qualityChecks).filter((row) => row.translationId === translationId);
    const latest = existingChecks.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    const suppressed = sanitizeIgnoredQualityIssueTypes(data.ignoredQualityIssueTypes);
    const freshCheck = runLanguageQualityChecks(article, translation, Object.values(data.protectedTerms), suppressed);
    const check = applyStoredQualityDecisions(
      {
        ...freshCheck,
        id: latest?.id ?? freshCheck.id,
        createdAt: latest?.createdAt ?? freshCheck.createdAt,
      },
      existingChecks,
    );
    data.qualityChecks[check.id] = check;
    await writeLanguageStudioData(data);
    return NextResponse.json({ qualityCheck: check, ignoredQualityIssueTypes: sanitizeIgnoredQualityIssueTypes(data.ignoredQualityIssueTypes) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Quality check failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body?.action) return NextResponse.json({ error: "action is required." }, { status: 400 });

    if (body.action === "clear-all-suppressed-issue-types") {
      const data = await readLanguageStudioData();
      data.ignoredQualityIssueTypes = [];
      await writeLanguageStudioData(data);
      return NextResponse.json({ success: true, ignoredQualityIssueTypes: data.ignoredQualityIssueTypes });
    }

    if (body.action === "restore-issue-type") {
      const raw = typeof body.issueType === "string" ? body.issueType.trim() : "";
      if (!raw) return NextResponse.json({ error: "issueType is required." }, { status: 400 });
      const validated = sanitizeIgnoredQualityIssueTypes([raw]);
      if (validated.length !== 1) return NextResponse.json({ error: "Unknown or invalid issueType." }, { status: 400 });
      const toRemove = validated[0];
      const data = await readLanguageStudioData();
      const next = sanitizeIgnoredQualityIssueTypes(data.ignoredQualityIssueTypes).filter((t) => t !== toRemove);
      data.ignoredQualityIssueTypes = next;
      await writeLanguageStudioData(data);
      return NextResponse.json({ success: true, ignoredQualityIssueTypes: data.ignoredQualityIssueTypes });
    }

    if (!body.checkId || (!["ignore-all", "escalate-all", "apply-fix"].includes(body.action) && !body.issueId)) {
      return NextResponse.json({ error: "checkId, issueId and action are required." }, { status: 400 });
    }
    const data = await readLanguageStudioData();
    const check = data.qualityChecks[body.checkId];
    if (!check) return NextResponse.json({ error: "Quality check not found." }, { status: 404 });
    const suppressedTypes = sanitizeIgnoredQualityIssueTypes(data.ignoredQualityIssueTypes);
    if (body.action === "apply-fix") {
      const translation = data.translations[check.translationId];
      const article = data.articles[check.articleId];
      if (!translation || !article) return NextResponse.json({ error: "Translation or source article not found." }, { status: 404 });
      if (!body.proposedTranslation) return NextResponse.json({ error: "No proposed fix was supplied." }, { status: 400 });
      const now = new Date().toISOString();
      const nextTranslation: LanguageTranslation = {
        ...translation,
        title: String(body.proposedTranslation.title ?? translation.title),
        standfirst: String(body.proposedTranslation.standfirst ?? translation.standfirst),
        body: stripGeneratedArticleMetadataLines(String(body.proposedTranslation.body ?? translation.body), article, String(body.proposedTranslation.title ?? translation.title)),
        seoTitle: String(body.proposedTranslation.seoTitle ?? translation.seoTitle),
        metaDescription: String(body.proposedTranslation.metaDescription ?? translation.metaDescription),
        tags: Array.isArray(body.proposedTranslation.tags) ? body.proposedTranslation.tags.map(String).filter(Boolean) : translation.tags,
        slug: String(body.proposedTranslation.slug ?? translation.slug),
        socialEmbeds: Array.isArray(body.proposedTranslation.socialEmbeds) ? body.proposedTranslation.socialEmbeds as LanguageTranslation["socialEmbeds"] : translation.socialEmbeds,
        socialPosts: Array.isArray(body.proposedTranslation.socialPosts) ? body.proposedTranslation.socialPosts as LanguageTranslation["socialPosts"] : translation.socialPosts,
        warnings: Array.isArray(body.proposedTranslation.warnings) ? body.proposedTranslation.warnings.map(String).filter(Boolean) : translation.warnings,
        confidenceScore: typeof body.proposedTranslation.confidenceScore === "number" ? body.proposedTranslation.confidenceScore : translation.confidenceScore,
        guardrailFlags: Array.isArray(body.proposedTranslation.guardrailFlags) ? body.proposedTranslation.guardrailFlags.map(String).filter(Boolean) : translation.guardrailFlags,
        editorNotes: [translation.editorNotes, `AI quality fix: ${body.fixSummary || "AI fix applied after review."}`].filter(Boolean).join("\n"),
        updatedAt: now,
      };
      data.translations[nextTranslation.id] = nextTranslation;
      const storedArticle = data.articles[nextTranslation.articleId];
      if (storedArticle) {
        storedArticle.status = nextTranslation.status === "approved" ? "approved" : "review_needed";
        storedArticle.updatedAt = now;
      }
      const nextCheck = {
        ...runLanguageQualityChecks(article, nextTranslation, Object.values(data.protectedTerms), suppressedTypes),
        id: check.id,
        createdAt: check.createdAt,
        updatedAt: now,
      };
      data.qualityChecks[nextCheck.id] = nextCheck;
      const issueRows = body.issueIds?.length ? check.issues.filter((issue) => body.issueIds?.includes(issue.id)) : check.issues.filter((issue) => !issue.ignored);
      const knowledge: LanguageKnowledgeFile = {
        id: newLanguageId("lknowledge"),
        title: `Quality fix: ${issueRows.map((issue) => issue.type).join(", ") || "AI review"}`,
        kind: "quality-fix",
        language: translation.targetLanguage,
        content: [
          `Source brand: ${article.sourceBrand}`,
          `Article: ${article.title}`,
          `Issue(s): ${issueRows.map((issue) => `${issue.type} - ${issue.message}`).join("; ") || "Manual AI fix review"}`,
          `Fix summary: ${body.fixSummary || "AI fix applied after review."}`,
          `Reusable rule: ${body.learnedRule || "Review similar quality issue before approval."}`,
        ].join("\n"),
        createdAt: now,
        updatedAt: now,
      };
      data.knowledgeFiles[knowledge.id] = knowledge;
      const auditId = newLanguageId("laudit");
      data.auditLogs[auditId] = {
        id: auditId,
        createdAt: now,
        entityType: "language_translation",
        entityId: translation.id,
        action: "apply_ai_quality_fix",
        detail: body.fixSummary || "",
      };
      await writeLanguageStudioData(data);
      return NextResponse.json({ success: true, qualityCheck: nextCheck, translation: nextTranslation, knowledgeFile: knowledge });
    }
    if (body.action === "escalate" || body.action === "escalate-all") {
      const translation = data.translations[check.translationId];
      const article = data.articles[check.articleId];
      if (!translation || !article) return NextResponse.json({ error: "Translation or source article not found." }, { status: 404 });
      const issuesToFix = body.action === "escalate-all"
        ? check.issues.filter((issue) => !issue.ignored)
        : check.issues.filter((issue) => issue.id === body.issueId);
      if (issuesToFix.length === 0) return NextResponse.json({ error: "No matching issue found to fix." }, { status: 404 });
      const glossary = Object.values(data.glossary).filter((entry) => entry.brand === article.sourceBrand || entry.brand === "Global");
      const fixed = await fixQualityIssues({
        article,
        translation,
        issues: issuesToFix,
        protectedTerms: Object.values(data.protectedTerms),
        glossary,
      });
      const now = new Date().toISOString();
      const nextTranslation = {
        ...translation,
        title: fixed.title,
        standfirst: fixed.standfirst,
        body: stripGeneratedArticleMetadataLines(fixed.body, article, fixed.title),
        seoTitle: fixed.seoTitle,
        metaDescription: fixed.metaDescription,
        tags: fixed.tags,
        slug: fixed.slug,
        socialEmbeds: fixed.socialEmbeds,
        socialPosts: fixed.socialPosts,
        warnings: fixed.warnings,
        confidenceScore: fixed.confidenceScore,
        guardrailFlags: fixed.guardrailFlags,
        editorNotes: [translation.editorNotes, `AI quality fix: ${fixed.fixSummary}`].filter(Boolean).join("\n"),
        updatedAt: now,
      };
      if (body.preview) {
        const previewCheck = {
          ...runLanguageQualityChecks(article, nextTranslation, Object.values(data.protectedTerms), suppressedTypes),
          id: check.id,
          createdAt: check.createdAt,
          updatedAt: now,
        };
        return NextResponse.json({
          success: true,
          preview: true,
          qualityCheck: check,
          proposedQualityCheck: previewCheck,
          proposedTranslation: nextTranslation,
          issueIds: issuesToFix.map((issue) => issue.id),
          fixSummary: fixed.fixSummary,
          learnedRule: fixed.learnedRule,
        });
      }
      data.translations[nextTranslation.id] = nextTranslation;
      const storedArticle = data.articles[nextTranslation.articleId];
      if (storedArticle) {
        storedArticle.status = nextTranslation.status === "approved" ? "approved" : "review_needed";
        storedArticle.updatedAt = now;
      }
      const freshCheck = runLanguageQualityChecks(article, nextTranslation, Object.values(data.protectedTerms), suppressedTypes);
      const nextCheck = {
        ...freshCheck,
        id: check.id,
        createdAt: check.createdAt,
        updatedAt: now,
      };
      data.qualityChecks[nextCheck.id] = nextCheck;
      const knowledge: LanguageKnowledgeFile = {
        id: newLanguageId("lknowledge"),
        title: `Quality fix: ${issuesToFix.map((issue) => issue.type).join(", ")}`,
        kind: "quality-fix",
        language: translation.targetLanguage,
        content: [
          `Source brand: ${article.sourceBrand}`,
          `Article: ${article.title}`,
          `Issue(s): ${issuesToFix.map((issue) => `${issue.type} - ${issue.message}`).join("; ")}`,
          `Fix summary: ${fixed.fixSummary}`,
          `Reusable rule: ${fixed.learnedRule}`,
        ].join("\n"),
        createdAt: now,
        updatedAt: now,
      };
      data.knowledgeFiles[knowledge.id] = knowledge;
      const auditId = newLanguageId("laudit");
      data.auditLogs[auditId] = {
        id: auditId,
        createdAt: now,
        entityType: "language_translation",
        entityId: translation.id,
        action: "ai_quality_fix",
        detail: fixed.fixSummary,
      };
      await writeLanguageStudioData(data);
      return NextResponse.json({ success: true, qualityCheck: nextCheck, translation: nextTranslation, knowledgeFile: knowledge });
    }

    if (body.action === "ignore" || body.action === "ignore-all") {
      const translation = data.translations[check.translationId];
      const article = data.articles[check.articleId];
      if (!translation || !article) return NextResponse.json({ error: "Translation or source article not found." }, { status: 404 });
      const merged = new Set(sanitizeIgnoredQualityIssueTypes(data.ignoredQualityIssueTypes));
      if (body.action === "ignore-all") {
        for (const issue of check.issues) merged.add(issue.type);
      } else {
        const target = check.issues.find((issue) => issue.id === body.issueId);
        if (!target) return NextResponse.json({ error: "Issue not found." }, { status: 404 });
        merged.add(target.type);
      }
      data.ignoredQualityIssueTypes = LANGUAGE_QUALITY_ISSUE_TYPES.filter((t) => merged.has(t));
      const suppressedNext = sanitizeIgnoredQualityIssueTypes(data.ignoredQualityIssueTypes);
      const now = new Date().toISOString();
      const previousChecks = Object.values(data.qualityChecks).filter((row) => row.translationId === check.translationId && row.id !== check.id);
      const fresh = runLanguageQualityChecks(article, translation, Object.values(data.protectedTerms), suppressedNext);
      const nextCheck = applyStoredQualityDecisions(
        { ...fresh, id: check.id, createdAt: check.createdAt, updatedAt: now },
        previousChecks,
      );
      data.qualityChecks[nextCheck.id] = nextCheck;
      await writeLanguageStudioData(data);
      return NextResponse.json({
        success: true,
        qualityCheck: nextCheck,
        ignoredQualityIssueTypes: data.ignoredQualityIssueTypes,
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Quality check update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
