import { isMatchPreview } from "@/app/lib/match-report/content-type";
import { assembleEioPromptSections } from "@/app/lib/match-report/eio-summaries";
import { assemblePioPromptSections } from "@/app/lib/match-report/pio-summaries";
import type { MatchIntelligenceObject, MioMatchPhase } from "@/app/lib/match-report/mio/types";
import type { MatchReportProject } from "@/app/lib/match-report/types";

function resolvePhase(project: MatchReportProject): MioMatchPhase {
  return isMatchPreview(project) ? "preview" : "report";
}

/**
 * Unified Match Intelligence Object prompt assembly.
 * Replaces parallel EIO/PIO calls — single entry for all generation jobs.
 */
export function assembleMioPrompt(project: MatchReportProject): string {
  const phase = resolvePhase(project);
  if (phase === "preview") {
    return [
      "MATCH_INTELLIGENCE_OBJECT",
      `phase: preview`,
      "",
      assemblePioPromptSections(project),
      "",
      "SIGNIFICANCE_ENGINE (mandatory editorial lens)",
      "Every preview must answer: Why should I care? Why does this matter? What happens next?",
      "Brand voice 70% · Creator signals 30%. Brand always wins on facts and tone.",
    ].join("\n");
  }
  return [
    "MATCH_INTELLIGENCE_OBJECT",
    `phase: report`,
    "",
    assembleEioPromptSections(project),
    "",
    "SIGNIFICANCE_ENGINE (mandatory editorial lens)",
    "Explain WHY the match happened — not only WHAT happened.",
    "Brand voice 70% · Creator signals 30%.",
  ].join("\n");
}

export function buildMatchIntelligenceObject(project: MatchReportProject): MatchIntelligenceObject {
  const phase = resolvePhase(project);
  return {
    phase,
    projectId: project.id,
    promptBlock: assembleMioPrompt(project),
    teamIntelligence: project.teamIntelligence ?? undefined,
    previewPicture: project.previewPicture ?? undefined,
    significance: project.previewPicture?.significance ?? project.significance ?? undefined,
    assembledAt: new Date().toISOString(),
  };
}
