import { flattenJsonKeyPaths } from "@/app/lib/data-studio/sixlogics-fixture";
import type {
  SixLogicAvailableData,
  SixLogicCommentaryLine,
  SixLogicEvent,
  SixLogicFacts,
  SixLogicFoundation,
  SixLogicLineup,
  SixLogicPlayer,
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
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const part of parts) {
    if (!isRecord(cur) && !Array.isArray(cur)) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(part);
      cur = Number.isInteger(idx) ? cur[idx] : undefined;
    } else {
      cur = cur[part];
    }
  }
  return cur;
}

function getByPaths(obj: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const value = getByPath(obj, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function deepCollect(
  obj: unknown,
  predicate: (key: string, value: unknown, path: string) => boolean,
  max = 40,
): Array<{ path: string; value: unknown }> {
  const out: Array<{ path: string; value: unknown }> = [];
  const walk = (val: unknown, prefix: string, depth: number) => {
    if (out.length >= max || depth > 10) return;
    if (!isRecord(val) && !Array.isArray(val)) return;
    if (Array.isArray(val)) {
      val.forEach((item, idx) => walk(item, `${prefix}[${idx}]`, depth + 1));
      return;
    }
    for (const [key, value] of Object.entries(val)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (predicate(key, value, path)) out.push({ path, value });
      walk(value, path, depth + 1);
    }
  };
  walk(obj, "", 0);
  return out;
}

function firstString(obj: unknown, paths: string[], keyPatterns: RegExp[]): string | undefined {
  const direct = asString(getByPaths(obj, paths));
  if (direct) return direct;
  for (const hit of deepCollect(obj, (key) => keyPatterns.some((p) => p.test(key)))) {
    const s = asString(hit.value);
    if (s) return s;
  }
  return undefined;
}

function firstNumber(obj: unknown, paths: string[], keyPatterns: RegExp[]): number | undefined {
  const direct = asNumber(getByPaths(obj, paths));
  if (direct !== undefined) return direct;
  for (const hit of deepCollect(obj, (key) => keyPatterns.some((p) => p.test(key)))) {
    const n = asNumber(hit.value);
    if (n !== undefined) return n;
  }
  return undefined;
}

function parsePlayers(raw: unknown): SixLogicPlayer[] {
  if (!Array.isArray(raw)) return [];
  const out: SixLogicPlayer[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const name =
      asString(row.name) ??
      asString(row.player_name) ??
      asString(row.PlayerName) ??
      asString(row.full_name) ??
      asString(row.FullName);
    if (!name) continue;
    out.push({
      shirtNumber: asNumber(row.shirt_number ?? row.shirtNumber ?? row.number ?? row.jersey),
      name,
      position: asString(row.position ?? row.position_code ?? row.Position),
      isSubstitute: Boolean(row.is_substitute ?? row.substitute ?? row.isSubstitute),
    });
  }
  return out;
}

function parseLineupSide(obj: unknown, side: "home" | "away"): SixLogicLineup {
  const sideObj =
    getByPaths(obj, [
      `lineups.${side}`,
      `lineup.${side}`,
      `${side}_lineup`,
      `${side}Lineup`,
      `LineUps.${side}`,
    ]) ?? getByPath(obj, side);
  const formation =
    asString(getByPaths(sideObj ?? obj, [`formation`, `${side}_formation`, `${side}Formation`])) ??
    asString(getByPath(obj, `lineups.${side}.formation`));
  const starters =
    parsePlayers(
      getByPaths(sideObj ?? obj, ["starters", "starting_xi", "startingXI", "players", "Players", "lineup"]) ??
        getByPath(obj, `lineups.${side}.players`),
    ) ?? [];
  const substitutes =
    parsePlayers(getByPaths(sideObj ?? obj, ["substitutes", "subs", "Substitutes"])) ?? [];
  const startersOnly = starters.filter((p) => !p.isSubstitute);
  const subsOnly = substitutes.length > 0 ? substitutes : starters.filter((p) => p.isSubstitute);
  return {
    formation,
    starters: startersOnly.length > 0 ? startersOnly : starters,
    substitutes: subsOnly,
  };
}

function parseEvents(obj: unknown): SixLogicEvent[] {
  const raw =
    getByPaths(obj, [
      "events",
      "incidents",
      "match_events",
      "matchEvents",
      "timeline",
      "key_incidents",
      "KeyIncidents",
    ]) ?? deepCollect(obj, (key) => /event|incident|timeline|goal|card/i.test(key), 1)[0]?.value;
  if (!Array.isArray(raw)) return [];
  const out: SixLogicEvent[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const text =
      asString(row.text) ??
      asString(row.comment) ??
      asString(row.description) ??
      asString(row.event_text) ??
      asString(row.EventText);
    if (!text) continue;
    const type = asString(row.type ?? row.event_type ?? row.EventType) ?? "event";
    const teamHint = asString(row.team ?? row.team_side ?? row.side ?? row.TeamSide)?.toLowerCase();
    let teamSide: SixLogicEvent["teamSide"] = "neutral";
    if (teamHint?.includes("home")) teamSide = "home";
    if (teamHint?.includes("away")) teamSide = "away";
    out.push({
      minute: asNumber(row.minute ?? row.Minute ?? row.time),
      second: asNumber(row.second ?? row.Second),
      type,
      text,
      teamSide,
      playerName: asString(row.player ?? row.player_name ?? row.PlayerName),
    });
  }
  return out;
}

function parseCommentary(obj: unknown): SixLogicCommentaryLine[] {
  const raw = getByPaths(obj, [
    "commentary",
    "commentary_events",
    "commentaryEvents",
    "live_commentary",
    "LiveCommentary",
  ]);
  if (!Array.isArray(raw)) return [];
  const out: SixLogicCommentaryLine[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const text = asString(row.text ?? row.comment ?? row.description);
    if (!text) continue;
    out.push({
      minute: asNumber(row.minute ?? row.Minute ?? row.time),
      text,
    });
  }
  return out;
}

type SportccContext = {
  match: Record<string, unknown>;
  tournamentName?: string;
  categoryName?: string;
  season?: string;
};

function findSportccMatch(payload: unknown, matchId: string): SportccContext | null {
  const sport = getByPath(payload, "sportccbetdata.sport");
  if (!isRecord(sport) || !Array.isArray(sport.category)) return null;
  const targetId = Number(matchId);
  for (const category of sport.category) {
    if (!isRecord(category) || !Array.isArray(category.tournament)) continue;
    const categoryName = asString(category.name);
    for (const tournament of category.tournament) {
      if (!isRecord(tournament) || !Array.isArray(tournament.match)) continue;
      const tournamentName = asString(tournament.name);
      const season = asString(tournament.season);
      for (const match of tournament.match) {
        if (!isRecord(match)) continue;
        const id = asNumber(match.id ?? match.matchId ?? match.match_id);
        if (Number.isFinite(targetId) && id === targetId) {
          return { match, tournamentName, categoryName, season };
        }
      }
    }
  }
  // Fallback: first match in feed when id lookup fails
  for (const category of sport.category) {
    if (!isRecord(category) || !Array.isArray(category.tournament)) continue;
    for (const tournament of category.tournament) {
      if (!isRecord(tournament) || !Array.isArray(tournament.match) || tournament.match.length === 0) continue;
      const match = tournament.match[0];
      if (isRecord(match)) {
        return {
          match,
          tournamentName: asString(tournament.name),
          categoryName: asString(category.name),
          season: asString(tournament.season),
        };
      }
    }
  }
  return null;
}

function parseSportccScore(scoreRows: unknown): { home?: number; away?: number } {
  if (!Array.isArray(scoreRows)) return {};
  const ft =
    scoreRows.find((row) => isRecord(row) && asString(row.type)?.toUpperCase() === "FT") ??
    scoreRows[scoreRows.length - 1];
  if (!isRecord(ft)) return {};
  const name = asString(ft.name);
  if (!name) return {};
  const parts = name.split(/[:-\u2013]/).map((part) => Number(part.trim()));
  if (parts.length >= 2 && parts.every((n) => Number.isFinite(n))) {
    return { home: parts[0], away: parts[1] };
  }
  return {};
}

function parseSportccLineUp(raw: unknown): SixLogicLineup {
  if (!isRecord(raw)) return { starters: [], substitutes: [] };
  const formation = asString(raw.formation);
  const players = parsePlayers(raw.player ?? raw.players ?? raw.Player);
  const starters = players.filter((p) => !p.isSubstitute);
  const substitutes = players.filter((p) => p.isSubstitute);
  return {
    formation,
    starters: starters.length > 0 ? starters : players,
    substitutes,
  };
}

function parseSportccEvents(match: Record<string, unknown>): SixLogicEvent[] {
  const out: SixLogicEvent[] = [];
  const append = (rows: unknown, defaultType: string) => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!isRecord(row)) continue;
      const minute = asNumber(row.minute ?? row.Minute);
      const playerName =
        asString(row.name) ??
        ([asString(row.firstName), asString(row.surName)].filter(Boolean).join(" ").trim() || undefined);
      const teamSide: SixLogicEvent["teamSide"] =
        asString(row.team) === "1" ? "home" : asString(row.team) === "2" ? "away" : "neutral";
      const type = asString(row.type) ?? defaultType;
      const textParts = [
        minute !== undefined ? `${minute}'` : null,
        type,
        playerName,
        asString(row.score) ? `(${asString(row.score)})` : null,
      ].filter(Boolean);
      out.push({
        minute,
        type,
        text: textParts.join(" · "),
        teamSide,
        playerName,
      });
    }
  };
  append(match.goal, "Goal");
  append(match.card, "Card");
  append(match.substitution, "Substitution");
  return out.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
}

