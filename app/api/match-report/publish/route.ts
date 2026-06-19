import { NextResponse } from "next/server";
import { withAppPathPrefix } from "@/app/lib/app-base-path";
import { syncMatchReportToLanguageStudio } from "@/app/lib/match-report/language-studio-bridge";
import type { EditorOverrideReason } from "@/app/lib/match-report/mio/types";
import { evaluateEditorialPublishGate } from "@/app/lib/match-report/preview-publish-gate";
import { getProjectEditorialScore } from "@/app/lib/match-report/run-editorial-review";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";
import { validateMatchReportPublish } from "@/app/lib/match-report/validate-publish";

export const dynamic = "force-dynamic";

const OVERRIDE_REASONS: EditorOverrideReason[] = [
  "breaking_news",
  "time_sensitive",
  "editorial_decision",
  "score_incorrect",
  "other",
];

type Body = {
  projectId?: string;
  editorOverride?: {
    reason?: EditorOverrideReason;
    detail?: string;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    const repo = getMatchReportRepository();
    let project = await repo.getProject(projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const editorialScore = getProjectEditorialScore(project);
    const gate = project.editorialPublishGate ?? evaluateEditorialPublishGate(project, editorialScore);
    const overrideInput = body.editorOverride;
    const pendingOverride =
      overrideInput?.reason && OVERRIDE_REASONS.includes(overrideInput.reason)
        ? {
            reason: overrideInput.reason,
            detail: overrideInput.detail?.trim() || undefined,
            scoreAtOverride: editorialScore?.overall ?? 0,
            gateStatusAtOverride: gate.status,
            overriddenAt: new Date().toISOString(),
          }
        : null;

    const validation = validateMatchReportPublish(project, pendingOverride);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: validation.error,
          publishGate: validation.gate,
          requiresEditorOverride: validation.gate?.requiresEditorOverride ?? false,
        },
        { status: 400 },
      );
    }

    if (pendingOverride && !validation.gate.canPublishWithoutOverride) {
      project = await repo.recordEditorialPublishOverride(projectId, pendingOverride);
    }

    const heroImageUrl = project.imageIntelligence?.hero?.url;
    if (!heroImageUrl) {
      return NextResponse.json({ error: "Hero image is required before publish." }, { status: 400 });
    }

    const synced = await syncMatchReportToLanguageStudio(project, {
      heroImageUrl,
      queueForReview: true,
    });
    const now = new Date().toISOString();
    await repo.markPublished(projectId, {
      languageStudioArticleId: synced.articleId,
      languageStudioImportId: synced.importId,
      languageStudioUrl: synced.rewriteUrl,
      publishedArticleId: synced.articleId,
      publishedImportId: synced.importId,
      publishedAt: now,
    });

    const updated = await repo.getProject(projectId);
    const reviewUrl = withAppPathPrefix("/language-studio?tab=Review%20Queue");

    return NextResponse.json({
      ok: true,
      articleId: synced.articleId,
      importId: synced.importId,
      rewriteUrl: synced.rewriteUrl,
      reviewUrl,
      project: updated,
    });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    const message = e instanceof Error ? e.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
