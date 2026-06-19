import { NextResponse } from "next/server";
import { repairFactCheckMedia } from "@/app/lib/match-report/repair-fact-check-media";
import {
  persistFactCheckAndEditorialReview,
  runProjectFactCheck,
} from "@/app/lib/match-report/run-project-fact-check";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const repo = getMatchReportRepository();
    const project = await repo.getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (!project.mediaOutputs) {
      return NextResponse.json({ error: "Generate media outputs before repairing fact-check issues." }, { status: 400 });
    }

    const factCheck = project.factCheck ?? runProjectFactCheck(project);
    if (factCheck.issues.length === 0) {
      return NextResponse.json({ error: "No fact-check issues to repair. Run fact check first." }, { status: 400 });
    }

    const repaired = await repairFactCheckMedia(project, factCheck);
    await repo.updateMediaOutputs(id, repaired);
    const { project: updated, factCheck: repairedFactCheck, deepseekError } = await persistFactCheckAndEditorialReview(
      repo,
      id,
    );

    return NextResponse.json({
      project: updated,
      factCheck: repairedFactCheck,
      deepseekError,
    });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const message = e instanceof Error ? e.message : "Fact-check repair failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
