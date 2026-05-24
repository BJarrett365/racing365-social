import type { BetwayListingParsedFixture, BetwayListingRawFixture } from "@/app/lib/match-report/betway-listing-types";

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

export function normalizeBetwayTeamName(name: string): string {
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
    .replace(/\bAnd Hove\b/i, "and Hove")
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
  return cardText.match(/(\d{2}:\d{2})/)?.[1] ?? "15:00";
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

export function enrichBetwayListingFixture(
  raw: BetwayListingRawFixture,
  options?: { group?: string; stage?: string },
): BetwayListingParsedFixture {
  const date = parseBetwayDateHeading(raw.dateHeading);
  const kickoffTime = parseBetwayKickoffTime(raw.cardText);
  const teams = parseBetwayTeamsFromCard(raw.cardText);
  const homeTeam = normalizeBetwayTeamName(teams?.homeTeam ?? raw.homeTeam);
  const awayTeam = normalizeBetwayTeamName(teams?.awayTeam ?? raw.awayTeam);
  return {
    ...raw,
    homeTeam,
    awayTeam,
    date,
    kickoffIso: date ? `${date} ${kickoffTime}` : undefined,
    group: options?.group,
    stage: options?.stage,
  };
}