function parseSportccCommentary(match: Record<string, unknown>): SixLogicCommentaryLine[] {
  const rows = Array.isArray(match.matchCommentary) ? match.matchCommentary.filter(isRecord) : [];
  const out: SixLogicCommentaryLine[] = [];
  for (const row of rows) {
    const minute = asNumber(row.matchMinute ?? row.minute ?? row.Minute);
    const plusMinute = asNumber(row.plusMinute);
    const prefix = minute !== undefined ? `${minute}${plusMinute ? `+${plusMinute}` : ""}' ` : "";
    const type = asString(row.commenTypeText ?? row.commentType);
    const comment = asString(row.comment ?? row.text ?? row.description);
    const text = [type ? `[${type}]` : "", comment].filter(Boolean).join(" ");
    if (!text.trim()) continue;
    out.push({
      minute,
      text: `${prefix}${text}`.trim(),
    });
  }
  return out;
}

function parseSportccVenue(match: Record<string, unknown>): Pick<
  SixLogicFacts,
  "venue" | "venueCity" | "venueCapacity" | "attendance"
> {
  const venueObj = isRecord(match.venue) ? match.venue : null;
  return {
    venue: asString(venueObj?.name ?? match.stadium),
    venueCity: asString(venueObj?.city),
    venueCapacity: asNumber(venueObj?.capacity),
    attendance: asNumber(venueObj?.spectators),
  };
}

