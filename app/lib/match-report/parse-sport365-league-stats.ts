import {
  fetchSport365Json,
  resolveSport365StageRef,
  type Sport365StageRef,
} from "@/app/lib/match-report/fetch-sport365-competition-page";
import type { LeagueSeasonStatsIntelligence, SixLogicEvent, TopScorerSnapshot, TeamSeasonStatsSnapshot } from "@/app/lib/match-report/types";

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fc|afc|utd|united|city|hotspur|wanderers|albion)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function teamMatches(rowTeam: string, target: string): boolean {
  return namesMatch(rowTeam, target);
}

function playerMatches(scorerName: string, eventName: string): boolean {
  const a = scorerName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const b = eventName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const aParts = a.split(/\s+/);
  const bParts = b.split(/\s+/);
  const aLast = aParts.at(-1);
  const bLast = bParts.at(-1);
  return Boolean(aLast && bLast && aLast === bLast && aParts.length > 1 && bParts.length > 1);
}

type RawTopScorer = {
  ranking?: number;
  goals?: unknown;
  penalties?: unknown;
  participant_name?: string;
  team?: { name?: string };
};

type RawTeamStats = Record<string, unknown>;

type RawParticipant = {
  name?: string;
  team_stats?: RawTeamStats;
};

type StagePayload = {
  T?: RawTopScorer[];
};

type TeamStatsPayload = {
  participants_stats?: RawParticipant[];
};

function mapTopScorer(row: RawTopScorer, homeTeam: string, awayTeam: string): TopScorerSnapshot | null {
  const playerName = row.participant_name?.trim();
  const team = row.team?.name?.trim();
  if (!playerName || !team) return null;
  return {
    rank: asNumber(row.ranking),
    playerName,
    team,
    goals: asNumber(row.goals),
    penalties: asNumber(row.penalties),
    highlighted: teamMatches(team, homeTeam) || teamMatches(team, awayTeam),
  };
}

function mapTeamStats(row: RawParticipant): TeamSeasonStatsSnapshot | null {
  const team = row.name?.trim();
  const stats = row.team_stats;
  if (!team || !stats) return null;
  return {
    team,
    played: asNumber(stats.total_games),
    goalsScored: asNumber(stats.total_goals),
    goalsConceded: asNumber(stats.conceded),
    cleanSheets: asNumber(stats.total_clean_sheets),
    penaltyGoals: asNumber(stats.penalty_goals),
    gamesWithoutGoal: asNumber(stats.total_games_without_goal),
    yellowCards: asNumber(stats.yellow),
    avgYellowCardsPerGame: asNumber(stats.yellow_cards_per_game),
    wonFirstHalf: asNumber(stats.won_first_half),
    wonSecondHalf: asNumber(stats.won_second_half),
    wonAtHome: asNumber(stats.won_at_home),
    wonAtAway: asNumber(stats.won_at_away),
    awayWithoutWin: asNumber(stats.away_without_win),
    bothTeamsScored: asNumber(stats.both_to_score),
    firstHalfLossFullTimeWin: asNumber(stats.comebacks),
    firstHalfWinFullTimeLoss: asNumber(stats.lost_lead_to_lose),
    boreDraws: asNumber(stats.boreDraws),
    goalsPerGame: asNumber(stats.goals_ratio),
    minutesPerGoalScored: asNumber(stats.time_between_goals_scored),
    minutesPerGoalConceded: asNumber(stats.time_between_goals_scored_conceded),
  };
}

function extractMatchGoalscorers(events: SixLogicEvent[]): string[] {
  const names: string[] = [];
  for (const event of events) {
    const type = event.type.toLowerCase();
    if (!/goal|pen/i.test(type)) continue;
    const name = event.playerName?.trim();
    if (name && !names.some((row) => playerMatches(row, name))) names.push(name);
  }
  return names;
}

function buildGoalscorerContextLines(
  matchScorers: string[],
  topScorers: TopScorerSnapshot[],
  homeTeam: string,
  awayTeam: string,
): string[] {
  if (matchScorers.length === 0) return [];
  const lines: string[] = [];
  for (const scorer of matchScorers) {
    const seasonRow =
      topScorers.find((row) => playerMatches(row.playerName, scorer)) ??
      topScorers.find((row) => normalizeName(row.playerName).includes(normalizeName(scorer)));
    if (!seasonRow) {
      lines.push(`${scorer} — no season scoring row matched in Sport365 top scorers.`);
      continue;
    }
    const teamTop = topScorers
      .filter((row) => teamMatches(row.team, seasonRow.team))
      .sort((a, b) => a.rank - b.rank);
    const teamRank = teamTop.findIndex((row) => playerMatches(row.playerName, seasonRow.playerName)) + 1;
    const leagueRankLabel = `${seasonRow.rank}${ordinal(seasonRow.rank)} in PL scoring`;
    const teamLabel =
      teamRank === 1
        ? `top scorer for ${seasonRow.team}`
        : teamRank > 0
          ? `${teamRank}${ordinal(teamRank)} top scorer for ${seasonRow.team}`
          : `scorer for ${seasonRow.team}`;
    const penLabel =
      seasonRow.penalties > 0
        ? `${seasonRow.penalties} pen${seasonRow.penalties === 1 ? "" : "s"}`
        : "no pens";
    lines.push(
      `${scorer} — ${seasonRow.goals} PL goal${seasonRow.goals === 1 ? "" : "s"} this season (${penLabel}); ${leagueRankLabel}; ${teamLabel}.`,
    );
  }
  if (lines.length === 0) return lines;
  const homeTop = topScorers.filter((row) => teamMatches(row.team, homeTeam)).slice(0, 3);
  const awayTop = topScorers.filter((row) => teamMatches(row.team, awayTeam)).slice(0, 3);
  if (homeTop.length) {
    lines.push(
      `${homeTeam} season scorers: ${homeTop.map((row) => `${row.playerName} (${row.goals}${row.penalties ? `, ${row.penalties}p` : ""})`).join(", ")}.`,
    );
  }
  if (awayTop.length) {
    lines.push(
      `${awayTeam} season scorers: ${awayTop.map((row) => `${row.playerName} (${row.goals}${row.penalties ? `, ${row.penalties}p` : ""})`).join(", ")}.`,
    );
  }
  return lines;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  if (n % 10 === 1) return "st";
  if (n % 10 === 2) return "nd";
  if (n % 10 === 3) return "rd";
  return "th";
}

