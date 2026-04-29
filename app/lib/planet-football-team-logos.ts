import type { PlanetFootballTableRow } from "@/types";

const PREMIER_LEAGUE_BADGE_BASE = "https://resources.premierleague.com/premierleague/badges";

const PREMIER_LEAGUE_TEAM_BADGE_IDS: Record<string, string> = {
  arsenal: "t3",
  "aston villa": "t7",
  bournemouth: "t91",
  brentford: "t94",
  brighton: "t36",
  "brighton & hove albion": "t36",
  burnley: "t90",
  chelsea: "t8",
  "crystal palace": "t31",
  everton: "t11",
  fulham: "t54",
  "leeds united": "t2",
  liverpool: "t14",
  "manchester city": "t43",
  "man city": "t43",
  "manchester united": "t1",
  "man utd": "t1",
  "newcastle united": "t4",
  "nottingham forest": "t17",
  sunderland: "t56",
  "tottenham hotspur": "t6",
  tottenham: "t6",
  "west ham united": "t21",
  "west ham": "t21",
  "wolverhampton wanderers": "t39",
  wolves: "t39",
};

function teamKey(team: string): string {
  return team
    .trim()
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

export function planetFootballTeamLogoUrl(team: string): string | undefined {
  const badgeId = PREMIER_LEAGUE_TEAM_BADGE_IDS[teamKey(team)];
  return badgeId ? `${PREMIER_LEAGUE_BADGE_BASE}/${badgeId}.png` : undefined;
}

export function withPlanetFootballTeamLogoUrls(rows: PlanetFootballTableRow[]): PlanetFootballTableRow[] {
  return rows.map((row) => {
    const current = typeof row.logoUrl === "string" ? row.logoUrl.trim() : "";
    return {
      ...row,
      logoUrl: current || planetFootballTeamLogoUrl(row.team),
    };
  });
}
