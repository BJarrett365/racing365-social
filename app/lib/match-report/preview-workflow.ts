import type { MatchReportWorkflowStep } from "@/app/lib/match-report/types";
import { LAYER_CONFIDENCE_PENALTIES } from "@/app/lib/match-report/confidence";

/** Import layers for match previews (pre-match). Commentary / WhoScored / interviews omitted. */
export const PREVIEW_IMPORT_LAYER_STEPS: MatchReportWorkflowStep[] = [
  "preview_fixture_context",
  "preview_whoscored",
  "preview_fotmob",
  "league_table",
  "league_stats",
  "loop_feed",
  "manual_sources",
];

/** Generation steps for match previews — no player ratings or transcripts. */
export const PREVIEW_GENERATION_STEPS: MatchReportWorkflowStep[] = [
  "build_picture",
  "image_intelligence",
  "media_builder",
  "fact_check",
  "review",
];

export const PREVIEW_SKIP_PENALTIES: Partial<Record<string, number>> = {
  preview_fixture_context: 8,
  preview_whoscored: 6,
  preview_fotmob: 6,
  fixtureContext: 8,
  whoScoredPreview: 6,
  fotMobPreview: 6,
  leagueTable: LAYER_CONFIDENCE_PENALTIES.leagueTable,
  leagueSeasonStats: LAYER_CONFIDENCE_PENALTIES.leagueSeasonStats,
  loopFeed: LAYER_CONFIDENCE_PENALTIES.loopFeed,
  manualSources: LAYER_CONFIDENCE_PENALTIES.manualSources,
};

export function nextPreviewImportStep(current: MatchReportWorkflowStep): MatchReportWorkflowStep {
  const idx = PREVIEW_IMPORT_LAYER_STEPS.indexOf(current);
  if (idx === -1 || idx >= PREVIEW_IMPORT_LAYER_STEPS.length - 1) return "build_picture";
  return PREVIEW_IMPORT_LAYER_STEPS[idx + 1]!;
}

export function prevPreviewImportStep(current: MatchReportWorkflowStep): MatchReportWorkflowStep | null {
  if (current === "build_picture") return "manual_sources";
  const idx = PREVIEW_IMPORT_LAYER_STEPS.indexOf(current);
  if (idx <= 0) return null;
  return PREVIEW_IMPORT_LAYER_STEPS[idx - 1]!;
}

export function previewStepLabel(step: MatchReportWorkflowStep): string {
  const labels: Partial<Record<MatchReportWorkflowStep, string>> = {
    preview_fixture_context: "Six Logic form & H2H",
    preview_whoscored: "WhoScored preview",
    preview_fotmob: "FotMob preview",
    league_table: "League table",
    league_stats: "Top scorers & team stats",
    loop_feed: "Loop Feed",
    manual_sources: "Team news & manual sources",
    build_picture: "Preview picture",
    image_intelligence: "Preview image",
    media_builder: "Generate preview",
    fact_check: "Fact check",
    review: "Review",
  };
  return labels[step] ?? step;
}

export function isPreviewImportStep(step: MatchReportWorkflowStep): boolean {
  return PREVIEW_IMPORT_LAYER_STEPS.includes(step);
}

export function isPreviewGenerationStep(step: MatchReportWorkflowStep): boolean {
  return PREVIEW_GENERATION_STEPS.includes(step);
}

export function nextPreviewGenerationStep(current: MatchReportWorkflowStep): MatchReportWorkflowStep {
  const idx = PREVIEW_GENERATION_STEPS.indexOf(current);
  if (idx === -1 || idx >= PREVIEW_GENERATION_STEPS.length - 1) return "review";
  return PREVIEW_GENERATION_STEPS[idx + 1]!;
}

export function prevPreviewGenerationStep(current: MatchReportWorkflowStep): MatchReportWorkflowStep | null {
  const idx = PREVIEW_GENERATION_STEPS.indexOf(current);
  if (idx <= 0) return null;
  return PREVIEW_GENERATION_STEPS[idx - 1]!;
}
