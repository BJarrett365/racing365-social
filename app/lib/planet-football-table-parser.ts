import type { PlanetFootballTableBundle } from "@/types";

export type PlanetFootballParsedTable = PlanetFootballTableBundle["table"] & { imageUrl?: string };

const SPORT365_HOST_RE = /(^|\.)sport365\.com$/i;
const FOOTBALL365_HOST_RE = /(^|\.)football365\.com$/i;
const DEFAULT_URL = "https://www.sport365.com/football/england/premier-league#/standings";

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(text: string): string {
  return decodeHtml(text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function toInt(raw: unknown): number {
  const n = Number(String(raw ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function cleanTeam(raw: unknown): string {
  if (typeof raw !== "string" && typeof raw !== "number") return "";
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

function nestedString(value: unknown, keys: string[]): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const found = cleanTeam(record[key]);
    if (found) return found;
  }
  return "";
}

function premierLeagueBadgeFromTeamObject(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const team = value as Record<string, unknown>;
  const altIds = team.altIds;
  if (!altIds || typeof altIds !== "object") return undefined;
  const opta = (altIds as Record<string, unknown>).opta;
  if (typeof opta !== "string" || !/^t\d+$/i.test(opta.trim())) return undefined;
  return `https://resources.premierleague.com/premierleague/badges/${opta.trim().toLowerCase()}.png`;
}

export function isValidPlanetFootballTableUrl(raw: string): boolean {
  try {
    const u = new URL(raw || DEFAULT_URL);
    if (SPORT365_HOST_RE.test(u.hostname)) return /^\/football\/[^/]+\/[^/]+\/?$/i.test(u.pathname);
    if (FOOTBALL365_HOST_RE.test(u.hostname)) return /^\/premier-league\/table(?:\/[^/]+)?\/?$/i.test(u.pathname);
    return false;
  } catch {
    return false;
  }
}

function extractCompetition(url: string): string {
  try {
    const u = new URL(url);
    if (FOOTBALL365_HOST_RE.test(u.hostname) && /^\/premier-league\/table(?:\/[^/]+)?\/?$/i.test(u.pathname)) {
      return "Premier League";
    }
    const slug = u.pathname.split("/").filter(Boolean).at(-1) ?? "premier-league";
    return slug.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  } catch {
    return "Premier League";
  }
}

function extractImageUrl(html: string): string | undefined {
  const m =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  return m?.[1]?.trim() || undefined;
}

function normalizeRows(rows: Array<Record<string, unknown>>): PlanetFootballParsedTable["rows"] {
  return rows
    .map((r, idx) => {
      const teamObject = r.team ?? r.competitor ?? r.participant;
      const statObject = r.overall && typeof r.overall === "object" ? (r.overall as Record<string, unknown>) : {};
      const team =
        cleanTeam(r.team) ||
        nestedString(teamObject, ["name", "teamName", "shortName", "displayName"]) ||
        cleanTeam(r.teamName) ||
        cleanTeam(r.name) ||
        cleanTeam(r.club) ||
        cleanTeam(r.participantName);
      return {
        position: toInt(r.position ?? r.rank ?? r.pos ?? idx + 1),
        team,
        logoUrl:
          typeof (r.logoUrl ?? r.logo ?? r.badge ?? r.crest) === "string"
            ? String(r.logoUrl ?? r.logo ?? r.badge ?? r.crest)
            : nestedString(teamObject, ["logo", "badge", "crest", "image"]) || premierLeagueBadgeFromTeamObject(teamObject),
        played: toInt(r.played ?? statObject.played ?? r.playedOverall ?? r.matchesPlayed ?? r.matches ?? r.gamePlayed ?? r.p),
        won: toInt(r.won ?? statObject.won ?? r.wins ?? r.gamesWon ?? r.w),
        drawn: toInt(r.drawn ?? statObject.drawn ?? r.draw ?? r.draws ?? r.gamesEven ?? r.d),
        lost: toInt(r.lost ?? statObject.lost ?? r.losses ?? r.gamesLost ?? r.l),
        pointsDifference: String(
          r.pointsDifference ??
            statObject.pointsDifference ??
            r.goalDifference ??
            statObject.goalsDifference ??
            r.goalsDifference ??
            r.goal_diff ??
            r.ratio ??
            r.gd ??
            r.value ??
            r.total ??
            r.stat ??
            r.count ??
            "",
        ).trim(),
        points: toInt(r.points ?? statObject.points ?? r.pts ?? r.value ?? r.total ?? r.stat ?? r.count),
      };
    })
    .filter((r) => r.team && r.position > 0 && (r.played > 0 || r.points > 0))
    .sort((a, b) => a.position - b.position);
}

export function findPlanetFootballStandingsArrays(value: unknown, out: Array<Array<Record<string, unknown>>> = []): Array<Array<Record<string, unknown>>> {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    const objects = value.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object" && !Array.isArray(x));
    const rows = normalizeRows(objects);
    if (rows.length >= 2) out.push(objects);
    for (const item of objects) findPlanetFootballStandingsArrays(item, out);
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    if (/standing|table|rank|league/i.test(key)) findPlanetFootballStandingsArrays(child, out);
    else if (typeof child === "object") findPlanetFootballStandingsArrays(child, out);
  }
  return out;
}

export function normalizePlanetFootballStandingRows(rows: Array<Record<string, unknown>>): PlanetFootballParsedTable["rows"] {
  return normalizeRows(rows);
}

export function extractPlanetFootballRowsFromUnknown(value: unknown): PlanetFootballParsedTable["rows"] {
  const best = findPlanetFootballStandingsArrays(value)
    .map(normalizeRows)
    .sort((a, b) => b.length - a.length)[0];
  return best ?? [];
}

function parseEmbeddedJsonRows(html: string): PlanetFootballParsedTable["rows"] {
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1] ?? "");
  const candidates: Array<Array<Record<string, unknown>>> = [];
  for (const script of scripts) {
    const trimmed = script.trim();
    if (!trimmed || !/(standing|Premier League|team|played|points)/i.test(trimmed)) continue;
    const jsonBits = [
      trimmed.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1],
      trimmed.startsWith("{") || trimmed.startsWith("[") ? trimmed : undefined,
    ].filter((x): x is string => Boolean(x));
    for (const bit of jsonBits) {
      try {
        findPlanetFootballStandingsArrays(JSON.parse(bit), candidates);
      } catch {
        /* ignore non-JSON scripts */
      }
    }
  }
  const best = candidates.map(normalizeRows).sort((a, b) => b.length - a.length)[0];
  return best ?? [];
}

