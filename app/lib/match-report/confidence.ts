import type { SkippedLayer } from "@/app/lib/match-report/types";

export const CONFIDENCE_BASELINE = 100;

export const LAYER_CONFIDENCE_PENALTIES = {
  sport365Commentary: 10,
  leagueTable: 8,
  leagueSeasonStats: 6,
  loopFeed: 15,
  whoscored: 20,
  manualSources: 5,
  transcripts: 10,
} as const;

export function baselineConfidence(): number {
  return CONFIDENCE_BASELINE;
}

export function applySkippedLayerPenalties(skipped: SkippedLayer[]): number {
  const totalPenalty = skipped.reduce((sum, row) => sum + row.confidencePenalty, 0);
  return Math.max(0, CONFIDENCE_BASELINE - totalPenalty);
}
