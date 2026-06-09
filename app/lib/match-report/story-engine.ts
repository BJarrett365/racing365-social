import type {
  LoopFeedIntelligence,
  MatchReportProject,
  MatchStoryContext,
  MatchStoryEvent,
  MatchStoryPeriodStats,
  MatchStoryStatValue,
  SixLogicAvailableData,
  Sport365CommentaryLine,
} from "@/app/lib/match-report/types";

function displayPlayerName(name?: string): string | undefined {
  if (!name) return undefined;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  return name.trim();
}

function eventTeamName(project: MatchReportProject, teamSide?: "home" | "away" | "neutral"): string {
  if (teamSide === "away") return project.awayTeam;
  return project.homeTeam;
}

function scoreLine(project: MatchReportProject): string {
  const home = project.homeScore ?? project.layers.sixLogic?.facts.homeScore ?? "?";
  const away = project.awayScore ?? project.layers.sixLogic?.facts.awayScore ?? "?";
  return `${project.homeTeam} ${home}-${away} ${project.awayTeam}`;
}

function goalEvents(project: MatchReportProject): MatchStoryEvent[] {
  const events = project.layers.sixLogic?.events ?? [];
  return events
    .filter((event) => /goal/i.test(event.type) && !/disallowed|var/i.test(event.type))
    .map((event) => ({
      minute: event.minute,
      event: "Goal",
      team: eventTeamName(project, event.teamSide),
      player: displayPlayerName(event.playerName),
      detail: event.text,
    }));
}

