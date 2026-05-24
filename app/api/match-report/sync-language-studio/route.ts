import { NextResponse } from "next/server";
import { syncMatchReportToLanguageStudio } from "@/app/lib/match-report/language-studio-bridge";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";

type Body = { projectId?: string; queueForReview?: boolean };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });

    const repo = getMatchReportRepository();
    const project = await repo.getProject(projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (!project.mediaOutputs) {
      return NextResponse.json({ error: "Generate media outputs before sending to Language Studio." }, { status: 400 });
    }

    const synced = await syncMatchReportToLanguageStudio(project, {
      queueForReview: body.queueForReview,
    });
    const updated = await repo.attachLanguageStudioArticle(projectId, {
      articleId: synced.articleId,
      importId: synced.importId,
      rewriteUrl: synced.rewriteUrl,
    });

    return NextResponse.json({
      ok: true,
      articleId: synced.articleId,
      rewriteUrl: synced.rewriteUrl,
      project: updated,
    });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Language Studio sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
