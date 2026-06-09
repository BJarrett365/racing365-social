import { NextResponse } from "next/server";
import { isMatchPreview } from "@/app/lib/match-report/content-type";
import { runMatchReportFactCheck } from "@/app/lib/match-report/fact-check";
import {
  previewFactCheckToMatchReportFactCheck,
  runPreviewFactCheck,
} from "@/app/lib/match-report/preview-fact-check";
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
      return NextResponse.json({ error: "Generate media outputs before fact-checking." }, { status: 400 });
    }

    const factCheck = isMatchPreview(project)
      ? previewFactCheckToMatchReportFactCheck(
          project,
          project.mediaOutputs,
          runPreviewFactCheck(project, project.mediaOutputs),
        )
      : runMatchReportFactCheck(project);
    const updated = await repo.setFactCheck(projectId, factCheck);
    return NextResponse.json({ project: updated, factCheck });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const message = e instanceof Error ? e.message : "Fact check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
