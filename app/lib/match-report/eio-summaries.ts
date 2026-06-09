import { loopFeedEditorDigest } from "@/app/lib/data-studio/loop-feed";
import { creatorTeamSupportPrompt } from "@/app/lib/language-studio/creator-team-support";
import {
  BRAND_LABEL_BY_TARGET,
  MATCH_REPORT_PUBLISHING_EEAT_GUIDELINES,
  matchReportBrandStylePacketForTarget,
} from "@/app/lib/match-report/editorial-governance";
import { formatImportLayerSummariesBlock } from "@/app/lib/match-report/import-layer-summaries";
import { buildMatchFoundationSummary } from "@/app/lib/match-report/normalise-sixlogics";
import { buildMatchStoryContext } from "@/app/lib/match-report/story-engine";
import type { MatchReportProject } from "@/app/lib/match-report/types";

export function buildEditorialGovernanceBlock(project: MatchReportProject): string {
  const e = project.editorial;
  const lines = [
    "STYLE PRIORITY:",
    "1. Website / brand style is mandatory: match the target publication's editorial attitude, structure, headline instincts and reader expectations.",
    "2. Content Creator profile is mandatory when selected: use it for sentence rhythm, paragraph length, attribution habits, framing and level of edge.",
    "3. Facts still come only from the EIO; style must change voice and presentation, not invent details.",
    "",
    `Sport: ${e.sport}`,
    `Content style: ${e.contentStyle}`,
    `Brand: ${BRAND_LABEL_BY_TARGET[e.targetBrand]}`,
    `Website style summary: ${e.brandStyle}`,
    "",
    "DEEP BRAND / STYLE PACKET (mandatory for OpenAI report generation):",
    matchReportBrandStylePacketForTarget(e.targetBrand),
    "",
    `Report style instruction: ${e.rewriteStyle}`,
  ];
  if (e.brandStyleGuide?.trim()) {
    lines.push(`Website brand style guide (must be followed):\n${e.brandStyleGuide.trim()}`);
  }
  if (e.useCreatorProfile && e.creatorName) {
    lines.push(`Content Creator profile (must be reflected in copy): ${e.creatorName}`);
    if (e.creatorStyleNotes.trim()) lines.push(`Content Creator style notes:\n${e.creatorStyleNotes.trim()}`);
    lines.push(
      creatorTeamSupportPrompt(
        { teamSupportMode: e.creatorTeamSupportMode, supportedClub: e.creatorSupportedClub },
        { homeTeam: project.homeTeam, awayTeam: project.awayTeam },
      ),
    );
  }
  if (e.articleGuidelines.trim()) lines.push(`Editorial guidelines: ${e.articleGuidelines.trim()}`);
  lines.push(`Publishing & E-E-A-T:\n${MATCH_REPORT_PUBLISHING_EEAT_GUIDELINES}`);
  if (e.competitionCode) lines.push(`Competition code: ${e.competitionCode}`);
  return lines.join("\n");
}

