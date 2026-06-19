import type {
  EventPicture,
  FixtureContextIntelligence,
  FixtureMeetingSnapshot,
  LeagueTableIntelligence,
  MatchReportProject,
  SixLogicEvent,
  Sport365CommentaryLine,
} from "@/app/lib/match-report/types";

export type PreviewPossession = {
  homePct: number;
  awayPct: number;
};

export type PreviewEvent = {
  minuteLabel: string;
  type: "goal" | "yellow" | "red" | "other";
  playerName?: string;
  teamName: string;
  summary?: string;
  sortKey: number;
};

export type PreviewContextRow = {
  label: string;
  value: string;
};

export type PreviewScoreboard = {
  competition: string;
  season?: string;
  round?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  homeCoach?: string;
  awayCoach?: string;
  homeFormation?: string;
  awayFormation?: string;
  kickoffIso?: string;
  venue?: string;
  attendance?: number;
  status?: string;
};

export type PreviewReportSections = {
  mainParagraphs: string[];
  extendedText: string;
};

const POSSESSION_RE =
  /Ball possession:\s*[^:]+:\s*(\d+)%,\s*[^:]+:\s*(\d+)%/i;

const MINUTE_LABEL_RE = /\[(\d+(?:\+\d+)?)'/;

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseParagraphsFromHtml(html: string): string[] {
  const paragraphs: string[] = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const text = stripHtml(match[1] ?? "");
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

function extractHtmlSectionByH2(html: string, title: string): string {
  const heading = new RegExp(`<h2[^>]*>\\s*${title}\\s*<\\/h2>`, "i");
  const match = heading.exec(html);
  if (match?.index == null) return "";
  const start = match.index + match[0].length;
  const next = html.slice(start).search(/<h2[\s>]/i);
  return next >= 0 ? html.slice(start, start + next) : html.slice(start);
}

function truncateBeforeSection(html: string, headings: RegExp[]): string {
  let cutIndex = html.length;
  for (const heading of headings) {
    const match = heading.exec(html);
    if (match?.index != null && match.index < cutIndex) cutIndex = match.index;
  }
  return html.slice(0, cutIndex);
}

export function stripReportHtmlForNarrative(html: string): string {
  const withoutRatings = truncateBeforeSection(html, [
    /<h2[^>]*>\s*Player Ratings/i,
    /<h3[^>]*>\s*Leeds/i,
    /<table[\s>]/i,
  ]);
  return truncateBeforeSection(withoutRatings, [/<h2[^>]*>\s*16 Conclusions/i]);
}

function extractReportSectionsCombined(html: string, titles: string[]): string {
  return titles.map((title) => extractHtmlSectionByH2(html, title)).filter(Boolean).join("\n");
}

export function parseReportSections(reportHtml: string, eventPicture: EventPicture | null): PreviewReportSections {
  const narrativeHtml = stripReportHtmlForNarrative(reportHtml);
  const storyHtml = extractReportSectionsCombined(narrativeHtml, ["The Story", "Turning Point"]);
  const legacyAnalysisHtml = extractHtmlSectionByH2(narrativeHtml, "Match Analysis");
  const legacyExtendedHtml = extractHtmlSectionByH2(narrativeHtml, "Extended Report");
  const report20ExtendedHtml = extractReportSectionsCombined(narrativeHtml, [
    "What It Means",
    "What Happens Next",
    "Football365 Verdict",
  ]);
  const analysisHtml = storyHtml || legacyAnalysisHtml;
  const extendedReportHtml = report20ExtendedHtml || legacyExtendedHtml;
  const extendedParagraphs = parseParagraphsFromHtml(extendedReportHtml);
  const mainParagraphs = parseParagraphsFromHtml(analysisHtml || narrativeHtml).filter(
    (paragraph) => !extendedReportHtml || !extendedParagraphs.includes(paragraph),
  );
  const extendedFromHtml = extendedParagraphs.join("\n\n");

  const extendedParts: string[] = [];
  if (extendedFromHtml) {
    extendedParts.push(extendedFromHtml);
  }
  if (eventPicture?.narrativeThreads?.length) {
    extendedParts.push(...eventPicture.narrativeThreads);
  }
  if (eventPicture?.factualAnchors?.length) {
    extendedParts.push(...eventPicture.factualAnchors);
  }

  return {
    mainParagraphs,
    extendedText: extendedParts.join(" "),
  };
}

export function extractPossessionFromCommentary(lines: Sport365CommentaryLine[]): PreviewPossession | null {
  let last: PreviewPossession | null = null;
  for (const line of lines) {
    const match = POSSESSION_RE.exec(line.text);
    if (!match) continue;
    last = {
      homePct: Number.parseInt(match[1] ?? "0", 10),
      awayPct: Number.parseInt(match[2] ?? "0", 10),
    };
  }
  return last;
}

function minuteLabelToSortKey(label: string): number {
  const match = /^(\d+)(?:\+(\d+))?'/.exec(label);
  if (!match) return 0;
  const base = Number.parseInt(match[1] ?? "0", 10);
  const added = Number.parseInt(match[2] ?? "0", 10);
  return base * 100 + added;
}

function parseMinuteLabelFromText(text: string): string | undefined {
  const match = MINUTE_LABEL_RE.exec(text);
  if (!match?.[1]) return undefined;
  return `${match[1]}'`;
}

function formatPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 2) {
    const [first, second] = parts;
    if (first?.includes("-") || (first && second && /^[A-Z][a-z'-]+$/.test(second ?? ""))) {
      return `${second} ${first}`;
    }
  }
  return name.trim();
}

function normalizePlayerKey(name: string): string {
  return formatPlayerName(name).toLowerCase().replace(/\s+/g, " ");
}

function eventTypeFromLabel(type: string): PreviewEvent["type"] {
  const lower = type.toLowerCase();
  if (lower.includes("goal")) return "goal";
  if (lower.includes("yellow")) return "yellow";
  if (lower.includes("red")) return "red";
  return "other";
}

function teamNameForSide(project: MatchReportProject, side?: "home" | "away" | "neutral"): string {
  if (side === "home") return project.homeTeam;
  if (side === "away") return project.awayTeam;
  return project.homeTeam;
}

function buildSport365EventMinutes(lines: Sport365CommentaryLine[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of lines) {
    const minuteLabel = parseMinuteLabelFromText(line.text);
    if (!minuteLabel) continue;

    const isGoal = /G\s+O+\s+(?:O+\s+)*A+\s+L|finds the net|\bscores?\b/i.test(line.text);
    const isCard = /book(?:ed)? him|yellow card|red card|sent off/i.test(line.text);
    if (!isGoal && !isCard) continue;

    const dashPlayer = /G\s+O/i.test(line.text)
      ? line.text.match(/-\s*([A-Z][A-Za-zÀ-ÿ' -]+?)\s+finds the net/i)
      : null;
    const inlinePlayer = line.text.match(/([A-Z][a-z]+ [A-Z][A-Za-z'-]+)\s+from\b/);
    const player = (dashPlayer?.[1] ?? inlinePlayer?.[1])?.trim();
    if (!player) continue;

    const kind = isGoal ? "goal" : isCard ? "card" : "other";
    map.set(`${normalizePlayerKey(player)}:${kind}`, minuteLabel);
  }
  return map;
}

function sixLogicEventsToPreview(
  events: SixLogicEvent[],
  project: MatchReportProject,
  minuteHints: Map<string, string>,
): PreviewEvent[] {
  const rows: PreviewEvent[] = [];
  for (const event of events) {
    const type = eventTypeFromLabel(event.type);
    if (type === "other" && event.type !== "Substitution") continue;
    if (event.type === "Substitution") continue;

    const playerKey = event.playerName ? normalizePlayerKey(event.playerName) : "";
    const hintKey =
      type === "goal" ? `${playerKey}:goal` : type === "yellow" || type === "red" ? `${playerKey}:card` : playerKey;
    const minuteLabel =
      (playerKey ? minuteHints.get(hintKey) ?? minuteHints.get(playerKey) : undefined) ??
      (event.minute != null ? `${event.minute}'` : "—");

    rows.push({
      minuteLabel,
      type,
      playerName: event.playerName ? formatPlayerName(event.playerName) : undefined,
      teamName: teamNameForSide(project, event.teamSide),
      summary: event.text,
      sortKey: minuteLabelToSortKey(minuteLabel),
    });
  }
  return rows;
}

function keyMomentsToPreview(eventPicture: EventPicture, project: MatchReportProject): PreviewEvent[] {
  return (eventPicture.keyMoments ?? []).map((moment) => ({
    minuteLabel: moment.minute != null ? `${moment.minute}'` : "—",
    type: eventTypeFromLabel(moment.title),
    playerName: undefined,
    teamName: project.homeTeam,
    summary: moment.summary,
    sortKey: moment.minute != null ? moment.minute * 100 : 0,
  }));
}

export function buildPreviewEvents(project: MatchReportProject): PreviewEvent[] {
  const minuteHints = buildSport365EventMinutes(project.layers.sport365Commentary?.lines ?? []);
  const fromSixLogic = sixLogicEventsToPreview(
    project.layers.sixLogic?.events ?? [],
    project,
    minuteHints,
  );

  if (fromSixLogic.length > 0) {
    return fromSixLogic.sort((a, b) => a.sortKey - b.sortKey);
  }

  if (project.eventPicture) {
    return keyMomentsToPreview(project.eventPicture, project).sort((a, b) => a.sortKey - b.sortKey);
  }

  return [];
}

function formatMeetingResult(meeting: FixtureMeetingSnapshot, perspectiveTeam: string): string {
  const isHome = meeting.homeTeam.toLowerCase().includes(perspectiveTeam.toLowerCase());
  const teamScore = isHome ? meeting.homeScore : meeting.awayScore;
  const oppScore = isHome ? meeting.awayScore : meeting.homeScore;
  if (teamScore == null || oppScore == null) return "—";
  if (teamScore > oppScore) return "W";
  if (teamScore < oppScore) return "L";
  return "D";
}

function formatFormRecord(results: FixtureMeetingSnapshot[], teamName: string): string {
  if (results.length === 0) return "—";
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let gf = 0;
  let ga = 0;
  for (const meeting of results.slice(0, 5)) {
    const isHome = meeting.homeTeam.toLowerCase().includes(teamName.toLowerCase());
    const teamScore = isHome ? meeting.homeScore : meeting.awayScore;
    const oppScore = isHome ? meeting.awayScore : meeting.homeScore;
    if (teamScore == null || oppScore == null) continue;
    gf += teamScore;
    ga += oppScore;
    const outcome = formatMeetingResult(meeting, teamName);
    if (outcome === "W") wins += 1;
    else if (outcome === "D") draws += 1;
    else losses += 1;
  }
  return `${wins}W-${draws}D-${losses}L · GF ${gf} · GA ${ga}`;
}

function headToHeadRecord(h2h: FixtureMeetingSnapshot[], homeTeam: string): string {
  if (h2h.length === 0) return "—";
  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (const meeting of h2h) {
    const outcome = formatMeetingResult(meeting, homeTeam);
    if (outcome === "W") wins += 1;
    else if (outcome === "D") draws += 1;
    else losses += 1;
  }
  return `${wins}W-${draws}D-${losses}L`;
}

function leagueStandingFallback(
  table: LeagueTableIntelligence | null,
  teamName: string,
): string | undefined {
  if (!table) return undefined;
  const row =
    table.homeTeamRow?.team === teamName
      ? table.homeTeamRow
      : table.awayTeamRow?.team === teamName
        ? table.awayTeamRow
        : table.rows.find((entry) => entry.team === teamName);
  if (!row) return undefined;
  return `${row.position}${ordinalSuffix(row.position)} · ${row.points} pts · P${row.played} W${row.won} D${row.drawn} L${row.lost}`;
}

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function buildPreviewContextRows(
  project: MatchReportProject,
  fixtureContext: FixtureContextIntelligence | null,
): PreviewContextRow[] {
  const rows: PreviewContextRow[] = [];

  if (fixtureContext) {
    rows.push({
      label: "Head to Head",
      value: headToHeadRecord(fixtureContext.headToHead, project.homeTeam),
    });
    rows.push({
      label: "Home Form",
      value: formatFormRecord(fixtureContext.homeRecentResults, project.homeTeam),
    });
    rows.push({
      label: "Away Form",
      value: formatFormRecord(fixtureContext.awayRecentResults, project.awayTeam),
    });
    if (fixtureContext.matchFacts && fixtureContext.matchFacts.length > 0) {
      rows.push({
        label: "Match Facts",
        value: fixtureContext.matchFacts.slice(0, 3).join(" · "),
      });
    }
    const fotmob = project.layers.fotMobPreview;
    if (fotmob?.winProbability.summary) {
      rows.push({ label: "Win probability", value: fotmob.winProbability.summary });
    }
    if (fotmob?.homeLineup?.formation || fotmob?.awayLineup?.formation) {
      rows.push({
        label: "Formations",
        value: [
          fotmob.homeLineup?.formation ? `${fotmob.homeLineup.team} ${fotmob.homeLineup.formation}` : null,
          fotmob.awayLineup?.formation ? `${fotmob.awayLineup.team} ${fotmob.awayLineup.formation}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }
    return rows;
  }

  const homeStanding = leagueStandingFallback(project.layers.leagueTable, project.homeTeam);
  const awayStanding = leagueStandingFallback(project.layers.leagueTable, project.awayTeam);
  const homeSeason = project.layers.leagueSeasonStats?.homeTeamStats;
  const awaySeason = project.layers.leagueSeasonStats?.awayTeamStats;

  rows.push({
    label: "Head to Head",
    value: project.eventPicture?.factualAnchors?.[0] ?? "—",
  });
  rows.push({
    label: "Home Form",
    value: homeSeason
      ? `${project.homeTeam} · ${homeSeason.goalsScored} scored / ${homeSeason.goalsConceded} conceded${homeStanding ? ` · ${homeStanding}` : ""}`
      : homeStanding ?? "—",
  });
  rows.push({
    label: "Away Form",
    value: awaySeason
      ? `${project.awayTeam} · ${awaySeason.goalsScored} scored / ${awaySeason.goalsConceded} conceded${awayStanding ? ` · ${awayStanding}` : ""}`
      : awayStanding ?? "—",
  });

  return rows;
}

export function buildPreviewScoreboard(project: MatchReportProject): PreviewScoreboard {
  const facts = project.layers.sixLogic?.facts;
  const lineups = project.layers.sixLogic?.lineups;
  return {
    competition: facts?.competition ?? project.competition,
    season: facts?.season,
    round: facts?.round,
    homeTeam: facts?.homeTeam ?? project.homeTeam,
    awayTeam: facts?.awayTeam ?? project.awayTeam,
    homeScore: facts?.homeScore ?? project.homeScore,
    awayScore: facts?.awayScore ?? project.awayScore,
    homeCoach: facts?.homeCoach,
    awayCoach: facts?.awayCoach,
    homeFormation: lineups?.home?.formation,
    awayFormation: lineups?.away?.formation,
    kickoffIso: facts?.kickoffIso,
    venue: facts?.venue,
    attendance: facts?.attendance,
    status: facts?.status,
  };
}

export function wordCountFromPreviewContent(parts: string[]): number {
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}
