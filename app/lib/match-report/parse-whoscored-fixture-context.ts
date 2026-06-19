import type { WhoScoredCapturedJson } from "@/app/lib/match-report/fetch-whoscored-page";
import type { FixtureContextIntelligence, FixtureMeetingSnapshot } from "@/app/lib/match-report/types";

const WHOSCORED_HOST_RE = /(^|\.)whoscored\.com$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/\bfc\b/g, "").replace(/[^a-z0-9]/g, "").trim();
}

function teamMatches(a: string, b: string): boolean {
  const x = normalizeTeam(a);
  const y = normalizeTeam(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function parseScore(raw: unknown): { home?: number; away?: number } {
  if (typeof raw === "string") {
    const parts = raw.split(/[:-\u2013]/).map((p) => Number(p.trim()));
    if (parts.length >= 2 && parts.every((n) => Number.isFinite(n))) {
      return { home: parts[0], away: parts[1] };
    }
  }
  if (isRecord(raw)) {
    return {
      home: asNumber(raw.home ?? raw.homeScore ?? raw.scoreHome ?? raw.homeTeamScore),
      away: asNumber(raw.away ?? raw.awayScore ?? raw.scoreAway ?? raw.awayTeamScore),
    };
  }
  return {};
}

function meetingFromRow(row: Record<string, unknown>): FixtureMeetingSnapshot | null {
  const homeTeam =
    asString(row.homeTeam ?? row.home_team ?? row.homeName ?? row.homeTeamName ?? row.home) ??
    asString(row.teamHome ?? row.team1);
  const awayTeam =
    asString(row.awayTeam ?? row.away_team ?? row.awayName ?? row.awayTeamName ?? row.away) ??
    asString(row.teamAway ?? row.team2);
  if (!homeTeam || !awayTeam) return null;
  const score = parseScore(row.score ?? row.result ?? row.fullTimeScore ?? row.ft ?? row.name);
  return {
    date: asString(row.date ?? row.kickoff ?? row.matchDate ?? row.startTime ?? row.startDateUtc),
    competition: asString(row.competition ?? row.league ?? row.tournament ?? row.tournamentName ?? row.season),
    homeTeam,
    awayTeam,
    homeScore: score.home ?? asNumber(row.homeScore),
    awayScore: score.away ?? asNumber(row.awayScore),
  };
}

function walkFixtureArrays(obj: unknown, out: FixtureMeetingSnapshot[], depth = 0, keyHint = ""): void {
  if (depth > 14 || out.length >= 40) return;
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    const hint = keyHint.toLowerCase();
    const looksLikeFixtures =
      /head|h2h|previous|last|result|meeting|fixture|form|recent|match/i.test(hint) && obj.length > 0;
    if (looksLikeFixtures) {
      for (const item of obj) {
        if (!isRecord(item)) continue;
        const meeting = meetingFromRow(item);
        if (meeting) out.push(meeting);
      }
    }
    for (const item of obj) walkFixtureArrays(item, out, depth + 1, keyHint);
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (/head|h2h|previous|lastresult|last_result|meeting|recent|form|fixture|match/i.test(key)) {
      walkFixtureArrays(value, out, depth + 1, key);
    } else if (depth < 8) {
      walkFixtureArrays(value, out, depth + 1, key);
    }
  }
}

function walkMatchFacts(obj: unknown, out: string[], depth = 0, keyHint = ""): void {
  if (depth > 12 || out.length >= 30) return;
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    const hint = keyHint.toLowerCase();
    if (/fact|forecast|preview|insight|highlight|streak/i.test(hint)) {
      for (const item of obj) {
        const text = asString(item) ?? (isRecord(item) ? asString(item.text ?? item.fact ?? item.description) : undefined);
        if (text && text.length >= 12 && text.length <= 400) out.push(text);
      }
    }
    for (const item of obj) walkMatchFacts(item, out, depth + 1, keyHint);
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (/fact|forecast|preview|insight|highlight|streak|comment/i.test(key)) {
      walkMatchFacts(value, out, depth + 1, key);
    } else if (depth < 8) {
      walkMatchFacts(value, out, depth + 1, key);
    }
  }
}