export function buildLayerWeightsBlock(project: MatchReportProject): string {
  const w = project.editorial.layerWeights;
  return Object.entries(w)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

export function buildMatchFoundationSummaryBlock(project: MatchReportProject): string {
  const foundation = project.layers.sixLogic;
  if (!foundation) return "SixLogic foundation missing.";
  return buildMatchFoundationSummary(foundation);
}

export function buildSixLogicAvailableDataBlock(project: MatchReportProject): string {
  const available = project.layers.sixLogic?.availableData;
  if (!available?.sections.length) return "(no expanded SixLogics sections normalised)";
  const sectionLines = available.sections.map((section) => {
    const count = section.count !== undefined ? ` (${section.count})` : "";
    return `- ${section.title}${count}: ${section.description}`;
  });
  const statsRows = available.matchTeamStats?.length
    ? `\nTeam stats periods: ${available.matchTeamStats
        .map((row) => (typeof row === "object" && row !== null && "statsType" in row ? String(row.statsType) : "unknown"))
        .join(", ")}`
    : "";
  return [
    "SixLogics import now includes all available non-social match sections. Treat these as Tier 1 match data; Loop Feed handles social/reaction intelligence separately.",
    ...sectionLines,
    statsRows,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildKeyMomentsTimelineBlock(project: MatchReportProject): string {
  const foundation = project.layers.sixLogic;
  if (!foundation) return "";
  const commentary =
    project.layers.sport365Commentary?.digest ||
    foundation.commentary
      .slice(0, 24)
      .map((row) => `${row.minute ?? "?"}' ${row.text}`)
      .join("\n");
  const events = foundation.events
    .slice(0, 24)
    .map((row) => `${row.minute ?? "?"}' [${row.type}] ${row.text}`)
    .join("\n");
  const goalContext =
    project.layers.leagueSeasonStats?.matchGoalscorerContext.length
      ? `Goalscorer season context:\n${project.layers.leagueSeasonStats.matchGoalscorerContext.join("\n")}`
      : "";
  return [
    commentary ? `Commentary digest:\n${commentary}` : "",
    events ? `Events:\n${events}` : "",
    goalContext,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildLoopFeedDigestBlock(project: MatchReportProject): string {
  const loop = project.layers.loopFeed;
  if (!loop) return "";
  return loop.digest || loopFeedEditorDigest({ contextDate: loop.contextDate, fetchedAt: loop.fetchedAt, sides: loop.sides });
}

export function buildLeagueSeasonStatsDigestBlock(project: MatchReportProject): string {
  return project.layers.leagueSeasonStats?.digest ?? "";
}

export function buildLeagueTableDigestBlock(project: MatchReportProject): string {
  return project.layers.leagueTable?.digest ?? "";
}

export function buildManualSourceDigestBlock(project: MatchReportProject): string {
  if (project.layers.manualSources.length === 0) return "";
  return project.layers.manualSources
    .map((row) => `[${row.source}] ${row.title ?? row.url ?? "notes"}: ${row.excerpt.slice(0, 500)}`)
    .join("\n\n");
}

export function buildSkippedLayersBlock(project: MatchReportProject): string {
  if (project.health.skippedLayers.length === 0) return "None.";
  return project.health.skippedLayers
    .map((row) => `${row.layer}: ${row.reason} (−${row.confidencePenalty})`)
    .join("\n");
}

export function buildOptaDigestBlock(project: MatchReportProject): string {
  return project.layers.optaPlayerData?.summaryDigest ?? "";
}

export function buildInterviewDigestBlock(project: MatchReportProject): string {
  if (project.layers.interviews.length === 0) return "";
  return project.layers.interviews
    .map((row) => {
      const header = row.title ? `[${row.title}${row.channelName ? ` · ${row.channelName}` : ""}]` : row.sourceUrl;
      return `${header}\n${row.digest}`;
    })
    .join("\n\n");
}

export function buildFixtureContextDigestBlock(project: MatchReportProject): string {
  return project.layers.fixtureContext?.digest ?? "";
}

export function assembleEioPromptSections(project: MatchReportProject): string {
  return [
    "IMPORT_LAYER_SUMMARIES",
    formatImportLayerSummariesBlock(project),
    "",
    "EDITORIAL_GOVERNANCE",
    buildEditorialGovernanceBlock(project),
    "",
    "LAYER_WEIGHTS",
    buildLayerWeightsBlock(project),
    "",
    "MATCH_FOUNDATION_SUMMARY",
    buildMatchFoundationSummaryBlock(project),
    "",
    "SIXLOGICS_AVAILABLE_DATA",
    buildSixLogicAvailableDataBlock(project),
    "",
    "COMMENTARY_DIGEST",
    project.layers.sport365Commentary?.digest || "(SixLogic fallback in timeline)",
    "",
    "LEAGUE_TABLE_DIGEST",
    buildLeagueTableDigestBlock(project) || "(skipped)",
    "",
    "LEAGUE_SEASON_STATS_DIGEST",
    buildLeagueSeasonStatsDigestBlock(project) || "(skipped)",
    "",
    "FIXTURE_CONTEXT_DIGEST",
    buildFixtureContextDigestBlock(project) || "(skipped)",
    "",
    "KEY_MOMENTS_TIMELINE",
    buildKeyMomentsTimelineBlock(project),
    "",
    "LOOPFEED_DIGEST",
    buildLoopFeedDigestBlock(project) || "(skipped)",
    "",
    "MANUAL_SOURCE_DIGEST",
    buildManualSourceDigestBlock(project) || "(none)",
    "",
    "OPTA_PLAYER_SUMMARIES",
    buildOptaDigestBlock(project) || "(skipped)",
    "",
    "INTERVIEW_TRANSCRIPTS",
    buildInterviewDigestBlock(project) || "(none)",
    "",
    "STORY_ENGINE_CONTEXT",
    JSON.stringify(buildMatchStoryContext(project), null, 2),
    "",
    "CONFIDENCE_AND_SKIPPED_LAYERS",
    `Confidence: ${project.confidence}`,
    buildSkippedLayersBlock(project),
  ].join("\n");
}
