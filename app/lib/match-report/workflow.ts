import type { MatchReportWorkflowStep } from "@/app/lib/match-report/types";

export const IMPORT_LAYER_STEPS: MatchReportWorkflowStep[] = [
  "sport365",
  "league_table",
  "league_stats",
  "loop_feed",
  "whoscored",
  "manual_sources",
];

export const GENERATION_STEPS: MatchReportWorkflowStep[] = [
  "build_picture",
  "player_intelligence",
  "transcripts",
  "image_intelligence",
  "media_builder",
  "review",
];

export function nextImportLayerStep(current: MatchReportWorkflowStep): MatchReportWorkflowStep {
  const idx = IMPORT_LAYER_STEPS.indexOf(current);
  if (idx === -1 || idx >= IMPORT_LAYER_STEPS.length - 1) return "build_picture";
  return IMPORT_LAYER_STEPS[idx + 1]!;
}

export function prevImportLayerStep(current: MatchReportWorkflowStep): MatchReportWorkflowStep | null {
  if (current === "build_picture") return "manual_sources";
  const idx = IMPORT_LAYER_STEPS.indexOf(current);
  if (idx <= 0) return null;
  return IMPORT_LAYER_STEPS[idx - 1]!;
}

export function nextGenerationStep(current: MatchReportWorkflowStep): MatchReportWorkflowStep {
  const idx = GENERATION_STEPS.indexOf(current);
  if (idx === -1 || idx >= GENERATION_STEPS.length - 1) return "review";
  return GENERATION_STEPS[idx + 1]!;
}

export function prevGenerationStep(current: MatchReportWorkflowStep): MatchReportWorkflowStep | null {
  const idx = GENERATION_STEPS.indexOf(current);
  if (idx <= 0) return null;
  return GENERATION_STEPS[idx - 1]!;
}

export function stepLabel(step: MatchReportWorkflowStep): string {
  const labels: Partial<Record<MatchReportWorkflowStep, string>> = {
    sport365: "Sport365 commentary",
    league_table: "League table",
    league_stats: "Top scorers & team stats",
    loop_feed: "LoopFeed",
    whoscored: "WhoScored player data",
    manual_sources: "Manual sources",
    build_picture: "Build picture",
    player_intelligence: "Player intelligence",
    transcripts: "Import transcripts",
    image_intelligence: "Image intelligence",
    media_builder: "Media builder",
    review: "Review",
    published: "Published",
  };
  return labels[step] ?? step;
}
