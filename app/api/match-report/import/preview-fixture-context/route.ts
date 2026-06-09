import { NextResponse } from "next/server";
import { buildFixtureContextFromSixLogicFoundation } from "@/app/lib/match-report/build-sixlogics-commentary";
import { isMatchPreview } from "@/app/lib/match-report/content-type";
import { nextPreviewImportStep } from "@/app/lib/match-report/preview-workflow";
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
    if (!isMatchPreview(existing)) {
      return NextResponse.json({ error: "Project is not a match preview." }, { status: 400 });
    }
    const foundation = existing.layers.sixLogic;
    if (!foundation) {
      return NextResponse.json({ error: "Six Logic foundation missing." }, { status: 400 });
    }
    const fixtureContext = buildFixtureContextFromSixLogicFoundation(foundation);
    const project = await repo.saveProject({
      ...existing,
      layers: {
        ...existing.layers,
        fixtureContext: fixtureContext ?? existing.layers.fixtureContext,
      },
      workflowStep: nextPreviewImportStep("preview_fixture_context"),
      workflowPhase: "import_layers",
      health: {
        ...existing.health,
        skippedLayers: existing.health.skippedLayers.filter((row) => row.layer !== "preview_fixture_context"),
      },
    });
    return NextResponse.json({ project, fixtureContext });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Preview fixture context import failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
