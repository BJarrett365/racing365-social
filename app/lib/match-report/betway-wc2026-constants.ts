/** Betway Scores listing for FIFA World Cup 2026 (competition id 263). */
export const BETWAY_WC2026_UPCOMINGS_URL =
  "https://www.betwayscores.com/football/world-cup-2026/263/upcomings";

/**
 * Official WC 2026 group draw as listed on Betway Scores (Jun 2026).
 * Used for group inference on scraped fixtures.
 */
export const BETWAY_WC2026_GROUPS: Record<string, string[]> = {
  A: ["Mexico", "South Africa", "Korea Republic", "Czech Republic"],
  B: ["Canada", "Bosnia-Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["USA", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curacao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

export type BetwayWc2026RawFixture = {
  betwayMatchId: string;
  betwaySlug: string;
  betwayHref: string;
  dateHeading: string;
  date?: string;
  kickoffIso?: string;
  homeTeam: string;
  awayTeam: string;
  cardText: string;
};

export type BetwayWc2026ParsedFixture = BetwayWc2026RawFixture & {
  group?: string;
  stage: string;
};
