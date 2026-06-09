import type {
  FixtureContextIntelligence,
  FixtureMeetingSnapshot,
  NextFixtureSnapshot,
  SixLogicFoundation,
  Sport365Commentary,
  Sport365CommentaryLine,
} from "@/app/lib/match-report/types";

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
    asString(row.homeTeam ?? row.home_team ?? row.homeName ?? row.homeTeamName ?? row.home) ??
    asString(row.teamHome ?? row.team1);
  const awayTeam =
    asString(row.awayTeam ?? row.away_team ?? row.awayName ?? row.awayTeamName ?? row.away) ??
    asString(row.teamAway ?? row.team2);
  if (!homeTeam || !awayTeam) return null;
  const score = parseScore(row.score ?? row.result ?? row.fullTimeScore ?? row.ft ?? row.name);
  return {
    date: asString(row.date ?? row.kickoff ?? row.matchDate ?? row.startTime),
    competition: asString(row.competition ?? row.league ?? row.tournament ?? row.season),
    homeTeam,
    awayTeam,
    homeScore: score.home ?? asNumber(row.homeScore),
    awayScore: score.away ?? asNumber(row.awayScore),
  };
}

function parseMeetings(raw: unknown): FixtureMeetingSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const out: FixtureMeetingSnapshot[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const meeting = meetingFromRow(row);
    if (meeting) out.push(meeting);
  }
  return out;
}

function nextFixtureFromRow(row: Record<string, unknown>, teamFallback?: string): NextFixtureSnapshot | null {
  const team = asString(row.team ?? row.teamName ?? row.competitorName) ?? teamFallback;
  const opponent =
    asString(row.opponent ?? row.opponentName ?? row.awayTeam ?? row.homeTeam) ??
    asString(row.vs ?? row.against);
  const sixLogicMatchId = asString(row.matchId ?? row.match_id ?? row.id);
  if (!team && !opponent && !sixLogicMatchId) return null;
  return {
    team: team ?? "Team",
    opponent,
    date: asString(row.date ?? row.kickoff ?? row.matchDate),
    competition: asString(row.competition ?? row.tournament ?? row.league),
    isHome: typeof row.isHome === "boolean" ? row.isHome : undefined,
    sixLogicMatchId,
  };
}