function filterMeetingsBetween(
  meetings: FixtureMeetingSnapshot[],
  homeTeam: string,
  awayTeam: string,
): FixtureMeetingSnapshot[] {
  return meetings.filter(
    (m) =>
      (teamMatches(m.homeTeam, homeTeam) && teamMatches(m.awayTeam, awayTeam)) ||
      (teamMatches(m.homeTeam, awayTeam) && teamMatches(m.awayTeam, homeTeam)),
  );
}

function extractEmbeddedJsonBlobs(html: string, extraBlobs: unknown[] = []): unknown[] {
  const blobs: unknown[] = [...extraBlobs];
  const next = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (next?.[1]) {
    try {
      blobs.push(JSON.parse(next[1]) as unknown);
    } catch {
      /* ignore */
    }
  }
  for (const m of html.matchAll(/require\.config\.params\s*=\s*(\{[\s\S]*?\});/gi)) {
    try {
      blobs.push(JSON.parse(m[1] ?? "") as unknown);
    } catch {
      /* ignore */
    }
  }
  return blobs;
}

function parseMatchFactsFromHtml(html: string): string[] {
  const facts: string[] = [];
  const forecastBlock = html.match(
    /match forecast[\s\S]{0,4000}?<(?:ul|table|div)[^>]*>([\s\S]*?)<\/(?:ul|table|div)>/i,
  );
  if (forecastBlock?.[1]) {
    for (const m of forecastBlock[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const text = decodeHtml(m[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "");
      if (text.length >= 12 && text.length <= 280) facts.push(text);
    }
  }
  for (const m of html.matchAll(/<li[^>]*class=["'][^"']*fact[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = decodeHtml(m[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "");
    if (text.length >= 12 && text.length <= 280) facts.push(text);
  }
  return facts;
}

function parseTeamsFromTitle(html: string): { homeTeam?: string; awayTeam?: string } {
  const title = decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "");
  const dashMatch = title.match(/^(.+?)\s*[-–]\s*(.+?)\s*-/);
  if (dashMatch) {
    return { homeTeam: dashMatch[1]?.trim(), awayTeam: dashMatch[2]?.trim() };
  }
  return {};
}

function formatMeeting(m: FixtureMeetingSnapshot): string {
  const score =
    m.homeScore !== undefined && m.awayScore !== undefined ? `${m.homeScore}-${m.awayScore}` : "v";
  return `${m.date ? `${m.date} · ` : ""}${m.homeTeam} ${score} ${m.awayTeam}${m.competition ? ` (${m.competition})` : ""}`;
}

function buildDigest(input: {
  headToHead: FixtureMeetingSnapshot[];
  homeRecentResults: FixtureMeetingSnapshot[];
  awayRecentResults: FixtureMeetingSnapshot[];
  matchFacts: string[];
}): string {
  const lines: string[] = [];
  if (input.headToHead.length > 0) {
    lines.push("Head-to-head:", ...input.headToHead.slice(0, 6).map((m) => `- ${formatMeeting(m)}`));
  }
  if (input.homeRecentResults.length > 0) {
    lines.push(
      "Home recent form:",
      ...input.homeRecentResults.slice(0, 5).map((m) => `- ${formatMeeting(m)}`),
    );
  }
  if (input.awayRecentResults.length > 0) {
    lines.push(
      "Away recent form:",
      ...input.awayRecentResults.slice(0, 5).map((m) => `- ${formatMeeting(m)}`),
    );
  }
  if (input.matchFacts.length > 0) {
    lines.push("Match facts:", ...input.matchFacts.slice(0, 12).map((fact) => `- ${fact}`));
  }
  return lines.join("\n");
}

/** Normalise show/preview match URLs without rewriting to live statistics. */
export function resolveWhoScoredPreviewUrl(input: string): string {
  const u = new URL(input.trim());
  if (u.protocol !== "https:") throw new Error("WhoScored URL must use https.");
  if (!WHOSCORED_HOST_RE.test(u.hostname)) throw new Error("Only whoscored.com URLs are allowed.");

  const matchId = u.pathname.match(/\/matches\/(\d+)\//i)?.[1];
  if (!matchId) {
    throw new Error(
      "Paste a WhoScored match URL such as https://www.whoscored.com/matches/1953853/show/… or …/preview/…",
    );
  }

  const slug = u.pathname.match(/\/(?:show|preview|live)\/([^/?#]+)/i)?.[1]?.replace(/\/+$/, "") ?? "";
  u.hostname = "www.whoscored.com";
  u.pathname = slug ? `/matches/${matchId}/show/${slug}` : `/matches/${matchId}/show`;
  u.search = "";
  u.hash = "";
  return u.toString();
}

export function extractWhoScoredMatchIdFromPreviewUrl(url: string): string {
  const m = new URL(url).pathname.match(/\/matches\/(\d+)\//i);
  if (!m?.[1]) throw new Error("Could not extract WhoScored match id.");
  return m[1];
}

export function parseWhoScoredFixtureContextFromFetched(params: {
  html: string;
  sourceUrl: string;
  jsonCaptures?: WhoScoredCapturedJson[];
  homeTeam: string;
  awayTeam: string;
}): FixtureContextIntelligence | null {
  const { html, sourceUrl, homeTeam, awayTeam } = params;
  const titleTeams = parseTeamsFromTitle(html);
  const resolvedHome = homeTeam || titleTeams.homeTeam || "Home";
  const resolvedAway = awayTeam || titleTeams.awayTeam || "Away";

  const allMeetings: FixtureMeetingSnapshot[] = [];
  const blobs = extractEmbeddedJsonBlobs(
    html,
    (params.jsonCaptures ?? []).map((capture) => capture.data),
  );
  for (const blob of blobs) walkFixtureArrays(blob, allMeetings);

  const matchFacts = [
    ...parseMatchFactsFromHtml(html),
    ...blobs.flatMap((blob) => {
      const facts: string[] = [];
      walkMatchFacts(blob, facts);
      return facts;
    }),
  ];
  const uniqueFacts = [...new Set(matchFacts.map((f) => f.trim()).filter(Boolean))].slice(0, 24);

  const headToHead = filterMeetingsBetween(allMeetings, resolvedHome, resolvedAway).slice(0, 8);
  const homeRecentResults = allMeetings
    .filter((m) => teamMatches(m.homeTeam, resolvedHome) || teamMatches(m.awayTeam, resolvedHome))
    .filter((m) => !headToHead.includes(m))
    .slice(0, 6);
  const awayRecentResults = allMeetings
    .filter((m) => teamMatches(m.homeTeam, resolvedAway) || teamMatches(m.awayTeam, resolvedAway))
    .filter((m) => !headToHead.includes(m))
    .slice(0, 6);

  if (
    headToHead.length === 0 &&
    homeRecentResults.length === 0 &&
    awayRecentResults.length === 0 &&
    uniqueFacts.length === 0
  ) {
    return null;
  }

  const url = resolveWhoScoredPreviewUrl(sourceUrl);
  const payload = {
    headToHead,
    homeRecentResults,
    awayRecentResults,
    matchFacts: uniqueFacts,
  };

  return {
    sourceUrl: url,
    matchPageId: extractWhoScoredMatchIdFromPreviewUrl(url),
    ...payload,
    digest: buildDigest(payload),
    importedAt: new Date().toISOString(),
  };
}

export async function parseWhoScoredFixtureContextPreview(
  sourceUrl: string,
  homeTeam: string,
  awayTeam: string,
): Promise<FixtureContextIntelligence> {
  const url = resolveWhoScoredPreviewUrl(sourceUrl);
  const { fetchWhoScoredPreviewPage } = await import("@/app/lib/match-report/fetch-whoscored-page");
  const fetched = await fetchWhoScoredPreviewPage(url);
  const parsed = parseWhoScoredFixtureContextFromFetched({
    html: fetched.html,
    sourceUrl: url,
    jsonCaptures: fetched.jsonCaptures,
    homeTeam,
    awayTeam,
  });
  if (!parsed) {
    throw new Error(
      "WhoScored preview page loaded but no head-to-head, form, or match facts were found — try the show/preview tab URL for this fixture.",
    );
  }
  return parsed;
}
