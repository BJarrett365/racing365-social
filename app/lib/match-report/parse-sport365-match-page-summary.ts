import { extractSport365NextDataJson, fetchSport365MatchPageHtml } from "@/app/lib/match-report/fetch-sport365-match-page";
import { assertSport365MatchUrl } from "@/app/lib/match-report/parse-sport365-commentary";
import { nationalTeamCrestUrl } from "@/app/lib/national-team-crest";

export type Sport365MatchScorer = {
  minuteLabel: string;
  player: string;
  type: "goal" | "own_goal";
  /** Team credited with the goal on the scoreboard */
  team: string;
};

export type Sport365MatchPageSummary = {
  sourceUrl: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  /** Raw Sport365 clock text e.g. 90+9' */
  status?: string;
  /** Display label e.g. Finished */
  statusLabel?: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  scorers: Sport365MatchScorer[];
  commentaryDigest?: string;
};

type CommRow = {
  txt?: string;
  min?: number;
  inj_time?: number;
  type?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function minuteLabel(min?: number, injTime?: number): string {
  if (min === undefined) return "?";
  if (injTime !== undefined && injTime > 0) return `${min}+${injTime}'`;
  return `${min}'`;
}

function extractPlayerFromGoalText(text: string): string {
  const own = text.match(/OWN GOAL\s*[-–]\s*(.+?)(?:\s+sends|\s*$)/i);
  if (own?.[1]) return own[1].trim();
  const stripped = text.replace(/^G(?:\s*O)+\s*(?:\s*A)*\s*L\s*[-–]\s*/i, "").trim();
  const fromStripped = stripped.match(/^(.+?)\s+scores(?:\s+with|\b)/i);
  if (fromStripped?.[1]) return fromStripped[1].trim();
  const goal = text.match(/G(?:\s*O)+\s*(?:\s*A)*\s*L\s*[-–]\s*(.+?)\s+scores\b/i);
  if (goal?.[1]) return goal[1].trim();
  const simple = text.match(/(.+?)\s+scores with/i);
  if (simple?.[1]) return simple[1].replace(/^G(?:\s*O)+\s*(?:\s*A)*\s*L\s*[-–]\s*/i, "").trim();
  return text.slice(0, 60).trim();
}

function commSortKey(row: CommRow): number {
  const min = row.min ?? 0;
  const inj = row.inj_time ?? 0;
  return min * 100 + inj;
}

function inferScoringTeam(
  goal: CommRow,
  allComms: CommRow[],
  homeTeam: string,
  awayTeam: string,
): string {
  const minute = goal.min ?? 0;
  const inj = goal.inj_time ?? 0;
  const nearby = allComms.filter((row) => {
    const cm = row.min ?? 0;
    const ci = row.inj_time ?? 0;
    if (Math.abs(cm - minute) > 2) return false;
    if (cm === minute && Math.abs(ci - inj) <= 3) return true;
    return Math.abs(cm - minute) <= 1;
  });

  if (goal.type === 7) {
    for (const line of nearby) {
      const text = line.txt ?? "";
      if (new RegExp(`from ${awayTeam}\\b`, "i").test(text)) return homeTeam;
      if (new RegExp(`from ${homeTeam}\\b`, "i").test(text)) return awayTeam;
    }
    return homeTeam;
  }

  for (const line of nearby) {
    const text = line.txt ?? "";
    if (new RegExp(`from ${homeTeam}\\b`, "i").test(text)) return homeTeam;
    if (new RegExp(`from ${awayTeam}\\b`, "i").test(text)) return awayTeam;
  }
  for (const line of nearby) {
    const text = line.txt ?? "";
    if (new RegExp(`\\b${homeTeam}\\b`, "i").test(text) && /assist|pass for the goal|scores with|dangerous attack|in control/i.test(text)) {
      return homeTeam;
    }
    if (new RegExp(`\\b${awayTeam}\\b`, "i").test(text) && /assist|pass for the goal|scores with|dangerous attack|in control/i.test(text)) {
      return awayTeam;
    }
  }
  return homeTeam;
}

function isGoalComm(row: CommRow): boolean {
  if (row.type === 4 || row.type === 7) return true;
  const text = row.txt ?? "";
  if (/OWN GOAL/i.test(text)) return true;
  // Sport365 spells goals as "G O O O A A A L" — do not match plain "goal" in assists or goal kicks.
  return /G\s*O{2,}\s*A{2,}\s*L/i.test(text) && /scores with|scores\b/i.test(text);
}

type IncidentRow = {
  min?: number;
  min_plus?: number;
  inj_time?: number;
  type?: number;
  pos?: number;
  pl_name?: string;
};

function incidentSortKey(row: IncidentRow): number {
  const min = row.min ?? 0;
  const inj = row.min_plus ?? row.inj_time ?? 0;
  return min * 100 + inj;
}

function parseScorersFromIncidents(
  incs: unknown,
  homeTeam: string,
  awayTeam: string,
): Sport365MatchScorer[] {
  if (!isRecord(incs)) return [];
  const rows: IncidentRow[] = [];
  for (const period of Object.values(incs)) {
    if (!isRecord(period)) continue;
    for (const minuteEvents of Object.values(period)) {
      if (!Array.isArray(minuteEvents)) continue;
      for (const event of minuteEvents) {
        if (isRecord(event)) rows.push(event as IncidentRow);
      }
    }
  }
  return rows
    .filter((row) => row.type === 4 || row.type === 7)
    .sort((a, b) => incidentSortKey(a) - incidentSortKey(b))
    .map((row) => {
      const player = typeof row.pl_name === "string" ? row.pl_name.trim() : "";
      const team = row.pos === 1 ? awayTeam : homeTeam;
      return {
        minuteLabel: minuteLabel(row.min, row.min_plus ?? row.inj_time),
        player,
        type: (row.type === 7 ? "own_goal" : "goal") as Sport365MatchScorer["type"],
        team,
      };
    })
    .filter((row) => row.player);
}

function parseScorers(comms: CommRow[], homeTeam: string, awayTeam: string): Sport365MatchScorer[] {
  const goalRows = comms.filter(isGoalComm);
  const sorted = [...goalRows].sort((a, b) => commSortKey(a) - commSortKey(b));
  return sorted.map((row) => {
    const text = row.txt ?? "";
    const player = extractPlayerFromGoalText(text);
    const team = inferScoringTeam(row, comms, homeTeam, awayTeam);
    return {
      minuteLabel: minuteLabel(row.min, row.inj_time),
      player,
      type: row.type === 7 || /OWN GOAL/i.test(text) ? "own_goal" : "goal",
      team,
    };
  });
}

function buildCommentaryDigest(comms: CommRow[]): string {
  const sorted = [...comms].sort((a, b) => commSortKey(a) - commSortKey(b));
  const key = sorted.filter((row) => {
    const text = row.txt ?? "";
    if (row.type === 4 || row.type === 7 || row.type === 10) return true;
    return /red card|penalty|VAR|substitution|scores with|OWN GOAL|final whistle|deserved victory/i.test(text);
  });
  const picked = (key.length > 0 ? key : sorted.slice(-20)).slice(0, 30);
  return picked
    .map((row) => {
      const label = minuteLabel(row.min, row.inj_time);
      return `${label} ${(row.txt ?? "").replace(/\s+/g, " ").trim()}`;
    })
    .join("\n");
}

/** Sport365 status 6 = full time on finished matches. */
export function sport365MatchStatusLabel(input: {
  statusCode?: number;
  statusTxt?: string;
}): string {
  const txt = input.statusTxt?.trim() ?? "";
  if (input.statusCode === 6 || /^90\+|^FT$/i.test(txt) || /full.?time|finished|final whistle/i.test(txt)) {
    return "Finished";
  }
  if (/^HT$|half.?time/i.test(txt)) return "Half-time";
  if (txt) return txt;
  return "";
}

export function parseSport365MatchPageSummaryFromHtml(html: string, sourceUrl: string): Sport365MatchPageSummary | null {
  const nextData = extractSport365NextDataJson(html);
  if (!nextData || !isRecord(nextData)) return null;
  const pageProps =
    isRecord(nextData.props) && isRecord(nextData.props.pageProps) ? nextData.props.pageProps : null;
  const match = pageProps && isRecord(pageProps.match) ? pageProps.match : null;
  if (!match) return null;

  const teams = Array.isArray(match.teams) ? match.teams : [];
  const home = teams.find((t) => isRecord(t) && t.pos === 0) ?? teams[0];
  const away = teams.find((t) => isRecord(t) && t.pos === 1) ?? teams[1];
  const homeTeam = isRecord(home) && typeof home.name === "string" ? home.name.trim() : "";
  const awayTeam = isRecord(away) && typeof away.name === "string" ? away.name.trim() : "";
  if (!homeTeam || !awayTeam) return null;

  const scoreArr = Array.isArray(match.score) ? match.score : [];
  const homeScore = asNumber(scoreArr[0]) ?? 0;
  const awayScore = asNumber(scoreArr[1]) ?? 0;
  const statusCode = asNumber(match.status);
  const status = typeof match.status_txt === "string" ? match.status_txt.trim() : undefined;
  const statusLabel = sport365MatchStatusLabel({ statusCode, statusTxt: status });
  const comms = (Array.isArray(match.comms) ? match.comms : []) as CommRow[];
  const scorersFromIncidents = parseScorersFromIncidents(match.incs, homeTeam, awayTeam);
  const scorers = scorersFromIncidents.length > 0 ? scorersFromIncidents : parseScorers(comms, homeTeam, awayTeam);
  const commentaryDigest = comms.length > 0 ? buildCommentaryDigest(comms) : undefined;

  return {
    sourceUrl,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    status,
    statusLabel,
    homeLogoUrl: nationalTeamCrestUrl(homeTeam),
    awayLogoUrl: nationalTeamCrestUrl(awayTeam),
    scorers,
    commentaryDigest,
  };
}

export async function parseSport365MatchPageSummary(sourceUrl: string): Promise<Sport365MatchPageSummary | null> {
  const url = assertSport365MatchUrl(sourceUrl).toString();
  const html = await fetchSport365MatchPageHtml(url);
  return parseSport365MatchPageSummaryFromHtml(html, url);
}

export function normalizeSport365ScorerPlayerName(player: string): string {
  const trimmed = player.trim();
  if (!trimmed) return "";
  if (/^G(?:\s*O)+\s*(?:\s*A)*\s*L/i.test(trimmed) || /OWN GOAL/i.test(trimmed)) {
    const extracted = extractPlayerFromGoalText(trimmed);
    if (extracted && !/^G(?:\s*O)/i.test(extracted)) return extracted;
    const dashName = trimmed.match(/^G(?:\s*O)+\s*(?:\s*A)*\s*L\s*[-–]\s*(.+)$/i);
    if (dashName?.[1]) return dashName[1].trim();
  }
  return trimmed;
}

export function normalizeSport365Scorer(row: Sport365MatchScorer): Sport365MatchScorer {
  return {
    ...row,
    player: normalizeSport365ScorerPlayerName(row.player),
  };
}

export function hasLegacySport365ScorerRows(scorers: Sport365MatchScorer[]): boolean {
  return scorers.some((row) => /^G(?:\s*O)+\s*(?:\s*A)*\s*L/i.test(row.player.trim()));
}

export function isSport365GoalScorerEntry(row: Sport365MatchScorer): boolean {
  const player = normalizeSport365ScorerPlayerName(row.player);
  if (!player) return false;
  if (/goal kick|assist|pass for the goal|key pass|provided the assist|directs a header|could cost his team|dangerous attack|in control of the ball/i.test(player)) {
    return false;
  }
  return row.type === "goal" || row.type === "own_goal";
}

export function sanitizeSport365Scorers(scorers: Sport365MatchScorer[]): Sport365MatchScorer[] {
  return scorers.map(normalizeSport365Scorer).filter(isSport365GoalScorerEntry);
}

export function formatSport365MatchScoreLine(summary: Sport365MatchPageSummary): string {
  return `${summary.homeTeam} ${summary.homeScore} – ${summary.awayScore} ${summary.awayTeam}`;
}

export function formatSport365ScorersLine(summary: Sport365MatchPageSummary): string {
  const home = summary.scorers.filter((s) => s.team === summary.homeTeam);
  const away = summary.scorers.filter((s) => s.team === summary.awayTeam);
  const fmt = (rows: Sport365MatchScorer[]) =>
    rows
      .map((s) => `${s.player}${s.type === "own_goal" ? " (OG)" : ""} ${s.minuteLabel}`)
      .join(", ");
  const parts: string[] = [];
  if (home.length) parts.push(`${summary.homeTeam}: ${fmt(home)}`);
  if (away.length) parts.push(`${summary.awayTeam}: ${fmt(away)}`);
  return parts.join(" · ");
}
