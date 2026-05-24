import { NextResponse } from "next/server";
import {
  ensureFreshWorldCupStandings,
  fetchFreshLeagueTableForProject,
  shouldKeepWorldCupStandingsFresh,
} from "@/app/lib/match-report/refresh-live-standings";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = { projectId?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }
    const repo = getMatchReportRepository();
    const project = await repo.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    if (!shouldKeepWorldCupStandingsFresh(project) && !project.layers.leagueTable) {
      return NextResponse.json({ error: "No standings layer to refresh for this project." }, { status: 400 });
    }

    const updated = shouldKeepWorldCupStandingsFresh(project)
      ? await ensureFreshWorldCupStandings(repo, project)
      : await repo.updateLeagueTable(project.id, await fetchFreshLeagueTableForProject(project));

    return NextResponse.json({
      project: updated,
      leagueTable: updated.layers.leagueTable,
      refreshedAt: updated.layers.leagueTable?.importedAt,
    });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Standings refresh failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
