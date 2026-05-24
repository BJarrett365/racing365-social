import { NextResponse } from "next/server";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

const repo = getMatchReportRepository();

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

type Body = {
  phase?: "import" | "generation";
};

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch {
      /* empty body ok */
    }
    const project =
      body.phase === "generation" ? await repo.retreatGenerationStep(id) : await repo.retreatImportStep(id);
    return NextResponse.json({ project });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Retreat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
