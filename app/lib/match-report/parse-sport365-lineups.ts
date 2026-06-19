import {
  extractSport365NextDataJson,
  fetchSport365MatchPageHtml,
} from "@/app/lib/match-report/fetch-sport365-match-page";
import { assertSport365MatchUrl } from "@/app/lib/match-report/parse-sport365-commentary";
import {
  inferFormationFromAbsolutePositions,
  resolveTeamStarters,
} from "@/app/lib/team-line-up/formation-layout";
import {
  kitColorsForSlot,
  lookupTeamKitEntry,
  resolveKitConflict,
  sideColorsFromKit,
} from "@/app/lib/team-line-up/kit-database";
import type {
  FootballBenchRow,
  FootballLineupSide,
  FootballLineupStarter,
  TeamLineUpBundle,
  TeamLineUpLineupStatus,
} from "@/types";

type Sport365LineupPlayer = {
  id?: string;
  name?: string;
  pos?: number;
  a_pos?: number;
  j_num?: number;
  kn?: number;
};

type Sport365LineupSide = {
  pos?: number;
  starting?: Sport365LineupPlayer[];
  substitutes?: Sport365LineupPlayer[];
  injured?: Sport365LineupPlayer[];
  suspended?: Sport365LineupPlayer[];
};

export type Sport365LineupImport = {
  matchId: string;
  sourceUrl: string;
  competition: string;
  round?: string;
  matchDate: string;
  kickoff: string;
  lineupStatus: TeamLineUpLineupStatus;
  homeTeam: string;
  awayTeam: string;
  home: FootballLineupSide;
  away: FootballLineupSide;
  bench: TeamLineUpBundle["bench"];
  injuries: TeamLineUpBundle["injuries"];
  homeKitSlot: TeamLineUpBundle["homeKitSlot"];
  awayKitSlot: TeamLineUpBundle["awayKitSlot"];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function formatKickoff(startSec: unknown): string {
  const n = Number(startSec);
  if (!Number.isFinite(n) || n <= 0) return "";
  const d = new Date(n * 1000);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatMatchDate(startSec: unknown): string {
  const n = Number(startSec);
  if (!Number.isFinite(n) || n <= 0) return "";
  const d = new Date(n * 1000);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function mapSide(
  side: Sport365LineupSide,
  teamName: string,
  kitSlot: TeamLineUpBundle["homeKitSlot"],
  ctx: { competition?: string },
): FootballLineupSide {
  const startingRaw = Array.isArray(side.starting) ? side.starting : [];
  const players = startingRaw
    .map((p) => ({
      n: Number(p.j_num) || 0,
      name: asString(p.name),
      pos: Number(p.pos) || 0,
      a_pos: Number(p.a_pos) || 0,
      gk: Number(p.a_pos) === 1 || Number(p.pos) === 11,
    }))
    .filter((p) => p.name);

  const formation = inferFormationFromAbsolutePositions(players.map((p) => p.a_pos));
  const starters: FootballLineupStarter[] = resolveTeamStarters(formation, players);

  const colors = sideColorsFromKit(teamName, kitSlot, ctx);
  return {
    name: teamName,
    shortName: teamName,
    formation,
    ...colors,
    starters,
  };
}

function mapBenchRows(rows: Sport365LineupPlayer[] | undefined): FootballBenchRow[] {
  return (rows ?? [])
    .map((p) => ({
      n: Number(p.j_num) || 0,
      name: asString(p.name),
    }))
    .filter((p) => p.name);
}

function mapIssueRows(rows: Sport365LineupPlayer[] | undefined, label: string) {
  return (rows ?? [])
    .map((p) => ({
      n: Number(p.j_num) || 0,
      name: asString(p.name),
      detail: label,
    }))
    .filter((p) => p.name);
}

export function parseSport365LineupsFromNextData(nextData: unknown, sourceUrl: string): Sport365LineupImport {
  const match = isRecord((nextData as { props?: { pageProps?: { match?: unknown } } })?.props?.pageProps)
    ? ((nextData as { props: { pageProps: { match: Record<string, unknown> } } }).props.pageProps.match)
    : null;
  if (!match) throw new Error("Sport365 match payload missing from page data.");

  const teams = Array.isArray(match.teams) ? match.teams : [];
  const homeMeta = isRecord(teams[0]) ? teams[0] : {};
  const awayMeta = isRecord(teams[1]) ? teams[1] : {};
  const homeTeam = asString(homeMeta.name) || "Home";
  const awayTeam = asString(awayMeta.name) || "Away";

  const lineupArr = Array.isArray(match.lineup) ? (match.lineup as Sport365LineupSide[]) : [];
  const homeSide = lineupArr.find((s) => Number(s.pos) === 0) ?? lineupArr[0] ?? {};
  const awaySide = lineupArr.find((s) => Number(s.pos) === 1) ?? lineupArr[1] ?? {};

  if (!Array.isArray(homeSide.starting) || homeSide.starting.length < 11) {
    throw new Error("Sport365 line-ups not available for this match yet.");
  }

  const { homeSlot, awaySlot } = resolveKitConflict(homeTeam, awayTeam, {
    competition: asString(match.c_name) || asString(match.st_name) || undefined,
  });
  const kitCtx = { competition: asString(match.c_name) || asString(match.st_name) || undefined };
  const home = mapSide(homeSide, homeTeam, homeSlot, kitCtx);
  const away = mapSide(awaySide, awayTeam, awaySlot, kitCtx);

  const statusCode = Number(match.status);
  const lineupStatus: TeamLineUpLineupStatus =
    statusCode >= 6 || Number(match.has_lineups) === 1 ? "confirmed" : "predicted";

  return {
    matchId: asString(match.id) || asString(match.pid),
    sourceUrl,
    competition: asString(match.c_name) || asString(match.st_name) || "Football",
    round: asString(match.round),
    matchDate: formatMatchDate(match.start),
    kickoff: formatKickoff(match.start),
    lineupStatus,
    homeTeam,
    awayTeam,
    home,
    away,
    bench: {
      home: mapBenchRows(homeSide.substitutes),
      away: mapBenchRows(awaySide.substitutes),
    },
    injuries: {
      home: [
        ...mapIssueRows(homeSide.injured, "Injured"),
        ...mapIssueRows(homeSide.suspended, "Suspended"),
      ],
      away: [
        ...mapIssueRows(awaySide.injured, "Injured"),
        ...mapIssueRows(awaySide.suspended, "Suspended"),
      ],
    },
    homeKitSlot: homeSlot,
    awayKitSlot: awaySlot,
  };
}

export async function fetchSport365LineupImport(sourceUrl: string): Promise<Sport365LineupImport> {
  const url = assertSport365MatchUrl(sourceUrl).toString();
  const html = await fetchSport365MatchPageHtml(url);
  const nextData = extractSport365NextDataJson(html);
  if (!nextData) throw new Error("Could not read Sport365 match data.");
  return parseSport365LineupsFromNextData(nextData, url);
}

export function buildTeamLineUpAiCaption(
  home: FootballLineupSide,
  away: FootballLineupSide,
  lineupStatus: TeamLineUpLineupStatus,
  side: "home" | "away" = "home",
): string {
  const team = side === "home" ? home : away;
  const opp = side === "home" ? away : home;
  const label = lineupStatus === "confirmed" ? "Confirmed XI" : "Predicted XI";
  const outfield = team.starters.filter((s) => !s.gk);
  const names = outfield.slice(0, 4).map((s) => s.surname ?? s.name).join(", ");
  const anchor = team.starters.find((s) => !s.gk && (s.y ?? 100) <= 35)?.surname;
  const pivot = team.starters.find((s) => !s.gk && (s.y ?? 0) > 50 && (s.y ?? 0) < 65)?.surname;
  const lines = [
    `${team.name} ${label}`,
    anchor ? `${anchor} leads the line in a ${team.formation} shape.` : `${team.formation} for ${team.name} against ${opp.name}.`,
    pivot ? `${pivot} anchors midfield with ${names}.` : `Key picks include ${names}.`,
    "Do you agree with the selection?",
  ];
  return lines.join("\n\n");
}

/** Debug helper for kit preview. */
export function kitPreview(teamName: string, slot: TeamLineUpBundle["homeKitSlot"]): string {
  return kitColorsForSlot(lookupTeamKitEntry(teamName), slot).shirt;
}
