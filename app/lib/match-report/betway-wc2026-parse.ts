import { BETWAY_WC2026_GROUPS, type BetwayWc2026ParsedFixture, type BetwayWc2026RawFixture } from "@/app/lib/match-report/betway-wc2026-constants";
import { normalizeFixtureTeamName } from "@/app/lib/match-report/wc2026-schedule";

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function normalizeBetwayTeamName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/Bosnia and Herzegovina/i, "Bosnia-Herzegovina")
    .replace(/United States( of America)?/i, "USA")
    .replace(/South Korea/i, "Korea Republic")
    .replace(/Korea, Republic of/i, "Korea Republic")
    .replace(/Cote d'Ivoire/i, "Ivory Coast")
    .replace(/Côte d'Ivoire/i, "Ivory Coast")
    .replace(/Democratic Republic of Congo/i, "DR Congo")
    .replace(/Curaçao/i, "Curacao")
    .trim();
}

export function parseBetwayDateHeading(heading: string): string | undefined {
  const match = heading.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!match) return undefined;
  const month = MONTHS[match[2]!.slice(0, 3).toLowerCase()];
  if (!month) return undefined;
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`;
}

export function parseBetwayKickoffTime(cardText: string): string {
  return cardText.match(/(\d{2}:\d{2})/)?.[1] ?? "19:00";
}

export function parseBetwayTeamsFromCard(cardText: string): { homeTeam: string; awayTeam: string } | null {
  const cleaned = cardText.replace(/^(\d{2}:\d{2})+/i, "").trim();
  const idx = cleaned.toLowerCase().indexOf("vs");
  if (idx < 0) return null;
  const homeTeam = normalizeBetwayTeamName(cleaned.slice(0, idx));
  const awayTeam = normalizeBetwayTeamName(cleaned.slice(idx + 2));
  if (!homeTeam || !awayTeam) return null;
  return { homeTeam, awayTeam };
}

function teamInGroup(groupTeams: string[], team: string): boolean {
  const norm = normalizeFixtureTeamName(team);
  return groupTeams.some((candidate) => normalizeFixtureTeamName(candidate) === norm);
}

export function inferBetwayWc2026Group(homeTeam: string, awayTeam: string): string | undefined {
  for (const [group, teams] of Object.entries(BETWAY_WC2026_GROUPS)) {
    if (teamInGroup(teams, homeTeam) && teamInGroup(teams, awayTeam)) return group;
  }
  return undefined;
}

function inferBetwayStage(homeTeam: string, awayTeam: string, group?: string): string {
  if (group) return "Group";
  const label = `${homeTeam} ${awayTeam}`.toLowerCase();
  if (/winner sf|loser sf/.test(label)) return "Final";
  if (/winner qf/.test(label)) return "Semi-final";
  if (/winner ef|2[a-l]\/|1[a-l]\/|\/3/.test(label)) return "Knockout";
  if (/^\d/.test(homeTeam) || /^\d/.test(awayTeam)) return "Knockout";
  if (/winner|loser/.test(label)) return "Knockout";
  return "Knockout";
}

export function enrichBetwayWc2026Fixture(raw: BetwayWc2026RawFixture): BetwayWc2026ParsedFixture {
  const date = raw.date ?? parseBetwayDateHeading(raw.dateHeading);
  const kickoffTime = parseBetwayKickoffTime(raw.cardText);
  const teams = parseBetwayTeamsFromCard(raw.cardText);
  const homeTeam = normalizeBetwayTeamName(teams?.homeTeam ?? raw.homeTeam);
  const awayTeam = normalizeBetwayTeamName(teams?.awayTeam ?? raw.awayTeam);
  const group = inferBetwayWc2026Group(homeTeam, awayTeam);
  return {
    ...raw,
    homeTeam,
    awayTeam,
    date,
    kickoffIso: date ? `${date} ${kickoffTime}` : raw.kickoffIso,
    group,
    stage: inferBetwayStage(homeTeam, awayTeam, group),
  };
}

export function parseBetwayDomFixtures(rawRows: BetwayWc2026RawFixture[]): BetwayWc2026ParsedFixture[] {
  return rawRows.map(enrichBetwayWc2026Fixture);
}
