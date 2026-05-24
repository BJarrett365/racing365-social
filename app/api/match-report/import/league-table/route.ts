import { NextResponse } from "next/server";
import { parseMatchReportLeagueTable } from "@/app/lib/match-report/parse-league-table";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = {
  projectId?: string;
  url?: string;
  tableView?: string;
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
    const leagueTable = await parseMatchReportLeagueTable(
      url,
      project.homeTeam,
      project.awayTeam,
      body.tableView?.trim(),
      project.competition,
    );
    const updated = await repo.importLeagueTable(projectId, leagueTable);
    return NextResponse.json({ project: updated, leagueTable });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "League table import failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
