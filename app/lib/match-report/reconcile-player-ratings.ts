import type { MatchReportProject, PlayerIntelligence, PlayerRatingEntry, SixLogicPlayer } from "@/app/lib/match-report/types";
import type { OptaPlayerIntelligence, OptaPlayerProfile } from "@/app/lib/match-report/opta-player-types";

const MAX_STARTERS_PER_TEAM = 11;
const MAX_SUBS_PER_TEAM = 9;

export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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
  if (leftParts.length === rightParts.length && leftParts.length > 1) {
    const leftSorted = [...leftParts].sort().join(" ");
    const rightSorted = [...rightParts].sort().join(" ");
    if (leftSorted === rightSorted) return true;
  }

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

type LineupRosterEntry = {
  side: "home" | "away";
  player: SixLogicPlayer;
  isSubstitute: boolean;
  order: number;
};

function lineupRoster(project: MatchReportProject, side: "home" | "away"): LineupRosterEntry[] {
  const lineup = project.layers.sixLogic?.lineups?.[side];
  if (!lineup) return [];
  const starters = lineup.starters.slice(0, MAX_STARTERS_PER_TEAM).map((player, index) => ({
    side,
    player,
    isSubstitute: false,
    order: index,
  }));
  const substitutes = lineup.substitutes.slice(0, MAX_SUBS_PER_TEAM).map((player, index) => ({
    side,
    player,
    isSubstitute: true,
    order: MAX_STARTERS_PER_TEAM + index,
  }));
  return [...starters, ...substitutes].filter((row) => row.player.name.trim());
}

function lineupNames(project: MatchReportProject, side: "home" | "away"): string[] {
  return lineupRoster(project, side).map((row) => row.player.name);
}

function authoritativeLineupsAvailable(project: MatchReportProject): boolean {
  return lineupRoster(project, "home").length > 0 || lineupRoster(project, "away").length > 0;
}

function findLineupRosterEntry(name: string, project: MatchReportProject): LineupRosterEntry | null {
  const roster = [...lineupRoster(project, "home"), ...lineupRoster(project, "away")];
  const normalised = normalizePlayerName(name);
  const exactMatches = roster.filter((row) => normalizePlayerName(row.player.name) === normalised);
  if (exactMatches.length === 1) return exactMatches[0]!;

  const matches = roster.filter((row) => playerNamesMatch(row.player.name, name));
  return matches.length === 1 ? matches[0]! : null;
}

function resolveTeamFromLineups(name: string, project: MatchReportProject): "home" | "away" | null {
  return findLineupRosterEntry(name, project)?.side ?? null;
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
  const lineupEntry = findLineupRosterEntry(entry.name, project);
  if (lineupEntry) {
    return {
      ...entry,
      name: lineupEntry.player.name,
      team: lineupEntry.side,
      position: lineupEntry.player.position ?? entry.position,
      isSubstitute: lineupEntry.isSubstitute || undefined,
    };
  }

  const team = resolvePlayerTeamSide(entry.name, project, entry.team);
  if (team === entry.team) return entry;
  return { ...entry, team };
}

function dedupeRatingsByPlayer(entries: PlayerRatingEntry[]): PlayerRatingEntry[] {
  const byPlayer = new Map<string, PlayerRatingEntry>();
  for (const entry of entries) {
    const key = `${entry.team}:${normalizePlayerName(entry.name)}`;
    const existing = byPlayer.get(key);
    if (!existing || entry.rating > existing.rating) byPlayer.set(key, entry);
  }
  return [...byPlayer.values()];
}

function enforceSixLogicRosterCaps(project: MatchReportProject, ratings: PlayerRatingEntry[]): PlayerRatingEntry[] {
  if (!authoritativeLineupsAvailable(project)) return dedupeRatingsByPlayer(ratings);

  const byPlayer = new Map<string, PlayerRatingEntry>();
  for (const entry of dedupeRatingsByPlayer(ratings)) {
    byPlayer.set(`${entry.team}:${normalizePlayerName(entry.name)}`, entry);
  }

  const out: PlayerRatingEntry[] = [];
  for (const side of ["home", "away"] as const) {
    for (const rosterEntry of lineupRoster(project, side)) {
      const key = `${side}:${normalizePlayerName(rosterEntry.player.name)}`;
      const rating = byPlayer.get(key);
      if (!rating) continue;
      out.push({
        ...rating,
        name: rosterEntry.player.name,
        team: side,
        position: rosterEntry.player.position ?? rating.position,
        isSubstitute: rosterEntry.isSubstitute || undefined,
      });
    }
  }
  return out;
}

export function reconcilePlayerRatings(
  project: MatchReportProject,
  ratings: PlayerRatingEntry[],
): PlayerRatingEntry[] {
  const reconciled = ratings
    .map((entry) => {
      const lineupEntry = findLineupRosterEntry(entry.name, project);
      if (!lineupEntry && authoritativeLineupsAvailable(project)) return null;
      return reconcilePlayerRatingEntry(entry, project);
    })
    .filter((entry): entry is PlayerRatingEntry => Boolean(entry));
  return enforceSixLogicRosterCaps(project, reconciled);
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

  players = players
    .map((player) => {
      const lineupEntry = findLineupRosterEntry(player.name, project);
      if (lineupEntry) {
        return {
          ...player,
          name: lineupEntry.player.name,
          team: lineupEntry.side,
          teamName: lineupEntry.side === "home" ? project.homeTeam : project.awayTeam,
          position: lineupEntry.player.position ?? player.position,
          isSubstitute: lineupEntry.isSubstitute || undefined,
        };
      }
      if (authoritativeLineupsAvailable(project)) return null;
      const team = resolvePlayerTeamSide(player.name, project, player.team);
      if (team === player.team) return player;
      return {
        ...player,
        team,
        teamName: team === "home" ? project.homeTeam : project.awayTeam,
      };
    })
    .filter((player): player is OptaPlayerProfile => Boolean(player));

  const capped = enforceSixLogicRosterCaps(
    project,
    players.map((player) => ({
      name: player.name,
      team: player.team,
      rating: player.summary.rating ?? 0,
      justification: player.statSummary ?? "",
      position: player.position,
      isSubstitute: player.isSubstitute,
    })),
  );
  const allowedKeys = new Set(capped.map((player) => `${player.team}:${normalizePlayerName(player.name)}`));

  players = players.filter((player) => allowedKeys.has(`${player.team}:${normalizePlayerName(player.name)}`));

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
