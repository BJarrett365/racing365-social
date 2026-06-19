import { bannedPhraseReadabilityPenalty, findBannedPhraseHits } from "@/app/lib/match-report/f365-banned-phrases";
import type { EditorialScoreResult } from "@/app/lib/match-report/mio/types";
import { lintPreviewSections } from "@/app/lib/match-report/preview-section-lint";
import type { MatchReportProject } from "@/app/lib/match-report/types";

type DimensionDef = { id: string; label: string; weight: number; canBlockPublish: boolean };

const PREVIEW_DIMENSIONS: DimensionDef[] = [
  { id: "story", label: "Story", weight: 0.2, canBlockPublish: true },
  { id: "insight", label: "Insight", weight: 0.2, canBlockPublish: true },
  { id: "tactical", label: "Tactical", weight: 0.15, canBlockPublish: true },
  { id: "context", label: "Context", weight: 0.15, canBlockPublish: true },
  { id: "readability", label: "Readability", weight: 0.1, canBlockPublish: true },
  { id: "originality", label: "Originality", weight: 0.1, canBlockPublish: true },
  { id: "eeat", label: "E-E-A-T", weight: 0.05, canBlockPublish: true },
  { id: "commercial", label: "Commercial", weight: 0.05, canBlockPublish: false },
];

const TIER_THRESHOLDS: Record<EditorialScoreResult["tier"], number> = {
  T1: 8.0,
  T2: 7.5,
  T3: 7.0,
  T4: 6.5,
};

function resolveTier(project: MatchReportProject): EditorialScoreResult["tier"] {
  const comp = (project.competition ?? project.editorial.competitionCode ?? "").toLowerCase();
  if (/world cup|euro|champions league|england/i.test(comp)) return "T1";
  if (/premier league|la liga|bundesliga|serie a/i.test(comp)) return "T2";
  if (/friendly|pre-season/i.test(comp)) return "T4";
  return "T3";
}

function heuristicDimensionScore(
  id: string,
  html: string,
  project: MatchReportProject,
  sectionLintOk: boolean,
  bannedHits: string[],
): { score: number; notes: string[] } {
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const notes: string[] = [];
  let score = 7.0;

  switch (id) {
    case "story":
      score = project.previewPicture?.headlineAngle ? 8.2 : 6.5;
      if (project.previewPicture?.storyThread) score += 0.3;
      break;
    case "insight":
      score = project.previewPicture?.significance?.whyItMatters ? 8.5 : 6.8;
      if (project.previewPicture?.whatHappensNext) score += 0.2;
      break;
    case "tactical":
      score = project.previewPicture?.tacticalPreview ? 8.0 : 6.0;
      if (/<h2[^>]*>[\s\S]*tactical/i.test(html)) score += 0.5;
      break;
    case "context":
      score = project.layers.leagueTable ? 8.0 : 6.5;
      if (project.layers.fixtureContext) score += 0.3;
      break;
    case "readability":
      score = sectionLintOk ? 8.0 : 6.0;
      score -= bannedPhraseReadabilityPenalty(bannedHits);
      if (bannedHits.length) notes.push(`${bannedHits.length} banned phrase(s) detected.`);
      if (words < 500) {
        score -= 1;
        notes.push("Body may be short for tier target (500+ words).");
      }
      break;
    case "originality":
      score = project.previewPicture?.keyBattles?.length ? 7.8 : 6.5;
      break;
    case "eeat":
      score = project.teamIntelligence ? 7.5 : 6.8;
      if (project.confidence >= 75) score += 0.4;
      break;
    case "commercial":
      score = 7.5;
      break;
  }

  return { score: Math.max(0, Math.min(10, score)), notes };
}

export function scorePreviewEditorial(project: MatchReportProject, html: string): EditorialScoreResult {
  const tier = resolveTier(project);
  const threshold = TIER_THRESHOLDS[tier];
  const bannedPhraseHits = findBannedPhraseHits(html);
  const sectionLint = lintPreviewSections(html);
  const readabilityPenalty = bannedPhraseReadabilityPenalty(bannedPhraseHits);

  const dimensions = PREVIEW_DIMENSIONS.map((def) => {
    const { score, notes } = heuristicDimensionScore(
      def.id,
      html,
      project,
      sectionLint.ok,
      bannedPhraseHits,
    );
    return {
      id: def.id,
      label: def.label,
      weight: def.weight,
      score,
      canBlockPublish: def.canBlockPublish,
      notes,
    };
  });

  const overall =
    Math.round(
      dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) * 10,
    ) / 10;

  const blockingFail = dimensions.some((d) => d.canBlockPublish && d.score < threshold);
  const commercialBonus = dimensions.find((d) => d.id === "commercial")?.score ?? 0;

  return {
    contentType: "match_preview",
    overall,
    dimensions,
    bannedPhraseHits,
    readabilityPenalty,
    commercialBonus: commercialBonus >= 8 ? 0.2 : 0,
    publishRecommended: !blockingFail && overall >= threshold,
    regenRecommended: overall < threshold,
    heroCandidate: overall >= 9.0,
    tier,
    generatedAt: new Date().toISOString(),
  };
}
