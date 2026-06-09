import {
  formatLoopFeedManualSourcesSummary,
  groupLoopFeedManualSourcesByTeam,
} from "@/app/lib/match-report/extract-manual-sources-from-loop-feed";
import { buildMatchFoundationSummary } from "@/app/lib/match-report/normalise-sixlogics";
import type {
  EventPictureLayerSummary,
  FixtureContextIntelligence,
  LeagueSeasonStatsIntelligence,
  LeagueTableIntelligence,
  MatchReportProject,
  Sport365Commentary,
} from "@/app/lib/match-report/types";

const SKIPPED_LAYER_TITLES: Record<string, string> = {
  sport365Commentary: "Six Logic commentary",
  leagueTable: "League table",
  leagueSeasonStats: "Top scorers & team stats",
  loopFeed: "Loop Feed",
  whoscored: "WhoScored",
  optaPlayerData: "WhoScored",
  manualSources: "Manual sources",
  interviews: "Post-match interviews",
};

function digestExcerpt(text: string | undefined, max = 480): string | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

export function sport365CommentarySummary(commentary: Sport365Commentary): string {
  const teams =
    commentary.homeTeam && commentary.awayTeam
      ? `${commentary.homeTeam} v ${commentary.awayTeam}`
      : commentary.homeTeam || commentary.awayTeam || "";
  const parts = [`${commentary.lines.length} commentary line${commentary.lines.length === 1 ? "" : "s"}`];
  if (teams) parts.push(teams);
  if (commentary.competition) parts.push(commentary.competition);
  return parts.join(" · ");
}

export function leagueTableSummary(table: LeagueTableIntelligence): string {
  const parts =
    table.format === "group_stage"
      ? [
          table.groupCode ? `Group ${table.groupCode}` : "Group stage",
          `${table.rows.length} teams`,
          table.competition,
          table.source ?? "Sport365",
        ]
      : [`${table.rows.length} teams`, table.competition, table.source ?? "Sport365"];
  if (table.homeTeamRow) {
    parts.push(
      `${table.homeTeamRow.team} ${table.homeTeamRow.position}${table.homeTeamRow.position === 1 ? "st" : "th"}${table.homeStakes ? ` (${table.homeStakes})` : ""}`,
    );
  }
  if (table.awayTeamRow) {
    parts.push(
      `${table.awayTeamRow.team} ${table.awayTeamRow.position}${table.awayTeamRow.position === 1 ? "st" : "th"}${table.awayStakes ? ` (${table.awayStakes})` : ""}`,
    );
  }
  return parts.join(" · ");
}

export function leagueSeasonStatsSummary(stats: LeagueSeasonStatsIntelligence): string {
  const parts = [
    `${stats.topScorers.length} top scorers`,
    `${stats.teamStats.length} teams`,
    stats.competition,
  ];
  if (stats.matchGoalscorerContext.length > 0) {
    parts.push(
      `${stats.matchGoalscorerContext.length} match goal context line${stats.matchGoalscorerContext.length === 1 ? "" : "s"}`,
    );
  }
  if (stats.homeTeamStats) {
    parts.push(
      `${stats.homeTeamStats.team}: ${stats.homeTeamStats.goalsScored} scored / ${stats.homeTeamStats.goalsConceded} conceded`,
    );
  }
  if (stats.awayTeamStats) {
    parts.push(
      `${stats.awayTeamStats.team}: ${stats.awayTeamStats.goalsScored} scored / ${stats.awayTeamStats.goalsConceded} conceded`,
    );
  }
  return parts.join(" · ");
}

export function fixtureContextSummary(ctx: FixtureContextIntelligence): string {
  const parts: string[] = [];
  if (ctx.seasonDouble?.completed) parts.push("Season double complete");
  else if (ctx.seasonDouble?.homeMeeting || ctx.seasonDouble?.awayMeeting) parts.push("Return fixture pending");
  if (ctx.headToHead.length > 0) parts.push(`${ctx.headToHead.length} H2H meetings`);
  if (ctx.homeNextFixture?.sixLogicMatchId || ctx.awayNextFixture?.sixLogicMatchId) {
    parts.push("Next fixtures with match IDs");
  }
  return parts.length > 0 ? parts.join(" · ") : "Fixture context imported";
}

export function loopFeedSummary(project: MatchReportProject): string {
  const loop = project.layers.loopFeed;
  if (!loop) return "";
  return `${loop.contextDate} · ${loop.sides
    .map((side) => {
      if (side.error) return `${side.sideLabel}: ${side.error}`;
      const n = Array.isArray(side.posts) ? side.posts.length : 0;
      return `${side.sideLabel}: ${n} posts`;
    })
    .join(" · ")}`;
}

