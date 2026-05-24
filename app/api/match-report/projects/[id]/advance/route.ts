import { NextResponse } from "next/server";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

const repo = getMatchReportRepository();

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await repo.advanceToImportLayers(id);
    return NextResponse.json({ project });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Advance failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
