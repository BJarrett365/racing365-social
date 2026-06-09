import { NextResponse } from "next/server";
import { runMatchReportFactCheck } from "@/app/lib/match-report/fact-check";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const repo = getMatchReportRepository();
    const project = await repo.getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (!project.mediaOutputs) {
      return NextResponse.json({ error: "Generate media outputs before fact-checking." }, { status: 400 });
    }

    const factCheck = runMatchReportFactCheck(project);
    const updated = await repo.setFactCheck(id, factCheck);
    return NextResponse.json({ project: updated, factCheck });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const message = e instanceof Error ? e.message : "Fact check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