function parseSportccReferee(match: Record<string, unknown>): string | undefined {
  const officials = Array.isArray(match.official) ? match.official.filter(isRecord) : [];
  const refereeRow =
    officials.find((row) => /referee/i.test(asString(row.type) ?? "")) ??
    officials.find((row) => /referee/i.test(asString(row.typeId) ?? "")) ??
    officials[0];
  return asString(refereeRow?.name) ?? asString(match.referee);
}

function parseSportccCoach(competitor: Record<string, unknown> | undefined): string | undefined {
  if (!competitor) return undefined;
  const coach = competitor.coach;
  if (isRecord(coach)) return asString(coach.name);
  return asString(coach);
}

const SPORTCC_AVAILABLE_SECTION_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  competition: {
    title: "Competition",
    description: "Tournament, season, league, contest group and competition metadata.",
  },
  matchMeta: {
    title: "Match metadata",
    description: "Status, date, round, publication flags, clock and full-time timing.",
  },
  venue: {
    title: "Venue",
    description: "Stadium, capacity, attendance and venue identifiers.",
  },
  officials: {
    title: "Officials",
    description: "Referee and match official records.",
  },
  competitors: {
    title: "Teams / competitors",
    description: "Team identifiers, codes, badges, coaches, lineups and bench players.",
  },
  score: {
    title: "Score",
    description: "Half-time, full-time and other score states supplied by SixLogics.",
  },
  goals: {
    title: "Goals",
    description: "Goal events with scorer, minute, score state and assist records.",
  },
  cards: {
    title: "Cards",
    description: "Yellow/red card events with minute, team and player details.",
  },
  corners: {
    title: "Corners",
    description: "Corner summary rows supplied by the feed.",
  },
  substitutions: {
    title: "Substitutions",
    description: "Player on/off events, team and minute.",
  },
  matchChannels: {
    title: "Match channels",
    description: "Broadcast or channel metadata where supplied.",
  },
  leagueTable: {
    title: "League table",
    description: "Competition table rows and positional context.",
  },
  matchCommentary: {
    title: "Match commentary",
    description: "Live commentary event stream with event types and timestamps.",
  },
  matchTeamStats: {
    title: "Team stats",
    description: "Possession, shots, corners, cards, attacks and dangerous attacks by stats period.",
  },
  headToHead: {
    title: "Head-to-head",
    description: "Recent meetings between the two teams.",
  },
  lastHomeResults: {
    title: "Last home results",
    description: "Recent match results for the home-team context.",
  },
  lastAwayResults: {
    title: "Last away results",
    description: "Recent match results for the away-team context.",
  },
  upcomingHomeFixtures: {
    title: "Upcoming home fixtures",
    description: "Future fixtures for the home side where supplied.",
  },
  upcomingAwayFixtures: {
    title: "Upcoming away fixtures",
    description: "Future fixtures for the away side where supplied.",
  },
  streaks: {
    title: "Streaks",
    description: "Form and trend streak records.",
  },
  odds: {
    title: "Odds",
    description: "Bookmaker odds snapshots.",
  },
};

