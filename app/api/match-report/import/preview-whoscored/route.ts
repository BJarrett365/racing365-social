import { NextResponse } from "next/server";
import { isMatchPreview } from "@/app/lib/match-report/content-type";
import {
  formatImportLinesBulletList,
  whoScoredPreviewImportLines,
} from "@/app/lib/match-report/preview-import-summaries";
import { parseWhoScoredFixtureContextPreview } from "@/app/lib/match-report/parse-whoscored-fixture-context";
import { nextPreviewImportStep } from "@/app/lib/match-report/preview-workflow";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";

type Body = { projectId?: string; whoScoredUrl?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    const whoScoredUrl = body.whoScoredUrl?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }
    if (!whoScoredUrl) {
      return NextResponse.json({ error: "whoScoredUrl is required." }, { status: 400 });
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

    const whoScoredPreview = await parseWhoScoredFixtureContextPreview(
      whoScoredUrl,
      foundation.facts.homeTeam,
      foundation.facts.awayTeam,
    );
    const importedItems = whoScoredPreviewImportLines(whoScoredPreview);

    const project = await repo.saveProject({
      ...existing,
      layers: {
        ...existing.layers,
        whoScoredPreview,
      },
      workflowStep: nextPreviewImportStep("preview_whoscored"),
      workflowPhase: "import_layers",
      health: {
        ...existing.health,
        skippedLayers: existing.health.skippedLayers.filter((row) => row.layer !== "preview_whoscored"),
      },
    });

    return NextResponse.json({
      project,
      whoScoredPreview,
      importedItems,
      importSummary: formatImportLinesBulletList(importedItems),
    });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "WhoScored preview import failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
