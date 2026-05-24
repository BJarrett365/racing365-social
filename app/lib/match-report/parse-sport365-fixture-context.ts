import { extractSport365NextDataJson } from "@/app/lib/match-report/fetch-sport365-match-page";
import { assertSport365MatchUrl, extractSport365MatchPageId } from "@/app/lib/match-report/parse-sport365-commentary";
import type { FixtureContextIntelligence, FixtureMeetingSnapshot, NextFixtureSnapshot } from "@/app/lib/match-report/types";

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
      home: asNumber(raw.home ?? raw.homeScore ?? raw.scoreHome),
      away: asNumber(raw.away ?? raw.awayScore ?? raw.scoreAway),
    };
  }
  return {};
}

function meetingFromRow(row: Record<string, unknown>): FixtureMeetingSnapshot | null {
  const homeTeam =
    asString(row.homeTeam ?? row.home_team ?? row.homeName ?? row.home) ??
    asString(row.teamHome ?? row.team1);
  const awayTeam =
    asString(row.awayTeam ?? row.away_team ?? row.awayName ?? row.away) ??
    asString(row.teamAway ?? row.team2);
  if (!homeTeam || !awayTeam) return null;
  const score = parseScore(row.score ?? row.result ?? row.fullTimeScore ?? row.ft);
  return {
    date: asString(row.date ?? row.kickoff ?? row.matchDate ?? row.startTime),
    competition: asString(row.competition ?? row.league ?? row.tournament ?? row.season),
    homeTeam,
    awayTeam,
    homeScore: score.home ?? asNumber(row.homeScore),
    awayScore: score.away ?? asNumber(row.awayScore),
  };
}

function walkFixtureArrays(
  obj: unknown,
  out: FixtureMeetingSnapshot[],
  depth = 0,
  keyHint = "",
): void {
  if (depth > 14 || out.length >= 40) return;
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    const hint = keyHint.toLowerCase();
    const looksLikeFixtures =
      /head|h2h|previous|last|result|meeting|fixture|form|recent/.test(hint) && obj.length > 0;
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
    if (/head|h2h|previous|lastresult|last_result|meeting|recent|form|fixture|next|upcoming/i.test(key)) {
      walkFixtureArrays(value, out, depth + 1, key);
    } else if (depth < 6) {
      walkFixtureArrays(value, out, depth + 1, key);
    }
  }
}

function nextFixtureFromRow(row: Record<string, unknown>, teamName: string): NextFixtureSnapshot | null {
  const opponent =
    asString(row.opponent ?? row.awayTeam ?? row.homeTeam ?? row.vs ?? row.team) ?? undefined;
  const date = asString(row.date ?? row.kickoff ?? row.matchDate);
  if (!date && !opponent) return null;
  const isHome =
    typeof row.isHome === "boolean"
      ? row.isHome
      : teamMatches(asString(row.homeTeam) ?? "", teamName)
        ? true
        : teamMatches(asString(row.awayTeam) ?? "", teamName)
          ? false
          : undefined;
  return {
    team: teamName,
    opponent,
    date,
    competition: asString(row.competition ?? row.league),
    isHome,
    sixLogicMatchId: asString(row.matchId ?? row.match_id ?? row.id),
  };
}

function walkNextFixtures(
  obj: unknown,
  homeTeam: string,
  awayTeam: string,
): { home?: NextFixtureSnapshot; away?: NextFixtureSnapshot } {
  const found: NextFixtureSnapshot[] = [];
  const walk = (node: unknown, depth = 0, keyHint = ""): void => {
    if (depth > 14 || found.length >= 8) return;
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      if (/next|upcoming|fixture/i.test(keyHint)) {
        for (const item of node) {
          if (!isRecord(item)) continue;
          const home = nextFixtureFromRow(item, homeTeam);
          const away = nextFixtureFromRow(item, awayTeam);
          if (home) found.push(home);
          if (away) found.push(away);
        }
      }
      for (const item of node) walk(item, depth + 1, keyHint);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (/next|upcoming|fixture/i.test(key)) walk(value, depth + 1, key);
      else if (depth < 8) walk(value, depth + 1, key);
    }
  };
  walk(obj);
  return {
    home: found.find((row) => teamMatches(row.team, homeTeam)),
    away: found.find((row) => teamMatches(row.team, awayTeam)),
  };
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

function buildSeasonDouble(
  meetings: FixtureMeetingSnapshot[],
  homeTeam: string,
  awayTeam: string,
): FixtureContextIntelligence["seasonDouble"] {
  const between = filterMeetingsBetween(meetings, homeTeam, awayTeam);
  const homeMeeting = between.find(
    (m) => teamMatches(m.homeTeam, homeTeam) && teamMatches(m.awayTeam, awayTeam),
  );
  const awayMeeting = between.find(
    (m) => teamMatches(m.homeTeam, awayTeam) && teamMatches(m.awayTeam, homeTeam),
  );
  return {
    completed: Boolean(homeMeeting && awayMeeting),
    homeMeeting,
    awayMeeting,
  };
}