const SPORTCC_MATCH_META_KEYS = [
  "id",
  "status",
  "date",
  "curentPeriod",
  "roundId",
  "roundName",
  "minutes",
  "commentary",
  "published",
  "fttime",
  "winner",
  "ibwd",
  "isFavourite",
  "plusMinutes",
  "plusBit",
];

function withoutSocialLinks(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutSocialLinks);
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (/^socialLinks$/i.test(key)) continue;
    out[key] = withoutSocialLinks(child);
  }
  return out;
}

function cloneSection<T = unknown>(value: unknown): T | undefined {
  if (value === undefined || value === null) return undefined;
  return withoutSocialLinks(value) as T;
}

function sectionCount(value: unknown): number | undefined {
  if (Array.isArray(value)) return value.length;
  if (isRecord(value)) return Object.keys(value).length;
  return undefined;
}

function buildSportccAvailableData(
  match: Record<string, unknown>,
  ctx: Pick<SportccContext, "tournamentName" | "categoryName" | "season">,
): SixLogicAvailableData {
  const competition = cloneSection<Record<string, unknown>>({
    categoryName: ctx.categoryName,
    tournamentName: ctx.tournamentName,
    season: ctx.season,
  });
  const matchMeta = cloneSection<Record<string, unknown>>(
    Object.fromEntries(SPORTCC_MATCH_META_KEYS.map((key) => [key, match[key]]).filter(([, value]) => value !== undefined)),
  );
  const data: SixLogicAvailableData = {
    competition,
    matchMeta,
    venue: cloneSection(match.venue),
    officials: cloneSection<unknown[]>(match.official),
    competitors: cloneSection<unknown[]>(match.competitor),
    score: cloneSection<unknown[]>(match.score),
    goals: cloneSection<unknown[]>(match.goal),
    cards: cloneSection<unknown[]>(match.card),
    corners: cloneSection<unknown[]>(match.corners),
    substitutions: cloneSection<unknown[]>(match.substitution),
    matchChannels: cloneSection<unknown[]>(match.matchChannels),
    leagueTable: cloneSection<unknown[]>(match.leagueTable),
    matchCommentary: cloneSection<unknown[]>(match.matchCommentary),
    matchTeamStats: cloneSection<unknown[]>(match.matchTeamStats),
    headToHead: cloneSection<unknown[]>(match.headToHead),
    lastHomeResults: cloneSection<unknown[]>(match.lastHomeResults),
    lastAwayResults: cloneSection<unknown[]>(match.lastAwayResults),
    upcomingHomeFixtures: cloneSection<unknown[]>(match.upcomingHomeFixtures),
    upcomingAwayFixtures: cloneSection<unknown[]>(match.upcomingAwayFixtures),
    streaks: cloneSection<unknown[]>(match.streaks),
    odds: cloneSection<unknown[]>(match.odds),
    sections: [],
  };

  const knownRawKeys = new Set([
    ...SPORTCC_MATCH_META_KEYS,
    "venue",
    "official",
    "competitor",
    "score",
    "goal",
    "card",
    "corners",
    "substitution",
    "matchChannels",
    "leagueTable",
    "matchCommentary",
    "matchTeamStats",
    "headToHead",
    "lastHomeResults",
    "lastAwayResults",
    "upcomingHomeFixtures",
    "upcomingAwayFixtures",
    "streaks",
    "odds",
    "socialLinks",
    "summary",
  ]);
  const otherSections: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(match)) {
    if (knownRawKeys.has(key) || value === undefined || value === null) continue;
    otherSections[key] = cloneSection(value);
  }
  if (Object.keys(otherSections).length > 0) data.otherSections = otherSections;

  const sectionValues: Array<[keyof SixLogicAvailableData, unknown]> = [
    ["competition", data.competition],
    ["matchMeta", data.matchMeta],
    ["venue", data.venue],
    ["officials", data.officials],
    ["competitors", data.competitors],
    ["score", data.score],
    ["goals", data.goals],
    ["cards", data.cards],
    ["corners", data.corners],
    ["substitutions", data.substitutions],
    ["matchChannels", data.matchChannels],
    ["leagueTable", data.leagueTable],
    ["matchCommentary", data.matchCommentary],
    ["matchTeamStats", data.matchTeamStats],
    ["headToHead", data.headToHead],
    ["lastHomeResults", data.lastHomeResults],
    ["lastAwayResults", data.lastAwayResults],
    ["upcomingHomeFixtures", data.upcomingHomeFixtures],
    ["upcomingAwayFixtures", data.upcomingAwayFixtures],
    ["streaks", data.streaks],
    ["odds", data.odds],
  ];
  data.sections = sectionValues
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const meta = SPORTCC_AVAILABLE_SECTION_DESCRIPTIONS[String(key)] ?? {
        title: String(key),
        description: "Additional SixLogics feed section.",
      };
      return {
        key: String(key),
        title: meta.title,
        description: meta.description,
        count: sectionCount(value),
      };
    });
  if (data.otherSections) {
    data.sections.push({
      key: "otherSections",
      title: "Other available sections",
      description: "Additional SixLogics match fields not covered by the standard section map.",
      count: Object.keys(data.otherSections).length,
    });
  }
  return data;
}

