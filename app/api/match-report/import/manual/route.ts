import { NextResponse } from "next/server";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";
import type { ManualSource, ManualSourceConfidence, ManualSourceType } from "@/app/lib/match-report/types";

export const dynamic = "force-dynamic";

type Body = {
  projectId?: string;
  source?: ManualSource["source"];
  type?: ManualSourceType;
  confidence?: ManualSourceConfidence;
  title?: string;
  url?: string;
  excerpt?: string;
  complete?: boolean;
  syncFromLoopFeed?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }
    const repo = getMatchReportRepository();
    if (body.syncFromLoopFeed) {
      const project = await repo.syncManualSourcesFromLoopFeed(projectId);
      return NextResponse.json({ project });
    }
    if (body.complete) {
      const project = await repo.completeManualStep(projectId);
      return NextResponse.json({ project });
    }
    const excerpt = body.excerpt?.trim();
    if (!excerpt) {
      return NextResponse.json({ error: "excerpt is required unless complete=true." }, { status: 400 });
    }
    const project = await repo.importManualSource(projectId, {
      source: body.source ?? "Notes",
      type: body.type ?? "Other",
      confidence: body.confidence ?? "Medium",
      title: body.title?.trim(),
      url: body.url?.trim(),
      excerpt,
    });
    return NextResponse.json({ project });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Manual import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
