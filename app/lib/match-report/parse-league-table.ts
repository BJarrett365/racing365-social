import "server-only";

import { defaultLeagueTableUrl } from "@/app/lib/match-report/league-table-defaults";
import { importPlanetFootballTableFromUrl } from "@/app/lib/planet-football-table-import";
import {
  isWorldCupGroupStageImport,
  parseSport365GroupStandings,
} from "@/app/lib/match-report/parse-sport365-group-standings";
import type { LeagueTableIntelligence } from "@/app/lib/match-report/types";

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bfc\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function teamMatches(rowTeam: string, target: string): boolean {
  const a = normalizeTeamName(rowTeam);
  const b = normalizeTeamName(target);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function tableStakes(position: number, totalTeams = 20): string {
  if (position <= 0) return "";
  if (position <= 4) return "Champions League zone";
  if (position === 5) return "Europa League zone";
  if (position >= totalTeams - 2) return "Relegation zone";
  return "Mid-table";
}

function buildLeagueTableDigest(table: LeagueTableIntelligence): string {
  if (table.format === "group_stage") {
    return table.digest;
  }
  const header = `${table.competition} standings${table.tableView ? ` (${table.tableView})` : ""}${table.source ? ` · ${table.source}` : ""}`;
  const matchLines: string[] = [];
  if (table.homeTeamRow) {
    matchLines.push(
      `Home: ${table.homeTeamRow.team} — ${table.homeTeamRow.position}${ordinal(table.homeTeamRow.position)} · ${table.homeTeamRow.points} pts${table.homeStakes ? ` · ${table.homeStakes}` : ""}`,
    );
  }
  if (table.awayTeamRow) {
    matchLines.push(
      `Away: ${table.awayTeamRow.team} — ${table.awayTeamRow.position}${ordinal(table.awayTeamRow.position)} · ${table.awayTeamRow.points} pts${table.awayStakes ? ` · ${table.awayStakes}` : ""}`,
    );
  }
  const top = table.rows.slice(0, 12).map((row) => {
    const tag = row.highlighted ? " *" : "";
    return `${row.position}. ${row.team} — ${row.points} pts (P${row.played} W${row.won} D${row.drawn} L${row.lost})${tag}`;
  });
  return [header, ...matchLines, ...top].filter(Boolean).join("\n");
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  if (n % 10 === 1) return "st";
  if (n % 10 === 2) return "nd";
  if (n % 10 === 3) return "rd";
  return "th";
}

export async function parseMatchReportLeagueTable(
  sourceUrl: string,
  homeTeam: string,
  awayTeam: string,
  tableView?: string,
  competition?: string,
): Promise<LeagueTableIntelligence> {
  if (isWorldCupGroupStageImport(sourceUrl, competition)) {
    return parseSport365GroupStandings({ sourceUrl, homeTeam, awayTeam });
  }

  const parsed = await importPlanetFootballTableFromUrl(sourceUrl, tableView);
  const rows = parsed.rows.map((row) => ({
    position: row.position,
    team: row.team,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    pointsDifference: row.pointsDifference,
    points: row.points,
    highlighted: teamMatches(row.team, homeTeam) || teamMatches(row.team, awayTeam),
  }));
  const homeTeamRow = rows.find((row) => teamMatches(row.team, homeTeam));
  const awayTeamRow = rows.find((row) => teamMatches(row.team, awayTeam));
  const totalTeams = rows.length || 20;
  const table: LeagueTableIntelligence = {
    sourceUrl: parsed.sourceUrl,
    source: parsed.sourceUrl.includes("sport365.com") ? "Sport365" : "Football365",
    competition: parsed.competition,
    format: "league",
    tableView,
    rows,
    homeTeamRow,
    awayTeamRow,
    homeStakes: homeTeamRow ? tableStakes(homeTeamRow.position, totalTeams) : undefined,
    awayStakes: awayTeamRow ? tableStakes(awayTeamRow.position, totalTeams) : undefined,
    digest: "",
    importedAt: new Date().toISOString(),
  };
  table.digest = buildLeagueTableDigest(table);
  return table;
}
