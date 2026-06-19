import { NextResponse } from "next/server";
import { runEditorialReview } from "@/app/lib/match-report/run-editorial-review";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";

type Body = {
  projectId?: string;
  includeDeepSeek?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });

    const repo = getMatchReportRepository();
    const project = await repo.getProject(projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const editorial = await runEditorialReview(project, {
      includeDeepSeek: body.includeDeepSeek !== false,
    });
    const updated = await repo.setEditorialReview(projectId, {
      editorialScore: editorial.editorialScore,
      sectionLint: editorial.sectionLint,
      publishGate: editorial.publishGate,
      deepseekReview: editorial.deepseekReview,
    });

    return NextResponse.json({
      project: updated,
      editorialReview: editorial,
      deepseekError: editorial.deepseekError,
    });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Editorial review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
