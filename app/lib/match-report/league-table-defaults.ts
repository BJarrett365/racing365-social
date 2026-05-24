/** Client-safe defaults — keep free of server-only imports (puppeteer, fs). */

import type { MatchReportProject } from "@/app/lib/match-report/types";
export const WC_GROUP_STAGE_STANDINGS_URL =
  "https://www.sport365.com/football/world-cup/group-stage#/standings";

export function isWorldCupCompetition(competition?: string): boolean {
  return /world cup|fifa world cup/i.test(competition ?? "");
}

export function shouldKeepWorldCupStandingsFresh(project: MatchReportProject): boolean {
  return isWorldCupCompetition(project.competition);
}

export function defaultSport365CompetitionUrl(competition?: string): string {
  if (isWorldCupCompetition(competition)) {
    return "https://www.sport365.com/football/world-cup/group-stage";
  }
  if (/premier league/i.test(competition ?? "")) {
    return "https://www.sport365.com/football/england/premier-league";
  }
  return "https://www.sport365.com/football/england/premier-league";
}

export function defaultLeagueTableUrl(competition?: string): string {
  if (isWorldCupCompetition(competition)) {
    return WC_GROUP_STAGE_STANDINGS_URL;
  }
  return `${defaultSport365CompetitionUrl(competition)}#/standings`;
}

export function defaultTopScorersUrl(competition?: string): string {
  return `${defaultSport365CompetitionUrl(competition)}#/top-scorers`;
}

export function defaultTeamStatsUrl(competition?: string): string {
  return `${defaultSport365CompetitionUrl(competition)}#/team-stats`;
}

export function formatStandingsUpdatedAt(importedAt?: string): string {
  if (!importedAt) return "Not imported yet";
  const date = new Date(importedAt);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
