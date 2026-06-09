import { baselineConfidence, LAYER_CONFIDENCE_PENALTIES } from "@/app/lib/match-report/confidence";
import { isMatchPreview } from "@/app/lib/match-report/content-type";
import {
  PREVIEW_SKIP_PENALTIES,
  nextPreviewGenerationStep,
  nextPreviewImportStep,
  prevPreviewGenerationStep,
  prevPreviewImportStep,
} from "@/app/lib/match-report/preview-workflow";
import type { MatchReportProject, MatchReportWorkflowStep, SkippedLayer } from "@/app/lib/match-report/types";
import { nextGenerationStep, nextImportLayerStep, prevGenerationStep, prevImportLayerStep } from "@/app/lib/match-report/workflow";

export const OPTIONAL_LAYER_PENALTIES: Record<string, number> = {
  sport365: LAYER_CONFIDENCE_PENALTIES.sport365Commentary,
  sport365Commentary: LAYER_CONFIDENCE_PENALTIES.sport365Commentary,
  league_table: LAYER_CONFIDENCE_PENALTIES.leagueTable,
  league_stats: LAYER_CONFIDENCE_PENALTIES.leagueSeasonStats,
  leagueSeasonStats: LAYER_CONFIDENCE_PENALTIES.leagueSeasonStats,
  leagueTable: LAYER_CONFIDENCE_PENALTIES.leagueTable,
  loop_feed: LAYER_CONFIDENCE_PENALTIES.loopFeed,
  loopFeed: LAYER_CONFIDENCE_PENALTIES.loopFeed,
  whoscored: LAYER_CONFIDENCE_PENALTIES.whoscored,
  optaPlayerData: LAYER_CONFIDENCE_PENALTIES.whoscored,
  manual_sources: LAYER_CONFIDENCE_PENALTIES.manualSources,
  manualSources: LAYER_CONFIDENCE_PENALTIES.manualSources,
  transcripts: LAYER_CONFIDENCE_PENALTIES.transcripts,
  ...PREVIEW_SKIP_PENALTIES,
};

export function nextImportStep(
  current: MatchReportWorkflowStep,
  project?: Pick<MatchReportProject, "contentType">,
): MatchReportWorkflowStep {
  if (project && isMatchPreview(project)) return nextPreviewImportStep(current);
  return nextImportLayerStep(current);
}

export function prevImportStepForProject(
  current: MatchReportWorkflowStep,
  project?: Pick<MatchReportProject, "contentType">,
): MatchReportWorkflowStep | null {
  if (project && isMatchPreview(project)) return prevPreviewImportStep(current);
  return prevImportLayerStep(current);
}

export function nextGenStep(
  current: MatchReportWorkflowStep,
  project?: Pick<MatchReportProject, "contentType">,
): MatchReportWorkflowStep {
  if (project && isMatchPreview(project)) return nextPreviewGenerationStep(current);
  return nextGenerationStep(current);
}

export function prevImportStep(current: MatchReportWorkflowStep): MatchReportWorkflowStep | null {
  return prevImportLayerStep(current);
}

export function prevGenStep(
  current: MatchReportWorkflowStep,
  project?: Pick<MatchReportProject, "contentType">,
): MatchReportWorkflowStep | null {
  if (project && isMatchPreview(project)) return prevPreviewGenerationStep(current);
  return prevGenerationStep(current);
}

export function skipLayerEntry(layer: string, reason: string): SkippedLayer {
  return {
    layer,
    reason,
    confidencePenalty: OPTIONAL_LAYER_PENALTIES[layer] ?? 5,
  };
}

export function upsertSkippedLayer(project: MatchReportProject, entry: SkippedLayer): SkippedLayer[] {
  const rest = project.health.skippedLayers.filter((row) => row.layer !== entry.layer);
  return [...rest, entry];
}

export function recomputeConfidence(project: MatchReportProject): number {
  const penalty = project.health.skippedLayers.reduce((sum, row) => sum + row.confidencePenalty, 0);
  return Math.max(0, baselineConfidence() - penalty);
}

export function applyHealthUpdate(project: MatchReportProject): MatchReportProject {
  return {
    ...project,
    confidence: recomputeConfidence(project),
    updatedAt: new Date().toISOString(),
  };
}

export function kickoffContextDate(kickoffIso?: string): string {
  if (!kickoffIso) return new Date().toISOString().slice(0, 10);
  const trimmed = kickoffIso.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}
