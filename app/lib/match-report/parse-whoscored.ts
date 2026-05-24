import type { WhoScoredCapturedJson } from "@/app/lib/match-report/fetch-whoscored-page";
import type { OptaPlayerIntelligence, OptaPlayerProfile } from "@/app/lib/match-report/opta-player-types";

const WHOSCORED_HOST_RE = /(^|\.)whoscored\.com$/i;

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/** Normalise match / livestatistics URLs to the import target page. */
export function resolveWhoScoredImportUrl(input: string): string {
  const u = new URL(input.trim());
  if (u.protocol !== "https:") throw new Error("WhoScored URL must use https.");
  if (!WHOSCORED_HOST_RE.test(u.hostname)) throw new Error("Only whoscored.com URLs are allowed.");

  const matchId = u.pathname.match(/\/matches\/(\d+)\//i)?.[1];
  if (!matchId) {
    throw new Error(
      "Paste a WhoScored match URL such as https://www.whoscored.com/matches/1903453/livestatistics/…",
    );
  }

  const slug = u.pathname.match(/\/(?:livestatistics|show)\/([^/?#]+)/i)?.[1]?.replace(/\/+$/, "") ?? "";
  u.hostname = "www.whoscored.com";
  u.pathname = slug ? `/matches/${matchId}/livestatistics/${slug}` : `/matches/${matchId}/livestatistics`;
  u.search = "";
  u.hash = "";
  return u.toString();
}

/** @deprecated use resolveWhoScoredImportUrl */
export function assertWhoScoredLiveStatsUrl(input: string): URL {
  return new URL(resolveWhoScoredImportUrl(input));
}

export function extractWhoScoredMatchId(url: string): string {
  const m = new URL(url).pathname.match(/\/matches\/(\d+)\//i);
  if (!m?.[1]) throw new Error("Could not extract WhoScored match id.");
  return m[1];
}

function extractEmbeddedJson(html: string, extraBlobs: unknown[] = []): unknown[] {
  const blobs: unknown[] = [...extraBlobs];
  const next = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (next?.[1]) {
    try {
      blobs.push(JSON.parse(next[1]) as unknown);
    } catch {
      /* ignore */
    }
  }
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = m[1] ?? "";
    if (!body.includes("rating") && !body.includes("playerStatistics")) continue;
    const jsonMatch = body.match(/\{[\s\S]{200,}\}/);
    if (!jsonMatch) continue;
    try {
      blobs.push(JSON.parse(jsonMatch[0]) as unknown);
    } catch {
      /* ignore */
    }
  }
  return blobs;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function normalisePlayer(row: Record<string, unknown>, team: "home" | "away", teamName: string): OptaPlayerProfile | null {
  const name =
    asString(row.name) ??
    asString(row.playerName) ??
    [asString(row.firstName), asString(row.lastName)].filter(Boolean).join(" ");
  if (!name) return null;
  const summary = {
    rating: asNumber(row.rating ?? row.Rating ?? row.score),
    goals: asNumber(row.goals ?? row.Goals),
    assists: asNumber(row.assists ?? row.Assists),
    minutes: asNumber(row.minutes ?? row.Minutes ?? row.minutesPlayed),
  };
  const offensive = {
    shots: asNumber(row.shots ?? row.Shots),
    xG: asNumber(row.xg ?? row.xG),
    xA: asNumber(row.xa ?? row.xA),
    keyPasses: asNumber(row.keyPasses ?? row.keyPass),
    dribbles: asNumber(row.dribbles),
  };
  const defensive = {
    tackles: asNumber(row.tackles),
    interceptions: asNumber(row.interceptions),
    clearances: asNumber(row.clearances),
    duelsWon: asNumber(row.duelsWon ?? row.aerialWon),
    cards: asNumber(row.cards ?? row.yellowCards),
  };
  const passing = {
    passes: asNumber(row.passes),
    passAccuracy: asNumber(row.passAccuracy ?? row.passSuccess),
    longBalls: asNumber(row.longBalls),
    crosses: asNumber(row.crosses),
    throughBalls: asNumber(row.throughBalls),
  };
  const statParts = [
    summary.rating !== undefined ? `Rating ${summary.rating}` : null,
    summary.goals !== undefined ? `${summary.goals}G` : null,
    offensive.xG !== undefined ? `xG ${offensive.xG}` : null,
    defensive.tackles !== undefined ? `${defensive.tackles} tackles` : null,
  ].filter(Boolean);
  return {
    name,
    team,
    teamName,
    position: asString(row.position ?? row.Position),
    shirtNumber: asNumber(row.shirtNumber ?? row.number),
    minutes: summary.minutes,
    isSubstitute: Boolean(row.isSubstitute ?? row.sub),
    isManOfTheMatch: Boolean(row.isManOfTheMatch ?? row.manOfTheMatch),
    summary,
    offensive,
    defensive,
    passing,
    statSummary: statParts.join(" · "),
  };
}

function collectPlayers(obj: unknown, homeName: string, awayName: string): OptaPlayerProfile[] {
  const out: OptaPlayerProfile[] = [];
  const walk = (val: unknown, depth = 0) => {
    if (depth > 14 || out.length >= 40) return;
    if (!val || typeof val !== "object") return;
    if (Array.isArray(val)) {
      for (const item of val) walk(item, depth + 1);
      return;
    }
    const row = val as Record<string, unknown>;
    const hasRating = row.rating !== undefined || row.Rating !== undefined || row.score !== undefined;
    const hasName = row.name || row.playerName || row.firstName;
    if (hasRating && hasName && typeof row === "object") {
      const teamHint = asString(row.team)?.toLowerCase() ?? asString(row.side)?.toLowerCase() ?? "";
      const team: "home" | "away" = teamHint.includes("away") || teamHint === "2" ? "away" : "home";
      const parsed = normalisePlayer(row, team, team === "home" ? homeName : awayName);
      if (parsed && parsed.summary.rating !== undefined) out.push(parsed);
    }
    for (const value of Object.values(row)) walk(value, depth + 1);
  };
  walk(obj);
  return out;
}

function buildPlayerStatSummary(player: OptaPlayerProfile): string {
  const parts = [
    player.summary.rating !== undefined ? `Rating ${player.summary.rating}` : null,
    player.summary.goals ? `${player.summary.goals}G` : null,
    player.summary.assists ? `${player.summary.assists}A` : null,
    player.offensive.shots !== undefined && player.offensive.shots > 0 ? `${player.offensive.shots} shots` : null,
    player.offensive.xG !== undefined && player.offensive.xG > 0 ? `xG ${player.offensive.xG}` : null,
    player.defensive.tackles !== undefined && player.defensive.tackles > 0 ? `${player.defensive.tackles} tackles` : null,
    player.passing.passes !== undefined && player.passing.passes > 0 ? `${player.passing.passes} passes` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function resolveFeedTeamSides(captures: WhoScoredCapturedJson[]): Map<string, "home" | "away"> {
  const sides = new Map<string, "home" | "away">();
  const summaryFeeds = captures.filter(
    (cap) => cap.url.includes("getmatchcentreplayerstatistics") && cap.url.includes("category=summary"),
  );
  summaryFeeds.forEach((cap, index) => {
    const teamId = cap.url.match(/teamIds=(\d+)/i)?.[1];
    if (teamId) sides.set(teamId, index === 0 ? "home" : "away");
  });
  return sides;
}

function playerFromFeedRow(
  row: Record<string, unknown>,
  team: "home" | "away",
  teamName: string,
): OptaPlayerProfile | null {
  const name = asString(row.name);
  if (!name) return null;
  const rating = asNumber(row.rating);
  if (rating === undefined || rating <= 0) return null;

  const summary = {
    rating,
    goals: asNumber(row.goal ?? row.goalTotal ?? row.goals),
    assists: asNumber(row.assistTotal ?? row.assist),
    minutes: asNumber(row.minutesPlayed ?? row.minsPlayed ?? row.timeOnPitch ?? row.playedMinutes),
  };
  const offensive = {
    shots: asNumber(row.shotsTotal),
    xG: asNumber(row.expectedGoals ?? row.xg ?? row.xG),
    xA: asNumber(row.expectedAssists ?? row.xa ?? row.xA),
    keyPasses: asNumber(row.keyPassTotal ?? row.keyPassesTotal),
    dribbles: asNumber(row.dribbleWon ?? row.dribbleTotal),
  };
  const defensive = {
    tackles: asNumber(row.tackleWon ?? row.tackleTotal ?? row.tackleTotalAttempted),
    interceptions: asNumber(row.interceptionAll ?? row.interceptionWon),
    clearances: asNumber(row.clearanceTotal ?? row.clearanceEffective),
    duelsWon: asNumber(row.duelAerialWon),
    cards: (() => {
      const yellow = asNumber(row.yellowCard) ?? 0;
      const red = asNumber(row.redCard) ?? 0;
      const total = yellow + red;
      return total > 0 ? total : undefined;
    })(),
  };
  const passing = {
    passes: asNumber(row.totalPasses ?? row.passTotal ?? row.touches),
    passAccuracy: asNumber(row.passSuccessInMatch ?? row.passSuccess),
    longBalls: asNumber(row.passLongBallTotal),
    crosses: asNumber(row.passCrossTotal),
    throughBalls: asNumber(row.passThroughBallTotal),
  };

  const profile: OptaPlayerProfile = {
    name,
    team,
    teamName,
    position: asString(row.playedPositionsShort ?? row.position),
    shirtNumber: asNumber(row.shirtNumber ?? row.number),
    minutes: summary.minutes,
    isSubstitute: Boolean(row.subOn) || asString(row.playedPositionsShort)?.toLowerCase() === "sub",
    isManOfTheMatch: Boolean(row.isManOfTheMatch ?? row.manOfTheMatch),
    summary,
    offensive,
    defensive,
    passing,
  };
  profile.statSummary = buildPlayerStatSummary(profile);
  return profile;
}

function parseStatisticsFeedCaptures(
  captures: WhoScoredCapturedJson[],
  homeTeam: string,
  awayTeam: string,
): OptaPlayerProfile[] {
  const teamSides = resolveFeedTeamSides(captures);
  const players: OptaPlayerProfile[] = [];
  const summaryCaptures = captures.filter(
    (cap) => cap.url.includes("getmatchcentreplayerstatistics") && cap.url.includes("category=summary"),
  );

  summaryCaptures.forEach((capture, index) => {
    const payload = capture.data as { playerTableStats?: Record<string, unknown>[] };
    if (!Array.isArray(payload.playerTableStats)) return;

    const teamId = capture.url.match(/teamIds=(\d+)/i)?.[1] ?? "";
    const team = teamSides.get(teamId) ?? (index === 0 ? "home" : "away");
    const teamName = team === "home" ? homeTeam : awayTeam;

    for (const row of payload.playerTableStats) {
      const parsed = playerFromFeedRow(row, team, teamName);
      if (parsed) players.push(parsed);
    }
  });

  return players;
}

function mergePlayerProfiles(base: OptaPlayerProfile, incoming: OptaPlayerProfile): OptaPlayerProfile {
  const merged: OptaPlayerProfile = {
    ...base,
    ...incoming,
    summary: { ...base.summary, ...incoming.summary },
    offensive: { ...base.offensive, ...incoming.offensive },
    defensive: { ...base.defensive, ...incoming.defensive },
    passing: { ...base.passing, ...incoming.passing },
    isManOfTheMatch: base.isManOfTheMatch || incoming.isManOfTheMatch,
    isSubstitute: base.isSubstitute || incoming.isSubstitute,
  };
  merged.statSummary = buildPlayerStatSummary(merged);
  return merged;
}

function mergePlayersByName(players: OptaPlayerProfile[]): OptaPlayerProfile[] {
  const byKey = new Map<string, OptaPlayerProfile>();
  for (const player of players) {
    const key = `${player.team}:${player.name.toLowerCase()}`;
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergePlayerProfiles(existing, player) : player);
  }
  return [...byKey.values()];
}

function buildOptaDigest(players: OptaPlayerProfile[], motm?: string): string {
  const top = [...players]
    .filter((p) => p.summary.rating !== undefined)
    .sort((a, b) => (b.summary.rating ?? 0) - (a.summary.rating ?? 0))
    .slice(0, 16);
  const lines = top.map(
    (p) =>
      `${p.teamName}: ${p.name} (${p.position ?? "?"}) — ${p.summary.rating}/10${p.statSummary ? ` — ${p.statSummary}` : ""}`,
  );
  if (motm) lines.unshift(`MOTM: ${motm}`);
  return lines.join("\n");
}

function statCellValue(rowHtml: string, statClass: string): number | undefined {
  const m = rowHtml.match(new RegExp(`<td class="${statClass}[^"]*">\\s*([\\d.]+)`, "i"));
  if (!m?.[1]) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

function extractSummaryTableRows(html: string, side: "home" | "away"): string[] {
  const marker = `id="statistics-table-${side}-summary"`;
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const tbodyStart = html.indexOf('<tbody id="player-table-statistics-body">', start);
  if (tbodyStart < 0) return [];
  const tbodyEnd = html.indexOf("</tbody>", tbodyStart);
  if (tbodyEnd < 0) return [];
  return html.slice(tbodyStart, tbodyEnd).match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
}

function parseSummaryTableRow(
  rowHtml: string,
  team: "home" | "away",
  teamName: string,
): OptaPlayerProfile | null {
  const name =
    rowHtml.match(/class="player-link"[^>]*>[\s\S]*?<span class="iconize[^"]*">([^<]+)/i)?.[1]?.trim() ??
    rowHtml.match(/class="player-link[^"]*"[^>]*>([^<]+)/i)?.[1]?.trim();
  if (!name) return null;

  const position = rowHtml
    .match(/class="player-meta-data"[^>]*>\d+<\/span><span class="player-meta-data">\s*,\s*([^<]+?)<\/span>/i)?.[1]
    ?.trim();
  const ratingRaw = rowHtml.match(/<td class="rating[^"]*">\s*([\d.]+|-)\s*<\/td>/i)?.[1];
  const rating = ratingRaw && ratingRaw !== "-" ? Number(ratingRaw) : undefined;
  if (rating === undefined || !Number.isFinite(rating)) return null;

  const shirtNumber = Number(rowHtml.match(/class="player-meta-data"[^>]*>(\d+)<\/span>/i)?.[1]);
  const shots = statCellValue(rowHtml, "ShotsTotal");
  const shotsOnTarget = statCellValue(rowHtml, "ShotOnTarget");
  const keyPasses = statCellValue(rowHtml, "KeyPassTotal");
  const passAccuracy = statCellValue(rowHtml, "PassSuccessInMatch");
  const duelsWon = statCellValue(rowHtml, "DuelAerialWon");
  const touches = statCellValue(rowHtml, "Touches");
  const isSubstitute = /,\s*Sub\s*/i.test(rowHtml) || /subon|suboff/i.test(rowHtml);
  const isManOfTheMatch = /data-mom=["'][^"']+["']/i.test(rowHtml);

  const profile: OptaPlayerProfile = {
    name,
    team,
    teamName,
    position,
    shirtNumber: Number.isFinite(shirtNumber) ? shirtNumber : undefined,
    isSubstitute,
    isManOfTheMatch,
    summary: { rating },
    offensive: { shots, keyPasses },
    defensive: { duelsWon },
    passing: { passAccuracy, passes: touches },
  };
  profile.statSummary = buildPlayerStatSummary(profile);
  return profile;
}

function parseWhoScoredSummaryTables(
  html: string,
  homeTeam: string,
  awayTeam: string,
): OptaPlayerProfile[] {
  const players: OptaPlayerProfile[] = [];
  for (const row of extractSummaryTableRows(html, "home")) {
    const parsed = parseSummaryTableRow(row, "home", homeTeam);
    if (parsed) players.push(parsed);
  }
  for (const row of extractSummaryTableRows(html, "away")) {
    const parsed = parseSummaryTableRow(row, "away", awayTeam);
    if (parsed) players.push(parsed);
  }
  return players;
}

export function parseWhoScoredFromHtml(
  html: string,
  sourceUrl: string,
  jsonCaptures: WhoScoredCapturedJson[] = [],
): OptaPlayerIntelligence {
  const url = resolveWhoScoredImportUrl(sourceUrl);
  const externalMatchId = extractWhoScoredMatchId(url);

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? decodeHtml(titleMatch[1] ?? "") : "";
  const teamMatch =
    title.match(/(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+([^-]+?)\s+-\s+/i) ??
    title.match(/(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+?)\s+Live/i);
  const homeTeam = teamMatch?.[1]?.trim() ?? "Home";
  const awayTeam = teamMatch?.[4]?.trim() ?? "Away";
  const score = teamMatch ? `${teamMatch[2]}-${teamMatch[3]}` : undefined;

  const feedPlayers = parseStatisticsFeedCaptures(jsonCaptures, homeTeam, awayTeam);
  const htmlPlayers = parseWhoScoredSummaryTables(html, homeTeam, awayTeam);
  let players = mergePlayersByName([...feedPlayers, ...htmlPlayers]);

  if (players.length < 6) {
    const blobs = extractEmbeddedJson(html, jsonCaptures.map((cap) => cap.data));
    for (const blob of blobs) {
      const fromJson = collectPlayers(blob, homeTeam, awayTeam);
      players = mergePlayersByName([...players, ...fromJson]);
      if (players.length >= 6) break;
    }
  }

  if (players.length === 0) {
    const ratingRe = /data-player-name=["']([^"']+)["'][^>]*data-rating=["']([\d.]+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = ratingRe.exec(html)) !== null && players.length < 30) {
      const name = m[1]?.trim();
      const rating = Number(m[2]);
      if (!name || !Number.isFinite(rating)) continue;
      const team =
        players.filter((p) => p.team === "home").length <= players.filter((p) => p.team === "away").length
          ? "home"
          : "away";
      players.push({
        name,
        team,
        teamName: team === "home" ? homeTeam : awayTeam,
        summary: { rating },
        offensive: {},
        defensive: {},
        passing: {},
        statSummary: `Rating ${rating}`,
      });
    }
  }

  if (players.length === 0) {
    throw new Error("No player ratings found on WhoScored page. Open the Live Statistics tab URL and try again.");
  }

  const motmPlayer =
    players.find((p) => p.isManOfTheMatch) ??
    [...players].sort((a, b) => (b.summary.rating ?? 0) - (a.summary.rating ?? 0))[0];
  const usedFeed = feedPlayers.length >= 6;
  const partialParse =
    !usedFeed &&
    players.some(
      (p) =>
        !p.offensive.shots &&
        !p.defensive.tackles &&
        !p.passing.passes &&
        (p.statSummary === `Rating ${p.summary.rating}` || !p.statSummary),
    );

  return {
    sourceProvider: "whoscored",
    sourceUrl: url,
    externalMatchId,
    homeTeam,
    awayTeam,
    score,
    manOfTheMatch: motmPlayer ? { name: motmPlayer.name, rating: motmPlayer.summary.rating } : undefined,
    players,
    summaryDigest: buildOptaDigest(players, motmPlayer?.name),
    partialParse,
    importedAt: new Date().toISOString(),
  };
}

export async function parseWhoScoredLiveStatistics(sourceUrl: string): Promise<OptaPlayerIntelligence> {
  const url = resolveWhoScoredImportUrl(sourceUrl);
  const { fetchWhoScoredPage } = await import("@/app/lib/match-report/fetch-whoscored-page");
  const fetched = await fetchWhoScoredPage(url);
  return parseWhoScoredFromHtml(fetched.html, url, fetched.jsonCaptures);
}