function normaliseSportccFoundation(params: {
  payload: unknown;
  matchId: string;
  sportId: string;
}): SixLogicFoundation | null {
  const ctx = findSportccMatch(params.payload, params.matchId);
  if (!ctx) return null;
  const { match, tournamentName, categoryName, season } = ctx;
  const competitors = Array.isArray(match.competitor) ? match.competitor.filter(isRecord) : [];
  const homeComp = competitors.find((row) => asString(row.type) === "1") ?? competitors[0];
  const awayComp = competitors.find((row) => asString(row.type) === "2") ?? competitors[1];
  const homeTeam = asString(homeComp?.name) ?? "Home";
  const awayTeam = asString(awayComp?.name) ?? "Away";
  const parsedScore = parseSportccScore(match.score);
  const competition = [categoryName, tournamentName].filter(Boolean).join(" · ") || "Unknown competition";
  const venueDetails = parseSportccVenue(match);
  const facts: SixLogicFacts = {
    homeTeam,
    awayTeam,
    homeScore: parsedScore.home,
    awayScore: parsedScore.away,
    competition,
    season,
    round: asString(match.roundName ?? match.round),
    kickoffIso: asString(match.date ?? match.kickoff),
    fullTimeIso: asString(match.fttime ?? match.full_time),
    addedTimeMinutes: asString(match.plusMinutes ?? match.added_time),
    ...venueDetails,
    homeCoach: parseSportccCoach(homeComp),
    awayCoach: parseSportccCoach(awayComp),
    referee: parseSportccReferee(match),
    status: asString(match.status ?? match.matchStatus ?? match.curentPeriod),
    minuteElapsed: asNumber(match.minute ?? match.minutes),
  };
  return {
    matchId: params.matchId,
    sportId: params.sportId,
    facts,
    lineups: {
      home: parseSportccLineUp(homeComp?.lineUp ?? homeComp?.lineup),
      away: parseSportccLineUp(awayComp?.lineUp ?? awayComp?.lineup),
    },
    events: parseSportccEvents(match),
    commentary: parseSportccCommentary(match),
    availableData: buildSportccAvailableData(match, ctx),
    summaryText: asString(match.summary),
    normalisedAt: new Date().toISOString(),
    sourceKeyPaths: flattenJsonKeyPaths(match, 80),
  };
}