function parseHtmlTableRows(html: string): PlanetFootballParsedTable["rows"] {
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0] ?? "";
  if (!table) return [];
  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((m) => {
      const cells = [...(m[1] ?? "").matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => stripTags(c[1] ?? ""));
      if (cells.length < 5) return null;
      return {
        position: toInt(cells[0]),
        team: cells[1] ?? "",
        played: toInt(cells[2]),
        won: toInt(cells[3]),
        drawn: toInt(cells[4]),
        lost: toInt(cells[5]),
        pointsDifference: cells.at(-2) ?? "",
        points: toInt(cells.at(-1)),
      };
    })
    .filter((r): r is PlanetFootballParsedTable["rows"][number] => Boolean(r?.team && r.position > 0));
}

export function parsePlanetFootballTable(html: string, sourceUrl: string): PlanetFootballParsedTable {
  const rows = parseEmbeddedJsonRows(html);
  const fallbackRows = rows.length ? rows : parseHtmlTableRows(html);
  if (fallbackRows.length === 0) {
    throw new Error("Could not find Sport365 standings rows in the page data.");
  }
  return {
    source: "Sport365",
    sourceUrl,
    competition: extractCompetition(sourceUrl),
    updatedAt: new Date().toISOString(),
    imageUrl: extractImageUrl(html),
    columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
    rows: fallbackRows,
  };
}
