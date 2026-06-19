import { fetchFotMobMatchPage } from "@/app/lib/match-report/fetch-fotmob-match-page";
import type {
  FixtureContextIntelligence,
  FixtureMeetingSnapshot,
  FotMobPreviewIntelligence,
  FotMobPreviewLineupPlayer,
  FotMobPreviewTeamLineup,
  FotMobStatComparisonRow,
} from "@/app/lib/match-report/types";

const FOTMOB_HOST_RE = /(^|\.)fotmob\.com$/i;

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
    const n = Number(value.replace(/[^\d.-]/g, ""));
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

function parseScoreString(scoreStr?: string): { home?: number; away?: number } {
  if (!scoreStr?.trim()) return {};
  const parts = scoreStr.split(/[-\u2013]/).map((part) => Number(part.trim()));
  if (parts.length >= 2 && parts.every((n) => Number.isFinite(n))) {
    return { home: parts[0], away: parts[1] };
  }
  return {};
}

/** Normalise FotMob match URLs to en-GB match pages. */
export function resolveFotMobMatchUrl(input: string): string {
  const url = new URL(input.trim());
  if (url.protocol !== "https:") throw new Error("FotMob URL must use https.");
  if (!FOTMOB_HOST_RE.test(url.hostname)) throw new Error("Only fotmob.com URLs are allowed.");
  if (!/\/matches\//i.test(url.pathname)) {
    throw new Error("Paste a FotMob match URL such as https://www.fotmob.com/en-GB/matches/…");
  }
  url.hostname = "www.fotmob.com";
  if (!url.pathname.startsWith("/en-GB/")) {
    url.pathname = `/en-GB${url.pathname.startsWith("/") ? "" : "/"}${url.pathname}`;
  }
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function extractFotMobSlugId(url: string): string | undefined {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

function parseLineupPlayer(row: Record<string, unknown>): FotMobPreviewLineupPlayer | null {
  const name = asString(row.name);
  if (!name) return null;
  return {
    name,
    shirtNumber: asString(row.shirtNumber),
    positionId: asNumber(row.positionId),
    usualPlayingPositionId: asNumber(row.usualPlayingPositionId),
    isCaptain: row.isCaptain === true,
    marketValue: asNumber(row.marketValue),
    primaryTeamName: asString(row.primaryTeamName),
  };
}

function parseTeamLineup(team: Record<string, unknown> | undefined): FotMobPreviewTeamLineup | null {
  if (!team) return null;
  const teamName = asString(team.name);
  if (!teamName) return null;
  const starters = Array.isArray(team.starters)
    ? team.starters.filter(isRecord).map(parseLineupPlayer).filter((p): p is FotMobPreviewLineupPlayer => Boolean(p))
    : [];
  const bench = Array.isArray(team.subs)
    ? team.subs.filter(isRecord).map(parseLineupPlayer).filter((p): p is FotMobPreviewLineupPlayer => Boolean(p))
    : [];
  return {
    team: teamName,
    formation: asString(team.formation),
    lineupLabel: asString(team.lastMatch) ? "Last starting XI" : "Lineup",
    starters,
    bench,
    averageStarterAge: asNumber(team.averageStarterAge),
    totalStarterMarketValue: asNumber(team.totalStarterMarketValue),
  };
}

function meetingFromFotMobMatch(row: Record<string, unknown>): FixtureMeetingSnapshot | null {
  const home = isRecord(row.home) ? row.home : null;
  const away = isRecord(row.away) ? row.away : null;
  const homeTeam = asString(home?.name);
  const awayTeam = asString(away?.name);
  if (!homeTeam || !awayTeam) return null;
  const status = isRecord(row.status) ? row.status : null;
  const score = parseScoreString(asString(status?.scoreStr));
  const time = isRecord(row.time) ? row.time : isRecord(status) ? status : null;
  const league = isRecord(row.league) ? row.league : null;
  return {
    date: asString(time?.utcTime),
    competition: asString(league?.name),
    homeTeam,
    awayTeam,
    homeScore: score.home,
    awayScore: score.away,
  };
}

function meetingFromFormRow(row: Record<string, unknown>): FixtureMeetingSnapshot | null {
  const tooltip = isRecord(row.tooltipText) ? row.tooltipText : null;
  const homeTeam = asString(tooltip?.homeTeam) ?? asString(isRecord(row.home) ? row.home.name : undefined);
  const awayTeam = asString(tooltip?.awayTeam) ?? asString(isRecord(row.away) ? row.away.name : undefined);
  if (!homeTeam || !awayTeam) return null;
  const score = parseScoreString(asString(row.score) ?? asString(tooltip?.homeScore && tooltip?.awayScore ? `${tooltip.homeScore} - ${tooltip.awayScore}` : undefined));
  return {
    date: asString(isRecord(row.date) ? row.date.utcTime : undefined) ?? asString(tooltip?.utcTime),
    homeTeam,
    awayTeam,
    homeScore: score.home ?? asNumber(tooltip?.homeScore),
    awayScore: score.away ?? asNumber(tooltip?.awayScore),
  };
}

function formatPlayerList(players: FotMobPreviewLineupPlayer[], limit = 11): string {
  return players
    .slice(0, limit)
    .map((player) => {
      const num = player.shirtNumber ? `${player.shirtNumber} ` : "";
      const club = player.primaryTeamName ? ` (${player.primaryTeamName})` : "";
      return `${num}${player.name}${club}`;
    })
    .join(", ");
}

function buildAboutTheMatch(input: {
  general?: Record<string, unknown>;
  infoBox?: Record<string, unknown>;
  h2hSummary?: number[];
  homeTeam: string;
  awayTeam: string;
}): string | undefined {
  const general = input.general;
  const stadium = isRecord(input.infoBox?.Stadium) ? (input.infoBox!.Stadium as Record<string, unknown>) : null;
  const tournament = isRecord(input.infoBox?.Tournament) ? (input.infoBox!.Tournament as Record<string, unknown>) : null;
  const parts = [
    asString(general?.matchTimeUTC) ? `Kick-off ${asString(general?.matchTimeUTC)}` : null,
    asString(general?.leagueName) ?? asString(tournament?.leagueName),
    stadium?.name ? `Venue ${asString(stadium.name)}${stadium.city ? `, ${asString(stadium.city)}` : ""}` : null,
    stadium?.capacity ? `Capacity ${asNumber(stadium.capacity)?.toLocaleString()}` : null,
    input.h2hSummary
      ? `H2H record (${input.homeTeam} perspective): ${input.h2hSummary[0] ?? 0}W-${input.h2hSummary[1] ?? 0}D-${input.h2hSummary[2] ?? 0}L`
      : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function buildFotMobDigest(preview: FotMobPreviewIntelligence): string {
  const lines: string[] = [];
  if (preview.aboutTheMatch) lines.push(`About the match: ${preview.aboutTheMatch}`);
  if (preview.winProbability.summary) lines.push(`Win probability / prediction: ${preview.winProbability.summary}`);
  for (const fact of preview.winProbability.pollInsights.slice(0, 6)) {
    lines.push(`- ${fact}`);
  }
  if (preview.homeLineup) {
    lines.push(
      `${preview.homeLineup.team} ${preview.homeLineup.formation ?? ""} (${preview.homeLineup.lineupLabel}): ${formatPlayerList(preview.homeLineup.starters)}`,
    );
    if (preview.homeLineup.bench.length > 0) {
      lines.push(`Bench: ${formatPlayerList(preview.homeLineup.bench, 8)}`);
    }
  }
  if (preview.awayLineup) {
    lines.push(
      `${preview.awayLineup.team} ${preview.awayLineup.formation ?? ""} (${preview.awayLineup.lineupLabel}): ${formatPlayerList(preview.awayLineup.starters)}`,
    );
    if (preview.awayLineup.bench.length > 0) {
      lines.push(`Bench: ${formatPlayerList(preview.awayLineup.bench, 8)}`);
    }
  }
  if (preview.teamInsights.length > 0) {
    lines.push("Team insights:", ...preview.teamInsights.slice(0, 6).map((row) => `- ${row}`));
  }
  if (preview.playerInsights.length > 0) {
    lines.push("Player insights:", ...preview.playerInsights.slice(0, 6).map((row) => `- ${row}`));
  }
  if (preview.statsComparison.rows.length > 0) {
    lines.push(
      "Stats comparison:",
      ...preview.statsComparison.rows.map((row) => `- ${row.label}: ${row.home ?? "—"} vs ${row.away ?? "—"}`),
    );
  } else if (!preview.statsComparison.available) {
    lines.push("Stats comparison: detailed team stats not yet available pre-kickoff in FotMob feed.");
  }
  return lines.join("\n");
}

function buildFixtureContextFromFotMob(
  preview: FotMobPreviewIntelligence,
  sourceUrl: string,
): FixtureContextIntelligence {
  const matchFacts = [
    preview.aboutTheMatch,
    preview.winProbability.summary,
    ...preview.winProbability.pollInsights,
    ...preview.teamInsights,
    ...preview.playerInsights,
  ].filter((fact): fact is string => Boolean(fact?.trim()));

  const digestParts = [
    preview.headToHead.length > 0
      ? `Head-to-head:\n${preview.headToHead
          .slice(0, 5)
          .map((m) => `${m.date ?? "?"} ${m.homeTeam} ${m.homeScore ?? "?"}-${m.awayScore ?? "?"} ${m.awayTeam}`)
          .join("\n")}`
      : null,
    preview.homeRecentResults.length > 0
      ? `Home form:\n${preview.homeRecentResults
          .slice(0, 5)
          .map((m) => `${m.date ?? "?"} ${m.homeTeam} ${m.homeScore ?? "?"}-${m.awayScore ?? "?"} ${m.awayTeam}`)
          .join("\n")}`
      : null,
    preview.awayRecentResults.length > 0
      ? `Away form:\n${preview.awayRecentResults
          .slice(0, 5)
          .map((m) => `${m.date ?? "?"} ${m.homeTeam} ${m.homeScore ?? "?"}-${m.awayScore ?? "?"} ${m.awayTeam}`)
          .join("\n")}`
      : null,
    buildFotMobDigest(preview),
  ].filter(Boolean);

  return {
    sourceUrl,
    matchPageId: preview.matchId,
    headToHead: preview.headToHead,
    homeRecentResults: preview.homeRecentResults,
    awayRecentResults: preview.awayRecentResults,
    matchFacts: matchFacts.slice(0, 24),
    digest: digestParts.join("\n\n"),
    importedAt: preview.importedAt,
  };
}

export function parseFotMobPreviewFromPageProps(
  pageProps: Record<string, unknown>,
  sourceUrl: string,
  expectedHomeTeam: string,
  expectedAwayTeam: string,
): FotMobPreviewIntelligence {
  const general = isRecord(pageProps.general) ? pageProps.general : {};
  const content = isRecord(pageProps.content) ? pageProps.content : {};
  const header = isRecord(pageProps.header) ? pageProps.header : {};
  const matchFactsRoot = isRecord(content.matchFacts) ? content.matchFacts : {};
  const infoBox = isRecord(matchFactsRoot.infoBox) ? matchFactsRoot.infoBox : {};
  const lineupRoot = isRecord(content.lineup) ? content.lineup : {};
  const h2hRoot = isRecord(content.h2h) ? content.h2h : {};

  const homeName = asString(isRecord(general.homeTeam) ? general.homeTeam.name : undefined) ?? expectedHomeTeam;
  const awayName = asString(isRecord(general.awayTeam) ? general.awayTeam.name : undefined) ?? expectedAwayTeam;
  const matchId = asString(general.matchId) ?? extractFotMobSlugId(sourceUrl) ?? "unknown";

  const h2hSummary = Array.isArray(h2hRoot.summary)
    ? h2hRoot.summary.map((value) => asNumber(value) ?? 0)
    : undefined;
  const headToHead = Array.isArray(h2hRoot.matches)
    ? h2hRoot.matches
        .filter(isRecord)
        .map(meetingFromFotMobMatch)
        .filter((m): m is FixtureMeetingSnapshot => Boolean(m))
    : [];

  const teamForm = Array.isArray(matchFactsRoot.teamForm) ? matchFactsRoot.teamForm : [];
  const homeFormRows = Array.isArray(teamForm[0]) ? teamForm[0].filter(isRecord) : [];
  const awayFormRows = Array.isArray(teamForm[1]) ? teamForm[1].filter(isRecord) : [];
  const homeRecentResults = homeFormRows
    .map(meetingFromFormRow)
    .filter((m): m is FixtureMeetingSnapshot => Boolean(m));
  const awayRecentResults = awayFormRows
    .map(meetingFromFormRow)
    .filter((m): m is FixtureMeetingSnapshot => Boolean(m));

  const poll = isRecord(matchFactsRoot.poll) && isRecord(matchFactsRoot.poll.oddspoll) ? matchFactsRoot.poll.oddspoll : null;
  const pollInsights = Array.isArray(poll?.Facts)
    ? poll!.Facts.filter(isRecord)
        .map((fact) => asString(fact.defaultText) ?? asString(fact.DefaultLabel))
        .filter((text): text is string => Boolean(text))
    : [];

  const insights = Array.isArray(matchFactsRoot.insights) ? matchFactsRoot.insights.filter(isRecord) : [];
  const teamInsights = insights
    .filter((row) => asString(row.type) === "team")
    .map((row) => asString(row.text))
    .filter((text): text is string => Boolean(text));
  const playerInsights = insights
    .filter((row) => asString(row.type) === "player")
    .map((row) => asString(row.text))
    .filter((text): text is string => Boolean(text));

  const headerTeams = Array.isArray(header.teams) ? header.teams.filter(isRecord) : [];
  const headerHome = headerTeams.find((team) => teamMatches(asString(team.name) ?? "", homeName));
  const headerAway = headerTeams.find((team) => teamMatches(asString(team.name) ?? "", awayName));

  const statsRows: FotMobStatComparisonRow[] = [];
  if (headerHome?.fifaRank !== undefined || headerAway?.fifaRank !== undefined) {
    statsRows.push({
      label: "FIFA ranking",
      home: asNumber(headerHome?.fifaRank),
      away: asNumber(headerAway?.fifaRank),
    });
  }

  const contentStats = content.stats;
  const contentPlayerStats = content.playerStats;
  const statsAvailable = Boolean(
    (contentStats && (Array.isArray(contentStats) ? contentStats.length > 0 : isRecord(contentStats))) ||
      (contentPlayerStats &&
        (Array.isArray(contentPlayerStats) ? contentPlayerStats.length > 0 : isRecord(contentPlayerStats))),
  );

  const homeLineup = parseTeamLineup(isRecord(lineupRoot.homeTeam) ? lineupRoot.homeTeam : undefined);
  const awayLineup = parseTeamLineup(isRecord(lineupRoot.awayTeam) ? lineupRoot.awayTeam : undefined);
  if (homeLineup && asString(lineupRoot.lineupType)) {
    const lineupType = asString(lineupRoot.lineupType)!;
    homeLineup.lineupLabel = lineupType === "lastStarting11" ? "Last starting XI" : lineupType;
  }
  if (awayLineup && asString(lineupRoot.lineupType)) {
    const lineupType = asString(lineupRoot.lineupType)!;
    awayLineup.lineupLabel = lineupType === "lastStarting11" ? "Last starting XI" : lineupType;
  }

  const stadium = isRecord(infoBox.Stadium) ? infoBox.Stadium : null;
  const referee = isRecord(infoBox.Referee) ? infoBox.Referee : null;

  const winSummary =
    h2hSummary && h2hSummary.length >= 3
      ? `${homeName} ${h2hSummary[0]}W-${h2hSummary[1]}D-${h2hSummary[2]}L vs ${awayName} (FotMob H2H)`
      : pollInsights[0];

  const preview: FotMobPreviewIntelligence = {
    sourceUrl,
    matchId,
    slugId: extractFotMobSlugId(sourceUrl),
    aboutTheMatch: buildAboutTheMatch({
      general,
      infoBox,
      h2hSummary,
      homeTeam: homeName,
      awayTeam: awayName,
    }),
    headToHead,
    homeRecentResults,
    awayRecentResults,
    homeLineup: homeLineup ?? undefined,
    awayLineup: awayLineup ?? undefined,
    winProbability: {
      summary: winSummary,
      h2hRecord:
        h2hSummary && h2hSummary.length >= 3
          ? { homeWins: h2hSummary[0] ?? 0, draws: h2hSummary[1] ?? 0, awayWins: h2hSummary[2] ?? 0 }
          : undefined,
      pollInsights,
    },
    teamInsights,
    playerInsights,
    statsComparison: {
      available: statsAvailable,
      rows: statsRows,
      note: statsAvailable
        ? undefined
        : "Detailed FotMob stats comparison is usually populated closer to kick-off; FIFA ranking shown as proxy.",
    },
    venue: stadium
      ? {
          name: asString(stadium.name),
          city: asString(stadium.city),
          capacity: asNumber(stadium.capacity),
          surface: asString(stadium.surface),
        }
      : undefined,
    referee: asString(referee?.text),
    digest: "",
    importedAt: new Date().toISOString(),
  };
  preview.digest = buildFotMobDigest(preview);
  return preview;
}

export function fotMobPreviewToFixtureContext(preview: FotMobPreviewIntelligence): FixtureContextIntelligence {
  return buildFixtureContextFromFotMob(preview, preview.sourceUrl);
}

export async function parseFotMobPreviewMatch(
  sourceUrl: string,
  homeTeam: string,
  awayTeam: string,
): Promise<FotMobPreviewIntelligence> {
  const url = resolveFotMobMatchUrl(sourceUrl);
  const { pageProps } = await fetchFotMobMatchPage(url);
  return parseFotMobPreviewFromPageProps(pageProps, url, homeTeam, awayTeam);
}
