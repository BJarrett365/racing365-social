import { NextResponse } from "next/server";
import {
  createMatchReportJobAny,
  failMatchReportJobAny,
  getMatchReportJobAny,
  newMatchReportJobId,
} from "@/app/lib/match-report/jobs";
import { runMatchReportPlayerIntelligenceJob } from "@/app/lib/match-report/player-intelligence-runner";
import { getMatchReportRepository } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

const repo = getMatchReportRepository();

type Body = { projectId?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    if (!(await repo.getProject(projectId))) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const jobId = newMatchReportJobId("player_intelligence");
    await createMatchReportJobAny(jobId, "player_intelligence", projectId);

    try {
      await runMatchReportPlayerIntelligenceJob(projectId, jobId);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Player intelligence failed";
      await failMatchReportJobAny(jobId, message);
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const project = await repo.getProject(projectId);
    if (!project?.playerIntelligence?.ratings.length) {
      return NextResponse.json({ error: "Player intelligence finished without ratings." }, { status: 422 });
    }

    return NextResponse.json({
      async: false,
      project,
      job: await getMatchReportJobAny(jobId),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Player intelligence failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
