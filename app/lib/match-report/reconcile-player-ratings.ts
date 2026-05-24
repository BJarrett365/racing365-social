import type { MatchReportProject, PlayerIntelligence, PlayerRatingEntry } from "@/app/lib/match-report/types";
import type { OptaPlayerIntelligence, OptaPlayerProfile } from "@/app/lib/match-report/opta-player-types";

export function normalizePlayerName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeTeamName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function playerNamesMatch(a: string, b: string): boolean {
  const left = normalizePlayerName(a);
  const right = normalizePlayerName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftParts = left.split(" ");
  const rightParts = right.split(" ");
  const leftLast = leftParts[leftParts.length - 1] ?? "";
  const rightLast = rightParts[rightParts.length - 1] ?? "";
  if (leftLast.length >= 4 && leftLast === rightLast) return true;

  return false;
}

export function teamNamesMatch(projectTeam: string, candidate: string): boolean {
  const left = normalizeTeamName(projectTeam);
  const right = normalizeTeamName(candidate);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftToken = left.split(" ").find((part) => part.length >= 4) ?? "";
  const rightToken = right.split(" ").find((part) => part.length >= 4) ?? "";
  return Boolean(leftToken && rightToken && leftToken === rightToken);
}

function lineupNames(project: MatchReportProject, side: "home" | "away"): string[] {
  const lineup = project.layers.sixLogic?.lineups?.[side];
  if (!lineup) return [];
  return [...lineup.starters, ...lineup.substitutes].map((player) => player.name).filter(Boolean);
}

function resolveTeamFromLineups(name: string, project: MatchReportProject): "home" | "away" | null {
  const inHome = lineupNames(project, "home").some((lineupName) => playerNamesMatch(lineupName, name));
  const inAway = lineupNames(project, "away").some((lineupName) => playerNamesMatch(lineupName, name));
  if (inHome && !inAway) return "home";
  if (inAway && !inHome) return "away";
  return null;
}

function resolveTeamFromOpta(name: string, project: MatchReportProject): "home" | "away" | null {
  const players = project.layers.optaPlayerData?.players ?? [];
  const matches = players.filter((player) => playerNamesMatch(player.name, name));
  if (matches.length === 1) return matches[0]!.team;
  return null;
}

function normalizeExplicitTeam(raw: unknown, project: MatchReportProject): "home" | "away" | null {
  if (raw === "home" || raw === "away") return raw;
  if (typeof raw !== "string" || !raw.trim()) return null;
  if (teamNamesMatch(project.homeTeam, raw)) return "home";
  if (teamNamesMatch(project.awayTeam, raw)) return "away";
  return null;
}

export function resolvePlayerTeamSide(
  name: string,
  project: MatchReportProject,
  explicitTeam?: unknown,
): "home" | "away" {
  const fromLineups = resolveTeamFromLineups(name, project);
  if (fromLineups) return fromLineups;

  const fromExplicit = normalizeExplicitTeam(explicitTeam, project);
  if (fromExplicit) return fromExplicit;

  const fromOpta = resolveTeamFromOpta(name, project);
  if (fromOpta) return fromOpta;

  if (explicitTeam === "home" || explicitTeam === "away") return explicitTeam;
  return "home";
}

export function reconcilePlayerRatingEntry(
  entry: PlayerRatingEntry,
  project: MatchReportProject,
): PlayerRatingEntry {
  const team = resolvePlayerTeamSide(entry.name, project, entry.team);
  if (team === entry.team) return entry;
  return { ...entry, team };
}

export function reconcilePlayerRatings(
  project: MatchReportProject,
  ratings: PlayerRatingEntry[],
): PlayerRatingEntry[] {
  return ratings.map((entry) => reconcilePlayerRatingEntry(entry, project));
}

export function reconcilePlayerIntelligence(
  project: MatchReportProject,
  intelligence: PlayerIntelligence,
): PlayerIntelligence {
  return {
    ...intelligence,
    homeTeam: project.homeTeam,
    awayTeam: project.awayTeam,
    ratings: reconcilePlayerRatings(project, intelligence.ratings),
  };
}

function countRosterMatches(roster: string[], players: OptaPlayerProfile[]): number {
  return roster.filter((name) => players.some((player) => playerNamesMatch(player.name, name))).length;
}

function shouldSwapOptaSides(project: MatchReportProject, players: OptaPlayerProfile[]): boolean {
  const homeRoster = lineupNames(project, "home");
  const awayRoster = lineupNames(project, "away");
  if (homeRoster.length < 4 || awayRoster.length < 4) return false;

  const optaHome = players.filter((player) => player.team === "home");
  const optaAway = players.filter((player) => player.team === "away");
  if (optaHome.length === 0 || optaAway.length === 0) return false;

  const normalScore =
    countRosterMatches(homeRoster, optaHome) + countRosterMatches(awayRoster, optaAway);
  const swappedScore =
    countRosterMatches(homeRoster, optaAway) + countRosterMatches(awayRoster, optaHome);

  return swappedScore > normalScore && swappedScore >= 6;
}

function swapOptaSide(team: "home" | "away"): "home" | "away" {
  return team === "home" ? "away" : "home";
}

export function reconcileOptaPlayerData(
  project: MatchReportProject,
  data: OptaPlayerIntelligence,
): OptaPlayerIntelligence {
  let players = data.players.map((player) => ({ ...player }));

  if (shouldSwapOptaSides(project, players)) {
    players = players.map((player) => ({
      ...player,
      team: swapOptaSide(player.team),
      teamName: player.team === "home" ? project.awayTeam : project.homeTeam,
    }));
  }

  players = players.map((player) => {
    const team = resolvePlayerTeamSide(player.name, project, player.team);
    if (team === player.team) return player;
    return {
      ...player,
      team,
      teamName: team === "home" ? project.homeTeam : project.awayTeam,
    };
  });

  return {
    ...data,
    homeTeam: project.homeTeam,
    awayTeam: project.awayTeam,
    players,
  };
}
