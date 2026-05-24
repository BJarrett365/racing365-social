import { NextResponse } from "next/server";
import { parseMatchReportLeagueSeasonStats } from "@/app/lib/match-report/parse-sport365-league-stats";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  projectId?: string;
  url?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    const url = body.url?.trim();
    if (!projectId || !url) {
      return NextResponse.json({ error: "projectId and url are required." }, { status: 400 });
    }
    const repo = getMatchReportRepository();
    const project = await repo.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    const leagueSeasonStats = await parseMatchReportLeagueSeasonStats({
      sourceUrl: url,
      homeTeam: project.homeTeam,
      awayTeam: project.awayTeam,
      matchEvents: project.layers.sixLogic?.events ?? [],
    });
    const updated = await repo.importLeagueSeasonStats(projectId, leagueSeasonStats);
    return NextResponse.json({ project: updated, leagueSeasonStats });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "League season stats import failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