function formatTeamStatsBlock(label: string, stats: TeamSeasonStatsSnapshot): string[] {
  return [
    `${label} (${stats.team})`,
    `Played ${stats.played} · Scored ${stats.goalsScored} (avg ${stats.goalsPerGame.toFixed(2)}/game) · Conceded ${stats.goalsConceded} · Clean sheets ${stats.cleanSheets}`,
    `Penalties scored ${stats.penaltyGoals} · Games without scoring ${stats.gamesWithoutGoal} · Yellow cards ${stats.yellowCards} (${stats.avgYellowCardsPerGame.toFixed(2)}/game)`,
    `1H wins ${stats.wonFirstHalf} · 2H wins ${stats.wonSecondHalf} · Home wins ${stats.wonAtHome} · Away wins ${stats.wonAtAway} · Away without win ${stats.awayWithoutWin}`,
    `BTTS ${stats.bothTeamsScored} · 0-0 ${stats.boreDraws} · 1H loss/FT win ${stats.firstHalfLossFullTimeWin} · 1H win/FT loss ${stats.firstHalfWinFullTimeLoss}`,
    `Mins/goal scored ${stats.minutesPerGoalScored} · Mins/goal conceded ${stats.minutesPerGoalConceded}`,
  ];
}

function buildLeagueSeasonStatsDigest(input: {
  stage: Sport365StageRef;
  topScorers: TopScorerSnapshot[];
  teamStats: TeamSeasonStatsSnapshot[];
  homeTeamStats?: TeamSeasonStatsSnapshot;
  awayTeamStats?: TeamSeasonStatsSnapshot;
  matchGoalscorerContext: string[];
}): string {
  const header = `${input.stage.competition} season stats · Sport365 (${input.stage.sourceUrl})`;
  const topLines = input.topScorers.slice(0, 15).map((row) => {
    const tag = row.highlighted ? " *" : "";
    const pens = row.penalties > 0 ? ` (${row.penalties} pen${row.penalties === 1 ? "" : "s"})` : "";
    return `${row.rank}. ${row.playerName} (${row.team}) — ${row.goals} goal${row.goals === 1 ? "" : "s"}${pens}${tag}`;
  });
  const blocks: string[] = [header, "", "Top scorers", ...topLines];
  if (input.matchGoalscorerContext.length) {
    blocks.push("", "Match goalscorer season context", ...input.matchGoalscorerContext);
  }
  if (input.homeTeamStats) {
    blocks.push("", ...formatTeamStatsBlock("Home team stats", input.homeTeamStats));
  }
  if (input.awayTeamStats) {
    blocks.push("", ...formatTeamStatsBlock("Away team stats", input.awayTeamStats));
  }
  return blocks.join("\n");
}

export async function parseMatchReportLeagueSeasonStats(input: {
  sourceUrl: string;
  homeTeam: string;
  awayTeam: string;
  matchEvents?: SixLogicEvent[];
}): Promise<LeagueSeasonStatsIntelligence> {
  const stage = await resolveSport365StageRef(input.sourceUrl);
  const [stagePayload, teamPayload] = await Promise.all([
    fetchSport365Json<StagePayload>(`/v1/en/stage/soccer/${stage.stageId}`),
    fetchSport365Json<TeamStatsPayload>(`/v1/en/stage/part/stats/soccer/${stage.stageId}`),
  ]);

  const topScorers = (stagePayload.T ?? [])
    .map((row) => mapTopScorer(row, input.homeTeam, input.awayTeam))
    .filter((row): row is TopScorerSnapshot => Boolean(row))
    .sort((a, b) => a.rank - b.rank);

  const teamStats = (teamPayload.participants_stats ?? [])
    .map(mapTeamStats)
    .filter((row): row is TeamSeasonStatsSnapshot => Boolean(row))
    .sort((a, b) => b.goalsScored - a.goalsScored);

  const homeTeamStats = teamStats.find((row) => teamMatches(row.team, input.homeTeam));
  const awayTeamStats = teamStats.find((row) => teamMatches(row.team, input.awayTeam));
  const matchScorers = extractMatchGoalscorers(input.matchEvents ?? []);
  const matchGoalscorerContext = buildGoalscorerContextLines(
    matchScorers,
    topScorers,
    input.homeTeam,
    input.awayTeam,
  );

  const intelligence: LeagueSeasonStatsIntelligence = {
    sourceUrl: input.sourceUrl.trim(),
    stageId: stage.stageId,
    competition: stage.competition,
    topScorers,
    teamStats,
    homeTeamStats,
    awayTeamStats,
    matchGoalscorerContext,
    digest: "",
    importedAt: new Date().toISOString(),
  };
  intelligence.digest = buildLeagueSeasonStatsDigest({
    stage,
    topScorers,
    teamStats,
    homeTeamStats,
    awayTeamStats,
    matchGoalscorerContext,
  });
  return intelligence;
}