function buildCommentaryDigest(lines: Sport365CommentaryLine[]): string {
  return lines
    .slice(0, 40)
    .map((row) => `${row.minute !== undefined ? `${row.minute}'` : "?"} ${row.text}`)
    .join("\n");
}

function commentaryLinesFromFoundation(foundation: SixLogicFoundation): Sport365CommentaryLine[] {
  if (foundation.commentary.length > 0) {
    return foundation.commentary.map((line) => ({
      minute: line.minute,
      text: line.text,
    }));
  }
  return foundation.events.map((event) => ({
    minute: event.minute,
    text: event.text,
    eventType: event.type,
    teamSide: event.teamSide,
    playerName: event.playerName,
  }));
}

export function buildCommentaryFromSixLogicFoundation(foundation: SixLogicFoundation): Sport365Commentary {
  const { facts } = foundation;
  const lines = commentaryLinesFromFoundation(foundation);
  return {
    sourceUrl: `sixlogics://match/${foundation.matchId}`,
    matchPageId: foundation.matchId,
    homeTeam: facts.homeTeam,
    awayTeam: facts.awayTeam,
    competition: facts.competition,
    lines,
    digest: buildCommentaryDigest(lines),
    importedAt: new Date().toISOString(),
  };
}

function buildFixtureDigest(input: {
  headToHead: FixtureMeetingSnapshot[];
  homeRecentResults: FixtureMeetingSnapshot[];
  awayRecentResults: FixtureMeetingSnapshot[];
  homeNextFixture?: NextFixtureSnapshot;
  awayNextFixture?: NextFixtureSnapshot;
}): string {
  const parts: string[] = [];
  if (input.headToHead.length > 0) {
    parts.push(
      `Head-to-head (${input.headToHead.length}):\n${input.headToHead
        .slice(0, 6)
        .map((m) => `${m.date ?? "?"} ${m.homeTeam} ${m.homeScore ?? "?"}-${m.awayScore ?? "?"} ${m.awayTeam}`)
        .join("\n")}`,
    );
  }
  if (input.homeRecentResults.length > 0) {
    parts.push(
      `Home recent (${input.homeRecentResults.length}):\n${input.homeRecentResults
        .slice(0, 5)
        .map((m) => `${m.date ?? "?"} ${m.homeTeam} ${m.homeScore ?? "?"}-${m.awayScore ?? "?"} ${m.awayTeam}`)
        .join("\n")}`,
    );
  }
  if (input.awayRecentResults.length > 0) {
    parts.push(
      `Away recent (${input.awayRecentResults.length}):\n${input.awayRecentResults
        .slice(0, 5)
        .map((m) => `${m.date ?? "?"} ${m.homeTeam} ${m.homeScore ?? "?"}-${m.awayScore ?? "?"} ${m.awayTeam}`)
        .join("\n")}`,
    );
  }
  if (input.homeNextFixture?.opponent || input.homeNextFixture?.sixLogicMatchId) {
    parts.push(
      `Home next: ${input.homeNextFixture.team} vs ${input.homeNextFixture.opponent ?? "TBC"}${input.homeNextFixture.sixLogicMatchId ? ` (match ${input.homeNextFixture.sixLogicMatchId})` : ""}`,
    );
  }
  if (input.awayNextFixture?.opponent || input.awayNextFixture?.sixLogicMatchId) {
    parts.push(
      `Away next: ${input.awayNextFixture.team} vs ${input.awayNextFixture.opponent ?? "TBC"}${input.awayNextFixture.sixLogicMatchId ? ` (match ${input.awayNextFixture.sixLogicMatchId})` : ""}`,
    );
  }
  return parts.join("\n\n");
}

export function buildFixtureContextFromSixLogicFoundation(
  foundation: SixLogicFoundation,
): FixtureContextIntelligence | null {
  const data = foundation.availableData;
  if (!data) return null;

  const headToHead = parseMeetings(data.headToHead);
  const homeRecentResults = parseMeetings(data.lastHomeResults);
  const awayRecentResults = parseMeetings(data.lastAwayResults);

  const homeNextRaw = Array.isArray(data.upcomingHomeFixtures) ? data.upcomingHomeFixtures[0] : null;
  const awayNextRaw = Array.isArray(data.upcomingAwayFixtures) ? data.upcomingAwayFixtures[0] : null;
  const homeNextFixture =
    homeNextRaw && isRecord(homeNextRaw)
      ? nextFixtureFromRow(homeNextRaw, foundation.facts.homeTeam)
      : undefined;
  const awayNextFixture =
    awayNextRaw && isRecord(awayNextRaw)
      ? nextFixtureFromRow(awayNextRaw, foundation.facts.awayTeam)
      : undefined;

  if (
    headToHead.length === 0 &&
    homeRecentResults.length === 0 &&
    awayRecentResults.length === 0 &&
    !homeNextFixture &&
    !awayNextFixture
  ) {
    return null;
  }

  const digest = buildFixtureDigest({
    headToHead,
    homeRecentResults,
    awayRecentResults,
    homeNextFixture: homeNextFixture ?? undefined,
    awayNextFixture: awayNextFixture ?? undefined,
  });

  return {
    sourceUrl: `sixlogics://match/${foundation.matchId}`,
    matchPageId: foundation.matchId,
    headToHead,
    homeRecentResults,
    awayRecentResults,
    homeNextFixture: homeNextFixture ?? undefined,
    awayNextFixture: awayNextFixture ?? undefined,
    digest,
    importedAt: new Date().toISOString(),
  };
}

export function buildSixLogicMatchIntelligence(foundation: SixLogicFoundation): {
  commentary: Sport365Commentary;
  fixtureContext: FixtureContextIntelligence | null;
} {
  const commentary = buildCommentaryFromSixLogicFoundation(foundation);
  const fixtureContext = buildFixtureContextFromSixLogicFoundation(foundation);
  return { commentary, fixtureContext };
}

export function sixLogicCommentaryLineCount(foundation: SixLogicFoundation): number {
  return foundation.commentary.length > 0 ? foundation.commentary.length : foundation.events.length;
}
