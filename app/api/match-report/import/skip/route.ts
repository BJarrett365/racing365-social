import { NextResponse } from "next/server";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";
import type { MatchReportWorkflowStep } from "@/app/lib/match-report/types";

const repo = getMatchReportRepository();

export const dynamic = "force-dynamic";

type Body = {
  projectId?: string;
  layer?: MatchReportWorkflowStep;
  reason?: string;
};

const SKIPPABLE: MatchReportWorkflowStep[] = [
  "preview_fixture_context",
  "preview_whoscored",
  "preview_fotmob",
  "sport365",
  "league_table",
  "league_stats",
  "loop_feed",
  "whoscored",
  "manual_sources",
];

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    const layer = body.layer;
    if (!projectId || !layer) {
      return NextResponse.json({ error: "projectId and layer are required." }, { status: 400 });
    }
    if (!SKIPPABLE.includes(layer)) {
      return NextResponse.json({ error: "Layer cannot be skipped." }, { status: 400 });
    }
    const project = await repo.skipLayer(projectId, layer, body.reason?.trim() || "Skipped by user");
    return NextResponse.json({ project });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Skip failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
