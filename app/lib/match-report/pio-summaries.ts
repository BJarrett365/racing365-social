import { isMatchPreview } from "@/app/lib/match-report/content-type";
import {
  buildEditorialGovernanceBlock,
  buildFixtureContextDigestBlock,
  buildLayerWeightsBlock,
  buildLeagueSeasonStatsDigestBlock,
  buildLeagueTableDigestBlock,
  buildLoopFeedDigestBlock,
  buildManualSourceDigestBlock,
  buildMatchFoundationSummaryBlock,
  buildSixLogicAvailableDataBlock,
  buildSkippedLayersBlock,
} from "@/app/lib/match-report/eio-summaries";
import { formatImportLayerSummariesBlock } from "@/app/lib/match-report/import-layer-summaries";
import { getMergedPreviewFixtureContext } from "@/app/lib/match-report/preview-fixture-context-merge";
import type { FixtureMeetingSnapshot, MatchReportProject } from "@/app/lib/match-report/types";

function formatMeetings(rows: FixtureMeetingSnapshot[], limit = 6): string {
  if (rows.length === 0) return "(none)";
  return rows
    .slice(0, limit)
    .map((m) => `${m.date ?? "?"} ${m.homeTeam} ${m.homeScore ?? "?"}-${m.awayScore ?? "?"} ${m.awayTeam}`)
    .join("\n");
}

export function buildFormDigestBlock(project: MatchReportProject): string {
  const ctx = getMergedPreviewFixtureContext(project);
  if (!ctx) return "(skipped)";
  const home = formatMeetings(ctx.homeRecentResults, 5);
  const away = formatMeetings(ctx.awayRecentResults, 5);
  return [`Home recent form:\n${home}`, `Away recent form:\n${away}`].join("\n\n");
}

export function buildH2HDigestBlock(project: MatchReportProject): string {
  const ctx = getMergedPreviewFixtureContext(project);
  if (!ctx || ctx.headToHead.length === 0) return "(none)";
  return formatMeetings(ctx.headToHead, 8);
}

export function buildMatchFactsDigestBlock(project: MatchReportProject): string {
  const facts = getMergedPreviewFixtureContext(project)?.matchFacts ?? [];
  if (facts.length === 0) return "(none)";
  return facts.slice(0, 12).map((fact) => `- ${fact}`).join("\n");
}

export function buildWhoScoredPreviewDigestBlock(project: MatchReportProject): string {
  const digest = project.layers.whoScoredPreview?.digest;
  if (!digest?.trim()) return "(skipped)";
  return digest;
}

export function buildFixtureCongestionBlock(project: MatchReportProject): string {
  const ctx = getMergedPreviewFixtureContext(project);
  if (!ctx) return "(skipped)";
  const parts: string[] = [];
  if (ctx.homeNextFixture) {
    parts.push(
      `Home next: ${ctx.homeNextFixture.team} vs ${ctx.homeNextFixture.opponent ?? "TBC"}${ctx.homeNextFixture.date ? ` (${ctx.homeNextFixture.date})` : ""}`,
    );
  }
  if (ctx.awayNextFixture) {
    parts.push(
      `Away next: ${ctx.awayNextFixture.team} vs ${ctx.awayNextFixture.opponent ?? "TBC"}${ctx.awayNextFixture.date ? ` (${ctx.awayNextFixture.date})` : ""}`,
    );
  }
  return parts.length > 0 ? parts.join("\n") : "(none)";
}

export function buildOddsDigestBlock(project: MatchReportProject): string {
  const odds = project.layers.sixLogic?.availableData?.odds;
  if (!Array.isArray(odds) || odds.length === 0) return "(not supplied)";
  return JSON.stringify(odds.slice(0, 12), null, 2);
}

export function buildTeamNewsDigestBlock(project: MatchReportProject): string {
  const teamNews = project.layers.manualSources.filter(
    (row) =>
      row.type === "Other" ||
      /injur|suspension|team news|line-?up|doubt|fitness/i.test(`${row.title ?? ""} ${row.excerpt}`),
  );
  if (teamNews.length === 0) return "(none)";
  return teamNews
    .map((row) => `[${row.source}] ${row.title ?? "notes"}: ${row.excerpt.slice(0, 400)}`)
    .join("\n\n");
}