function statValue(home: number | string | undefined, away: number | string | undefined): MatchStoryStatValue | null {
  if (home == null || away == null) return null;
  return { home, away, homeRaw: String(home), awayRaw: String(away) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function statPair(row: Record<string, unknown>, homeKey: string, awayKey: string, suffix = ""): MatchStoryStatValue | null {
  const home = asNumber(row[homeKey]);
  const away = asNumber(row[awayKey]);
  if (home === undefined || away === undefined) return null;
  return {
    home,
    away,
    homeRaw: suffix ? `${home}${suffix}` : String(home),
    awayRaw: suffix ? `${away}${suffix}` : String(away),
  };
}

function sourcePeriod(value: unknown): MatchStoryPeriodStats["sourcePeriod"] {
  const raw = String(value ?? "ALL").toUpperCase();
  if (raw.includes("1")) return "1ST";
  if (raw.includes("2")) return "2ND";
  return "ALL";
}

function sixLogicStatsFromAvailableData(availableData?: SixLogicAvailableData): {
  fullTime?: MatchStoryPeriodStats;
  firstHalf?: MatchStoryPeriodStats;
  secondHalf?: MatchStoryPeriodStats;
} {
  const rows = (availableData?.matchTeamStats ?? []).filter(isRecord);
  const out: {
    fullTime?: MatchStoryPeriodStats;
    firstHalf?: MatchStoryPeriodStats;
    secondHalf?: MatchStoryPeriodStats;
  } = {};
  for (const row of rows) {
    const overview: Record<string, MatchStoryStatValue> = {};
    const pairs: Array<[string, string, string, string?]> = [
      ["ballPossession", "htPossessionPercentage", "atPossessionPercentage", "%"],
      ["shotsOnTarget", "htShotsOnTarget", "atShotsOnTarget"],
      ["shotsOffTarget", "htShotsOffTarget", "atShotsOffTarget"],
      ["corners", "htCorner", "atCorner"],
      ["yellowCards", "htYellowCards", "atYellowCards"],
      ["redCards", "htRedCards", "atRedCards"],
      ["attacks", "htAttacks", "atAttacks"],
      ["dangerousAttacks", "htDangerousAttacks", "atDangerousAttacks"],
    ];
    for (const [name, homeKey, awayKey, suffix] of pairs) {
      const value = statPair(row, homeKey, awayKey, suffix);
      if (value) overview[name] = value;
    }
    if (!Object.keys(overview).length) continue;
    const stats: MatchStoryPeriodStats = {
      sourcePeriod: sourcePeriod(row.statsType),
      groups: { matchOverview: overview },
    };
    if (stats.sourcePeriod === "1ST") out.firstHalf = stats;
    else if (stats.sourcePeriod === "2ND") out.secondHalf = stats;
    else out.fullTime = stats;
  }
  return out;
}

function sixLogicFullTimeStats(project: MatchReportProject): MatchStoryPeriodStats | undefined {
  const possession = extractPossessionFromCommentary(project.layers.sport365Commentary?.lines ?? []);
  const fullTime: Record<string, MatchStoryStatValue> = {};
  if (possession) fullTime.ballPossession = { home: possession.home, away: possession.away, homeRaw: `${possession.home}%`, awayRaw: `${possession.away}%` };

  const homeGoals = project.homeScore ?? project.layers.sixLogic?.facts.homeScore;
  const awayGoals = project.awayScore ?? project.layers.sixLogic?.facts.awayScore;
  const goals = statValue(homeGoals, awayGoals);
  if (goals) fullTime.goals = goals;

  if (!Object.keys(fullTime).length) return undefined;
  return {
    sourcePeriod: "sixlogic",
    groups: {
      matchOverview: fullTime,
    },
  };
}

function extractPossessionFromCommentary(lines: Sport365CommentaryLine[]): { home: number; away: number } | null {
  let latest: { home: number; away: number } | null = null;
  for (const line of lines) {
    const match = line.text.match(/Ball possession:\s*[^:]+:\s*(\d+)%,\s*[^:]+:\s*(\d+)%/i);
    if (match?.[1] && match[2]) {
      latest = { home: Number.parseInt(match[1], 10), away: Number.parseInt(match[2], 10) };
    }
  }
  return latest;
}

function loopFeedIntelligence(loop: LoopFeedIntelligence | null): MatchStoryContext["loopFeedIntelligence"] {
  const out: MatchStoryContext["loopFeedIntelligence"] = {
    officialClubSignals: [],
    trustedJournalistSignals: [],
    quoteCandidates: [],
    tacticalObservations: [],
    moodAndReaction: [],
    styleSignals: [],
  };
  if (!loop) return out;

  for (const side of loop.sides) {
    for (const post of side.posts.slice(0, 8)) {
      const text = post.text.trim();
      if (!text) continue;
      const author = [post.author, post.handle ? `@${post.handle}` : ""].filter(Boolean).join(" ");
      const line = author ? `${author}: ${text}` : text;
      if (/official|club|manager|coach|press|conference/i.test(author)) out.officialClubSignals.push(line);
      else out.trustedJournalistSignals.push(line);
      if (/[“”"]/.test(text)) out.quoteCandidates.push(line);
      if (/shape|press|xg|chance|midfield|wide|set-piece|corner|dominant|pinned|territory/i.test(text)) {
        out.tacticalObservations.push(line);
      }
      if (/reaction|fans|mood|boo|cheer|frustrat|delight|furious|joke|funny/i.test(text)) out.moodAndReaction.push(line);
      out.styleSignals.push(text.slice(0, 220));
    }
  }
  return out;
}

function turningPoint(events: MatchStoryEvent[]): string | undefined {
  const firstGoal = events.find((event) => event.event === "Goal");
  return firstGoal?.player && firstGoal.minute != null ? `${firstGoal.player} goal ${firstGoal.minute}'` : undefined;
}

export function buildMatchStoryContext(project: MatchReportProject): MatchStoryContext {
  const events = goalEvents(project);
  const winner =
    project.homeScore != null && project.awayScore != null
      ? project.homeScore > project.awayScore
        ? project.homeTeam
        : project.awayScore > project.homeScore
          ? project.awayTeam
          : undefined
      : undefined;
  const ftStats = sixLogicFullTimeStats(project);
  const sixLogicStats = sixLogicStatsFromAvailableData(project.layers.sixLogic?.availableData);
  const fullTimeStats = sixLogicStats.fullTime ?? ftStats;
  const loop = loopFeedIntelligence(project.layers.loopFeed);
  const storylineParts = [
    winner ? `${winner} were the result-side in ${scoreLine(project)}.` : `${scoreLine(project)} is the match result.`,
    fullTimeStats?.groups.matchOverview.ballPossession
      ? `Possession should be reported consistently as ${project.homeTeam} ${fullTimeStats.groups.matchOverview.ballPossession.homeRaw}, ${project.awayTeam} ${fullTimeStats.groups.matchOverview.ballPossession.awayRaw}.`
      : "",
    loop.tacticalObservations.length ? "Loop Feed contains tactical/reaction signals for editorial colour, not event overrides." : "",
  ].filter(Boolean);

  return {
    matchInfo: {
      competition: project.competition,
      venue: project.layers.sixLogic?.facts.venue,
      score: scoreLine(project),
    },
    events,
    statisticsByPeriod: {
      fullTime: fullTimeStats,
      firstHalf: sixLogicStats.firstHalf,
      secondHalf: sixLogicStats.secondHalf,
    },
    loopFeedIntelligence: loop,
    derived: {
      turningPoint: turningPoint(events),
      deservedWinner: winner,
      dominantPhases: [],
      storyline: storylineParts.join(" "),
    },
    generatedAt: new Date().toISOString(),
  };
}
