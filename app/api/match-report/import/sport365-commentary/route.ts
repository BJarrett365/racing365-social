import { NextResponse } from "next/server";
import { parseSport365MatchIntelligence } from "@/app/lib/match-report/parse-sport365-match-intelligence";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";

type Body = { projectId?: string; url?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    const url = body.url?.trim();
    if (!projectId || !url) {
      return NextResponse.json({ error: "projectId and url are required." }, { status: 400 });
    }
    const repo = getMatchReportRepository();
    const existing = await repo.getProject(projectId);
    if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const { commentary, fixtureContext } = await parseSport365MatchIntelligence(
      url,
      existing.homeTeam,
      existing.awayTeam,
    );
    const project = await repo.importSport365(projectId, commentary, fixtureContext);
    return NextResponse.json({ project, commentary, fixtureContext });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Sport365 import failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
