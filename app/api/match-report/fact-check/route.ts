import { NextResponse } from "next/server";
import { persistFactCheckAndEditorialReview } from "@/app/lib/match-report/run-project-fact-check";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

type Body = { projectId?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });

    const repo = getMatchReportRepository();
    const { project, factCheck, editorialReview, deepseekError } = await persistFactCheckAndEditorialReview(
      repo,
      projectId,
    );

    return NextResponse.json({
      project,
      factCheck,
      editorialReview,
      deepseekError,
    });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const message = e instanceof Error ? e.message : "Fact check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