function formatFotMobLineupBlock(
  side: "Home" | "Away",
  lineup: NonNullable<MatchReportProject["layers"]["fotMobPreview"]>["homeLineup"],
): string | null {
  if (!lineup || lineup.starters.length === 0) return null;
  const starters = lineup.starters.map((p) => (p.shirtNumber ? `${p.shirtNumber} ${p.name}` : p.name)).join(", ");
  const bench =
    lineup.bench.length > 0
      ? ` Bench: ${lineup.bench
          .slice(0, 7)
          .map((p) => p.name)
          .join(", ")}`
      : "";
  return `${side} (${lineup.team}) ${lineup.formation ?? ""} [${lineup.lineupLabel}]: ${starters}.${bench}`;
}

export function buildFotMobPreviewDigestBlock(project: MatchReportProject): string {
  const fotmob = project.layers.fotMobPreview;
  if (!fotmob) return "(skipped)";
  return fotmob.digest;
}

export function buildLineupContextBlock(project: MatchReportProject): string {
  const fotmob = project.layers.fotMobPreview;
  const fotmobParts = [
    formatFotMobLineupBlock("Home", fotmob?.homeLineup),
    formatFotMobLineupBlock("Away", fotmob?.awayLineup),
  ].filter(Boolean);
  if (fotmobParts.length > 0) {
    return fotmobParts.join("\n");
  }

  const foundation = project.layers.sixLogic;
  if (!foundation) return "(foundation missing)";
  const homeStarters = foundation.lineups.home.starters.map((p) => p.name).filter(Boolean);
  const awayStarters = foundation.lineups.away.starters.map((p) => p.name).filter(Boolean);
  if (homeStarters.length === 0 && awayStarters.length === 0) {
    return "No confirmed line-ups in SixLogics feed. If naming starters, label as predicted/expected XI.";
  }
  const parts: string[] = [];
  if (homeStarters.length > 0) parts.push(`Home (${foundation.facts.homeTeam}): ${homeStarters.join(", ")}`);
  if (awayStarters.length > 0) parts.push(`Away (${foundation.facts.awayTeam}): ${awayStarters.join(", ")}`);
  return parts.join("\n");
}

export function buildStakesDigestBlock(project: MatchReportProject): string {
  const table = project.layers.leagueTable;
  if (!table) return project.layers.fixtureContext?.digest?.slice(0, 600) ?? "(skipped)";
  const parts = [table.digest.slice(0, 800)];
  if (table.homeStakes) parts.push(`Home stakes: ${table.homeStakes}`);
  if (table.awayStakes) parts.push(`Away stakes: ${table.awayStakes}`);
  return parts.join("\n");
}

/** Preview Intelligence Object — structured prompt for pre-match generation. */
export function assemblePioPromptSections(project: MatchReportProject): string {
  if (!isMatchPreview(project)) {
    throw new Error("assemblePioPromptSections requires contentType match_preview.");
  }
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
    "FORM_DIGEST",
    buildFormDigestBlock(project),
    "",
    "H2H_DIGEST",
    buildH2HDigestBlock(project),
    "",
    "MATCH_FACTS_DIGEST",
    buildMatchFactsDigestBlock(project),
    "",
    "WHOSCORED_PREVIEW_DIGEST",
    buildWhoScoredPreviewDigestBlock(project),
    "",
    "FOTMOB_PREVIEW_DIGEST",
    buildFotMobPreviewDigestBlock(project),
    "",
    "FIXTURE_CONGESTION_DIGEST",
    buildFixtureCongestionBlock(project),
    "",
    "LEAGUE_TABLE_DIGEST",
    buildLeagueTableDigestBlock(project) || "(skipped)",
    "",
    "LEAGUE_SEASON_STATS_DIGEST",
    buildLeagueSeasonStatsDigestBlock(project) || "(skipped)",
    "",
    "ODDS_DIGEST",
    buildOddsDigestBlock(project),
    "",
    "FIXTURE_CONTEXT_DIGEST",
    buildFixtureContextDigestBlock(project) || "(skipped)",
    "",
    "LOOPFEED_DIGEST",
    buildLoopFeedDigestBlock(project) || "(skipped)",
    "",
    "MANUAL_SOURCE_DIGEST",
    buildManualSourceDigestBlock(project) || "(none)",
    "",
    "TEAM_NEWS_DIGEST",
    buildTeamNewsDigestBlock(project),
    "",
    "LINEUP_CONTEXT",
    buildLineupContextBlock(project),
    "",
    "STAKES_DIGEST",
    buildStakesDigestBlock(project),
    "",
    "CONFIDENCE_AND_SKIPPED_LAYERS",
    `Confidence: ${project.confidence}`,
    buildSkippedLayersBlock(project),
  ].join("\n");
}
