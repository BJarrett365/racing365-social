import { NextResponse } from "next/server";
import { withAppPathPrefix } from "@/app/lib/app-base-path";
import { syncMatchReportToLanguageStudio } from "@/app/lib/match-report/language-studio-bridge";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";

type Body = { projectId?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    const repo = getMatchReportRepository();
    const project = await repo.getProject(projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (!project.mediaOutputs) {
      return NextResponse.json({ error: "Generate media outputs before publishing." }, { status: 400 });
    }
    if (!project.imageIntelligence?.hero?.url) {
      return NextResponse.json({ error: "Hero image is required before publish." }, { status: 400 });
    }

    const synced = await syncMatchReportToLanguageStudio(project, {
      heroImageUrl: project.imageIntelligence.hero.url,
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