export function manualSourcesSummary(project: MatchReportProject): string {
  const { manualSources, loopFeed } = project.layers;
  if (manualSources.length === 0) return "";
  const loopCount = manualSources.filter((row) => row.derivedFrom === "loop_feed").length;
  const teamGroups = groupLoopFeedManualSourcesByTeam({
    manualSources,
    loopFeed,
    homeTeam: project.homeTeam,
    awayTeam: project.awayTeam,
  });
  return formatLoopFeedManualSourcesSummary(teamGroups, manualSources.length, loopCount);
}

export function buildImportLayerSummaries(project: MatchReportProject): EventPictureLayerSummary[] {
  const summaries: EventPictureLayerSummary[] = [];

  if (project.layers.sixLogic) {
    const foundationSummary = buildMatchFoundationSummary(project.layers.sixLogic);
    summaries.push({
      layer: "sixLogic",
      title: "Match foundation",
      summary: foundationSummary.split("\n")[0]?.trim() || "SixLogics core data imported",
      digestExcerpt: digestExcerpt(foundationSummary, 600),
    });
  }

  if (project.layers.sport365Commentary) {
    const commentary = project.layers.sport365Commentary;
    summaries.push({
      layer: "sport365Commentary",
      title: "Six Logic commentary",
      summary: sport365CommentarySummary(commentary),
      digestExcerpt: digestExcerpt(commentary.digest),
    });
  }

  if (project.layers.fixtureContext) {
    const ctx = project.layers.fixtureContext;
    summaries.push({
      layer: "fixtureContext",
      title: "Fixtures & H2H",
      summary: fixtureContextSummary(ctx),
      digestExcerpt: digestExcerpt(ctx.digest),
    });
  }

  if (project.layers.leagueTable) {
    const table = project.layers.leagueTable;
    summaries.push({
      layer: "leagueTable",
      title: "League table",
      summary: leagueTableSummary(table),
      digestExcerpt: digestExcerpt(table.digest),
    });
  }

  if (project.layers.leagueSeasonStats) {
    const stats = project.layers.leagueSeasonStats;
    summaries.push({
      layer: "leagueSeasonStats",
      title: "Top scorers & team stats",
      summary: leagueSeasonStatsSummary(stats),
      digestExcerpt: digestExcerpt(stats.digest),
    });
  }

  if (project.layers.loopFeed) {
    const loop = project.layers.loopFeed;
    summaries.push({
      layer: "loopFeed",
      title: "Loop Feed",
      summary: loopFeedSummary(project),
      digestExcerpt: digestExcerpt(loop.digest),
    });
  }

  if (project.layers.optaPlayerData) {
    const opta = project.layers.optaPlayerData;
    summaries.push({
      layer: "optaPlayerData",
      title: "WhoScored",
      summary: `${opta.players.length} players imported`,
      digestExcerpt: digestExcerpt(opta.summaryDigest),
    });
  }

  if (project.layers.manualSources.length > 0) {
    const manualDigest = project.layers.manualSources
      .map((row) => `[${row.source}] ${row.title ?? row.url ?? "notes"}: ${row.excerpt.slice(0, 200)}`)
      .join("\n\n");
    summaries.push({
      layer: "manualSources",
      title: "Manual sources",
      summary: manualSourcesSummary(project),
      digestExcerpt: digestExcerpt(manualDigest),
    });
  }

  if (project.layers.interviews.length > 0) {
    const interviewDigest = project.layers.interviews.map((row) => row.digest).join("\n\n");
    summaries.push({
      layer: "interviews",
      title: "Post-match interviews",
      summary: `${project.layers.interviews.length} YouTube transcript${project.layers.interviews.length === 1 ? "" : "s"} imported`,
      digestExcerpt: digestExcerpt(interviewDigest, 720),
    });
  }

  for (const skipped of project.health.skippedLayers) {
    const title = SKIPPED_LAYER_TITLES[skipped.layer] ?? skipped.layer;
    if (summaries.some((row) => row.layer === skipped.layer || row.title === title)) continue;
    summaries.push({
      layer: skipped.layer,
      title,
      summary: `Skipped — ${skipped.reason}`,
      skipped: true,
    });
  }

  return summaries;
}

export function formatImportLayerSummariesBlock(project: MatchReportProject): string {
  return buildImportLayerSummaries(project)
    .map((row) => {
      const lines = [`${row.title}: ${row.summary}`];
      if (row.digestExcerpt) lines.push(`Context excerpt: ${row.digestExcerpt}`);
      return lines.join("\n");
    })
    .join("\n\n");
}