export function normaliseSixLogicFoundation(params: {
  payload: unknown;
  matchId: string;
  sportId: string;
}): SixLogicFoundation {
  const sportcc = normaliseSportccFoundation(params);
  if (sportcc) return sportcc;

  const { payload, matchId, sportId } = params;
  const root = isRecord(payload) && isRecord(payload.fixture) ? payload.fixture : payload;
  const homeTeam =
    firstString(
      root,
      [
        "home_team.name",
        "home_team",
        "homeTeam.name",
        "homeTeam",
        "HomeTeam.name",
        "HomeTeam",
        "teams.home.name",
        "teams.home",
      ],
      [/home.*team|team.*home|homeclub|home_club/i],
    ) ?? "Home";
  const awayTeam =
    firstString(
      root,
      [
        "away_team.name",
        "away_team",
        "awayTeam.name",
        "awayTeam",
        "AwayTeam.name",
        "AwayTeam",
        "teams.away.name",
        "teams.away",
      ],
      [/away.*team|team.*away|awayclub|away_club/i],
    ) ?? "Away";
  const homeScore = firstNumber(
    root,
    ["score_home", "home_score", "homeScore", "ScoreHome", "result.home", "score.home", "full_time.home"],
    [/home.*score|score.*home/i],
  );
  const awayScore = firstNumber(
    root,
    ["score_away", "away_score", "awayScore", "ScoreAway", "result.away", "score.away", "full_time.away"],
    [/away.*score|score.*away/i],
  );
  const competition =
    firstString(
      root,
      [
        "competition.name",
        "competition",
        "league.name",
        "league",
        "tournament.name",
        "CompetitionName",
      ],
      [/competition|league|tournament/i],
    ) ?? "Unknown competition";
  const kickoffIso =
    firstString(
      root,
      ["kickoff_iso", "kickoff", "kick_off", "date", "start_time", "StartTime", "fixture_date"],
      [/kickoff|kick.?off|start.?time|fixture.?date/i],
    ) ?? undefined;
  const venueObj = getByPaths(root, ["venue", "stadium", "Venue"]);
  const venueRecord = isRecord(venueObj) ? venueObj : null;
  const venue =
    firstString(root, ["stadium.name", "stadium", "venue.name", "venue", "StadiumName"], [/stadium|venue/i]) ??
    asString(venueRecord?.name);
  const venueCity = asString(venueRecord?.city) ?? firstString(root, ["venue.city", "stadium.city"], [/city/i]);
  const venueCapacity =
    asNumber(venueRecord?.capacity) ??
    firstNumber(root, ["venue.capacity", "stadium.capacity"], [/capacity/i]);
  const attendance =
    asNumber(venueRecord?.spectators ?? venueRecord?.attendance) ??
    firstNumber(root, ["venue.spectators", "venue.attendance", "attendance"], [/spectator|attendance/i]);
  const officials = Array.isArray(getByPath(root, "official")) ? getByPath(root, "official") : [];
  const refereeFromOfficials = Array.isArray(officials)
    ? officials
        .filter(isRecord)
        .find((row) => /referee/i.test(asString(row.type) ?? "")) ??
      (officials.filter(isRecord)[0] as Record<string, unknown> | undefined)
    : undefined;
  const referee =
    asString(refereeFromOfficials?.name) ??
    firstString(root, ["referee.name", "referee", "RefereeName"], [/referee/i]) ??
    undefined;
  const homeCoach =
    asString(getByPath(root, "competitor.0.coach.name")) ??
    asString(getByPath(root, "home_coach.name")) ??
    firstString(root, ["home_coach", "homeCoach"], [/home.*coach/i]);
  const awayCoach =
    asString(getByPath(root, "competitor.1.coach.name")) ??
    asString(getByPath(root, "away_coach.name")) ??
    firstString(root, ["away_coach", "awayCoach"], [/away.*coach/i]);
  const status =
    firstString(root, ["status", "match_status", "fixture_status", "Status"], [/status/i]) ?? undefined;
  const minuteElapsed = firstNumber(root, ["minute_elapsed", "minute", "clock"], [/minute|elapsed|clock/i]);
  const round =
    firstString(root, ["roundName", "round_name", "round"], [/round/i]) ?? undefined;
  const season =
    firstString(root, ["season", "tournament.season", "Season"], [/season/i]) ?? undefined;
  const fullTimeIso =
    firstString(root, ["fttime", "full_time", "fullTime"], [/fttime|full.?time/i]) ?? undefined;
  const addedTimeMinutes =
    firstString(root, ["plusMinutes", "added_time", "injury_time"], [/plus.?minute|added.?time|injury.?time/i]) ??
    undefined;
  const facts: SixLogicFacts = {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    competition,
    competitionCode: firstString(root, ["competitionCode", "competition_code"], [/competition.?code/i]),
    kickoffIso,
    fullTimeIso,
    round,
    season,
    addedTimeMinutes,
    venue,
    venueCity,
    venueCapacity,
    attendance,
    homeCoach,
    awayCoach,
    referee,
    status,
    minuteElapsed,
  };
  return {
    matchId,
    sportId,
    facts,
    lineups: {
      home: parseLineupSide(root, "home"),
      away: parseLineupSide(root, "away"),
    },
    events: parseEvents(root),
    commentary: parseCommentary(root),
    summaryText:
      firstString(root, ["match_summary_text", "summary", "matchSummary", "SummaryText"], [/summary/i]) ??
      undefined,
    normalisedAt: new Date().toISOString(),
    sourceKeyPaths: typeof root === "object" && root !== null ? flattenJsonKeyPaths(root, 80) : [],
  };
}

export function isPreMatchSixLogicStatus(status?: string): boolean {
  if (!status?.trim()) return false;
  const norm = status.trim().toUpperCase();
  return (
    norm === "NSY" ||
    norm === "NOT STARTED" ||
    norm === "NOTSTARTED" ||
    norm === "SCHEDULED" ||
    norm === "FIXTURE" ||
    norm === "PREMATCH" ||
    norm === "PRE-MATCH" ||
    norm.includes("NOT START")
  );
}

export function isPreMatchSixLogicFoundation(foundation: SixLogicFoundation): boolean {
  const { homeScore, awayScore, status } = foundation.facts;
  if (isPreMatchSixLogicStatus(status)) return true;
  return homeScore === undefined && awayScore === undefined;
}

export type SixLogicHealthOptions = {
  contentType?: "match_report" | "match_preview";
};

