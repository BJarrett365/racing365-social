import { NextResponse } from "next/server";
import { isMatchPreview } from "@/app/lib/match-report/content-type";
import {
  fotMobPreviewImportLines,
  formatImportLinesBulletList,
} from "@/app/lib/match-report/preview-import-summaries";
import { parseFotMobPreviewMatch } from "@/app/lib/match-report/parse-fotmob-preview";
import { nextPreviewImportStep } from "@/app/lib/match-report/preview-workflow";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";

type Body = { projectId?: string; fotMobUrl?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    const fotMobUrl = body.fotMobUrl?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }
    if (!fotMobUrl) {
      return NextResponse.json({ error: "fotMobUrl is required." }, { status: 400 });
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

    const fotMobPreview = await parseFotMobPreviewMatch(
      fotMobUrl,
      foundation.facts.homeTeam,
      foundation.facts.awayTeam,
    );
    const importedItems = fotMobPreviewImportLines(fotMobPreview);

    const project = await repo.saveProject({
      ...existing,
      layers: {
        ...existing.layers,
        fotMobPreview,
      },
      workflowStep: nextPreviewImportStep("preview_fotmob"),
      workflowPhase: "import_layers",
      health: {
        ...existing.health,
        skippedLayers: existing.health.skippedLayers.filter((row) => row.layer !== "preview_fotmob"),
      },
    });

    return NextResponse.json({
      project,
      fotMobPreview,
      importedItems,
      importSummary: formatImportLinesBulletList(importedItems),
    });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "FotMob preview import failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
