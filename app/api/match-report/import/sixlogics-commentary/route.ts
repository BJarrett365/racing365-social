import { NextResponse } from "next/server";
import {
  buildSixLogicMatchIntelligence,
  sixLogicCommentaryLineCount,
} from "@/app/lib/match-report/build-sixlogics-commentary";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";

type Body = { projectId?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }
    const repo = getMatchReportRepository();
    const existing = await repo.getProject(projectId);
    if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (!existing.layers.sixLogic) {
      return NextResponse.json(
        { error: "Import SixLogics match foundation first (match ID step)." },
        { status: 400 },
      );
    }

    const foundation = existing.layers.sixLogic;
    if (sixLogicCommentaryLineCount(foundation) === 0) {
      return NextResponse.json(
        { error: "No commentary or match events found in the Six Logic feed for this fixture." },
        { status: 422 },
      );
    }

    const { commentary, fixtureContext } = buildSixLogicMatchIntelligence(foundation);
    const project = await repo.importSport365(projectId, commentary, fixtureContext);
    return NextResponse.json({ project, commentary, fixtureContext });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Six Logic commentary import failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
