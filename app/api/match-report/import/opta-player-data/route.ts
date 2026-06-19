import { NextResponse } from "next/server";
import { importOptaApiPlayerData } from "@/app/lib/match-report/import-opta-api";
import { parseWhoScoredLiveStatistics } from "@/app/lib/match-report/parse-whoscored";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type Body = {
  projectId?: string;
  provider?: "whoscored" | "opta_api";
  url?: string;
  optaMatchId?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }
    const provider = body.provider ?? "whoscored";

    if (provider === "opta_api") {
      try {
        const data = await importOptaApiPlayerData(body.optaMatchId ?? "");
        const project = await getMatchReportRepository().importOptaPlayerData(projectId, data);
        return NextResponse.json({ project, opta: data });
      } catch {
        return NextResponse.json(
          { error: "Direct Opta API is not implemented in V1. Use WhoScored URL." },
          { status: 501 },
        );
      }
    }

    const url = body.url?.trim();
    if (!url) {
      return NextResponse.json({ error: "url is required for WhoScored provider." }, { status: 400 });
    }
    const data = await parseWhoScoredLiveStatistics(url);
    const project = await getMatchReportRepository().importOptaPlayerData(projectId, data);
    return NextResponse.json({ project, opta: data });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Opta player data import failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