function formatMeeting(m: FixtureMeetingSnapshot): string {
  const score =
    m.homeScore !== undefined && m.awayScore !== undefined
      ? `${m.homeScore}-${m.awayScore}`
      : "v";
  return `${m.date ? `${m.date} · ` : ""}${m.homeTeam} ${score} ${m.awayTeam}${m.competition ? ` (${m.competition})` : ""}`;
}

function buildFixtureContextDigest(input: {
  headToHead: FixtureMeetingSnapshot[];
  homeRecentResults: FixtureMeetingSnapshot[];
  awayRecentResults: FixtureMeetingSnapshot[];
  homeNextFixture?: NextFixtureSnapshot;
  awayNextFixture?: NextFixtureSnapshot;
  seasonDouble?: FixtureContextIntelligence["seasonDouble"];
}): string {
  const lines: string[] = [];
  if (input.seasonDouble?.completed) {
    lines.push("Season double: both home and away meetings recorded this season.");
    if (input.seasonDouble.homeMeeting) lines.push(`Home leg: ${formatMeeting(input.seasonDouble.homeMeeting)}`);
    if (input.seasonDouble.awayMeeting) lines.push(`Away leg: ${formatMeeting(input.seasonDouble.awayMeeting)}`);
  } else if (input.seasonDouble?.homeMeeting || input.seasonDouble?.awayMeeting) {
    lines.push("Season double: first meeting only — return fixture still to come.");
  }
  if (input.headToHead.length > 0) {
    lines.push(
      "Head-to-head:",
      ...input.headToHead.slice(0, 5).map((m) => `- ${formatMeeting(m)}`),
    );
  }
  if (input.homeRecentResults.length > 0) {
    lines.push(
      "Home recent form:",
      ...input.homeRecentResults.slice(0, 3).map((m) => `- ${formatMeeting(m)}`),
    );
  }
  if (input.awayRecentResults.length > 0) {
    lines.push(
      "Away recent form:",
      ...input.awayRecentResults.slice(0, 3).map((m) => `- ${formatMeeting(m)}`),
    );
  }
  if (input.homeNextFixture) {
    lines.push(
      `Next (${input.homeNextFixture.team}): ${input.homeNextFixture.date ?? "TBC"} vs ${input.homeNextFixture.opponent ?? "TBC"}${input.homeNextFixture.sixLogicMatchId ? ` [match ${input.homeNextFixture.sixLogicMatchId}]` : ""}`,
    );
  }
  if (input.awayNextFixture) {
    lines.push(
      `Next (${input.awayNextFixture.team}): ${input.awayNextFixture.date ?? "TBC"} vs ${input.awayNextFixture.opponent ?? "TBC"}${input.awayNextFixture.sixLogicMatchId ? ` [match ${input.awayNextFixture.sixLogicMatchId}]` : ""}`,
    );
  }
  return lines.join("\n");
}

export function parseSport365FixtureContextFromHtml(
  html: string,
  sourceUrl: string,
  homeTeam: string,
  awayTeam: string,
): FixtureContextIntelligence | null {
  const nextData = extractSport365NextDataJson(html);
  if (!nextData) return null;

  const allMeetings: FixtureMeetingSnapshot[] = [];
  walkFixtureArrays(nextData, allMeetings);

  const headToHead = filterMeetingsBetween(allMeetings, homeTeam, awayTeam).slice(0, 8);
  const homeRecentResults = allMeetings
    .filter((m) => teamMatches(m.homeTeam, homeTeam) || teamMatches(m.awayTeam, homeTeam))
    .filter((m) => !headToHead.includes(m))
    .slice(0, 5);
  const awayRecentResults = allMeetings
    .filter((m) => teamMatches(m.homeTeam, awayTeam) || teamMatches(m.awayTeam, awayTeam))
    .filter((m) => !headToHead.includes(m))
    .slice(0, 5);

  const { home: homeNextFixture, away: awayNextFixture } = walkNextFixtures(nextData, homeTeam, awayTeam);
  const seasonDouble = buildSeasonDouble(allMeetings, homeTeam, awayTeam);

  if (
    headToHead.length === 0 &&
    homeRecentResults.length === 0 &&
    awayRecentResults.length === 0 &&
    !homeNextFixture &&
    !awayNextFixture
  ) {
    return null;
  }

  const url = assertSport365MatchUrl(sourceUrl).toString();
  const payload = {
    headToHead,
    homeRecentResults,
    awayRecentResults,
    homeNextFixture,
    awayNextFixture,
    seasonDouble,
  };

  return {
    sourceUrl: url,
    matchPageId: extractSport365MatchPageId(url),
    ...payload,
    digest: buildFixtureContextDigest(payload),
    importedAt: new Date().toISOString(),
  };
}