export function assessSixLogicHealth(
  foundation: SixLogicFoundation,
  options?: SixLogicHealthOptions,
): {
  ok: boolean;
  missingCore: string[];
  preMatch: boolean;
} {
  const missingCore: string[] = [];
  const preMatch = isPreMatchSixLogicFoundation(foundation);
  const skipScoreRequirement = options?.contentType === "match_preview";

  if (!foundation.facts.homeTeam || foundation.facts.homeTeam === "Home") missingCore.push("homeTeam");
  if (!foundation.facts.awayTeam || foundation.facts.awayTeam === "Away") missingCore.push("awayTeam");
  if (!skipScoreRequirement) {
    if (foundation.facts.homeScore === undefined) missingCore.push("homeScore");
    if (foundation.facts.awayScore === undefined) missingCore.push("awayScore");
  }
  if (!foundation.facts.competition || foundation.facts.competition === "Unknown competition") {
    missingCore.push("competition");
  }
  return { ok: missingCore.length === 0, missingCore, preMatch };
}

export function buildMatchFoundationSummary(foundation: SixLogicFoundation): string {
  const { facts, events, lineups } = foundation;
  const score =
    facts.homeScore !== undefined && facts.awayScore !== undefined
      ? `${facts.homeTeam} ${facts.homeScore}-${facts.awayScore} ${facts.awayTeam}`
      : `${facts.homeTeam} vs ${facts.awayTeam}`;
  const venueLabel = facts.venue
    ? `Venue ${facts.venue}${facts.venueCity ? `, ${facts.venueCity}` : ""}`
    : null;
  const parts = [
    score,
    facts.competition,
    facts.round,
    facts.season ? `Season ${facts.season}` : null,
    facts.kickoffIso ? `Kick-off ${facts.kickoffIso}` : null,
    facts.fullTimeIso ? `Full time ${facts.fullTimeIso}` : null,
    facts.addedTimeMinutes ? `+${facts.addedTimeMinutes} mins added time` : null,
    venueLabel,
    facts.attendance !== undefined ? `Attendance ${facts.attendance.toLocaleString()}` : null,
    facts.referee ? `Referee ${facts.referee}` : null,
    facts.homeCoach && facts.awayCoach ? `Coaches ${facts.homeCoach} vs ${facts.awayCoach}` : null,
    `${events.length} events`,
    `${lineups.home.starters.length + lineups.away.starters.length} starters listed`,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function buildDisplayLabel(foundation: SixLogicFoundation): string {
  const { homeTeam, awayTeam, homeScore, awayScore } = foundation.facts;
  if (homeScore !== undefined && awayScore !== undefined) {
    return `${homeTeam} ${homeScore} ${awayTeam} ${awayScore}`;
  }
  return `${homeTeam} vs ${awayTeam}`;
}

export type FoundationImportPreview = {
  matchDetails: Array<{ label: string; value: string }>;
  venueDetails: Array<{ label: string; value: string }>;
  coaches: Array<{ team: string; name: string }>;
  eventBreakdown: Array<{ label: string; count: number }>;
  keyMoments: Array<{ minute?: number; text: string }>;
  lineups: Array<{
    side: "home" | "away";
    teamName: string;
    formation?: string;
    starters: string[];
    substituteCount: number;
  }>;
  commentaryNote: string;
  preMatch: boolean;
  previewFeedHighlights: Array<{ label: string; count: number }>;
};

const PREVIEW_FEED_SECTION_LABELS: Record<string, string> = {
  headToHead: "Head-to-head",
  lastHomeResults: "Home recent form",
  lastAwayResults: "Away recent form",
  upcomingHomeFixtures: "Home upcoming fixtures",
  upcomingAwayFixtures: "Away upcoming fixtures",
  odds: "Bookmaker odds",
  leagueTable: "Group / league table",
  streaks: "Form streaks",
};

function buildPreviewFeedHighlights(foundation: SixLogicFoundation): FoundationImportPreview["previewFeedHighlights"] {
  const sections = foundation.availableData?.sections ?? [];
  return sections
    .filter((section): section is typeof section & { count: number } => {
      const count = section.count ?? 0;
      return section.key in PREVIEW_FEED_SECTION_LABELS && count > 0;
    })
    .map((section) => ({
      label: PREVIEW_FEED_SECTION_LABELS[section.key] ?? section.title,
      count: section.count,
    }));
}

function eventCategory(type: string): "goal" | "yellow" | "red" | "substitution" | "other" {
  const t = type.toLowerCase();
  if (t.includes("goal")) return "goal";
  if (t.includes("yellow")) return "yellow";
  if (t.includes("red")) return "red";
  if (t.includes("sub")) return "substitution";
  return "other";
}

function formatLineupPlayer(player: SixLogicPlayer): string {
  const pos = player.position?.trim();
  return pos ? `${player.name} (${pos})` : player.name;
}

function formatKeyMoment(event: SixLogicEvent, facts: SixLogicFacts): string {
  if (event.text && event.text !== event.type && !/^substitution$/i.test(event.text.trim())) {
    return event.text;
  }
  const team =
    event.teamSide === "home" ? facts.homeTeam : event.teamSide === "away" ? facts.awayTeam : null;
  const parts = [event.type];
  if (event.playerName) parts.push(event.playerName);
  if (team) parts.push(team);
  return parts.join(" · ");
}

function isNotableMoment(event: SixLogicEvent): boolean {
  const category = eventCategory(event.type);
  if (category === "goal" || category === "yellow" || category === "red") return true;
  return event.minute !== undefined && category !== "substitution";
}

export function buildFoundationImportPreview(foundation: SixLogicFoundation): FoundationImportPreview {
  const { facts, events, lineups, commentary } = foundation;
  const preMatch = isPreMatchSixLogicFoundation(foundation);
  const counts = { goal: 0, yellow: 0, red: 0, substitution: 0, other: 0 };
  for (const event of events) {
    counts[eventCategory(event.type)] += 1;
  }

  const matchDetails: FoundationImportPreview["matchDetails"] = [
    {
      label: preMatch ? "Fixture" : "Result",
      value: preMatch
        ? `${facts.homeTeam} vs ${facts.awayTeam}`
        : `${facts.homeTeam} ${facts.homeScore ?? "?"}-${facts.awayScore ?? "?"} ${facts.awayTeam}`,
    },
    { label: "Status", value: facts.status ?? "Unknown" },
    { label: "Competition", value: facts.competition },
  ];
  if (facts.round) matchDetails.push({ label: "Round", value: facts.round });
  if (facts.season) matchDetails.push({ label: "Season", value: facts.season });
  if (facts.kickoffIso) matchDetails.push({ label: "Kick-off", value: facts.kickoffIso });
  if (facts.fullTimeIso) matchDetails.push({ label: "Full time", value: facts.fullTimeIso });
  if (facts.addedTimeMinutes) {
    matchDetails.push({ label: "Added time", value: `+${facts.addedTimeMinutes} mins` });
  }
  if (facts.referee) matchDetails.push({ label: "Referee", value: facts.referee });
  matchDetails.push({ label: "SixLogics match ID", value: foundation.matchId });

  const venueDetails: FoundationImportPreview["venueDetails"] = [];
  if (facts.venue) venueDetails.push({ label: "Stadium", value: facts.venue });
  if (facts.venueCity) venueDetails.push({ label: "City", value: facts.venueCity });
  if (facts.venueCapacity !== undefined) {
    venueDetails.push({ label: "Capacity", value: facts.venueCapacity.toLocaleString() });
  }
  if (facts.attendance !== undefined) {
    venueDetails.push({ label: "Attendance", value: facts.attendance.toLocaleString() });
  }

  const coaches: FoundationImportPreview["coaches"] = [];
  if (facts.homeCoach) coaches.push({ team: facts.homeTeam, name: facts.homeCoach });
  if (facts.awayCoach) coaches.push({ team: facts.awayTeam, name: facts.awayCoach });

  const eventBreakdown: FoundationImportPreview["eventBreakdown"] = [
    { label: "Goals", count: counts.goal },
    { label: "Yellow cards", count: counts.yellow },
    { label: "Red cards", count: counts.red },
    { label: "Substitutions", count: counts.substitution },
  ].filter((row) => row.count > 0);
  if (counts.other > 0) eventBreakdown.push({ label: "Other events", count: counts.other });

  const keyMoments = events
    .filter(isNotableMoment)
    .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999))
    .slice(0, 8)
    .map((event) => ({
      minute: event.minute,
      text: formatKeyMoment(event, facts),
    }));

  const lineupPreview = (side: "home" | "away", lineup: SixLogicLineup): FoundationImportPreview["lineups"][number] => ({
    side,
    teamName: side === "home" ? facts.homeTeam : facts.awayTeam,
    formation: lineup.formation,
    starters: lineup.starters.map(formatLineupPlayer),
    substituteCount: lineup.substitutes.length,
  });

  const commentaryNote = preMatch
    ? commentary.length > 0
      ? `${commentary.length} commentary lines in feed (unusual for a pre-match fixture).`
      : "Pre-match fixture — no live commentary yet. Preview will use form, H2H, table stakes and odds from the feed."
    : commentary.length > 0
      ? `${commentary.length} commentary lines included from SixLogics.`
      : "No live commentary in the SixLogics feed — the commentary import step will use match events if available.";

  return {
    matchDetails,
    venueDetails,
    coaches,
    eventBreakdown,
    keyMoments,
    lineups: [lineupPreview("home", lineups.home), lineupPreview("away", lineups.away)],
    commentaryNote,
    preMatch,
    previewFeedHighlights: buildPreviewFeedHighlights(foundation),
  };
}
