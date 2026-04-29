/**
 * Premier League club presets for the football line-ups editor.
 * Primary home shirt + number colours (approximate for video templates).
 */

export type PremierLeagueTeamPreset = {
  id: string;
  name: string;
  shirtColor: string;
  numberColor: string;
};

export const PREMIER_LEAGUE_TEAMS: PremierLeagueTeamPreset[] = [
  { id: "arsenal", name: "Arsenal", shirtColor: "#EF0107", numberColor: "#FFFFFF" },
  { id: "aston-villa", name: "Aston Villa", shirtColor: "#670E36", numberColor: "#F5F5F5" },
  { id: "bournemouth", name: "Bournemouth", shirtColor: "#DA291C", numberColor: "#000000" },
  { id: "brentford", name: "Brentford", shirtColor: "#E30613", numberColor: "#FFFFFF" },
  { id: "brighton", name: "Brighton & Hove Albion", shirtColor: "#0054A6", numberColor: "#FFFFFF" },
  { id: "burnley", name: "Burnley", shirtColor: "#6C1D45", numberColor: "#FFFFFF" },
  { id: "chelsea", name: "Chelsea", shirtColor: "#034694", numberColor: "#FFFFFF" },
  { id: "crystal-palace", name: "Crystal Palace", shirtColor: "#1B458F", numberColor: "#FFFFFF" },
  { id: "everton", name: "Everton", shirtColor: "#003399", numberColor: "#FFFFFF" },
  { id: "fulham", name: "Fulham", shirtColor: "#F8FAFC", numberColor: "#0F172A" },
  { id: "leeds", name: "Leeds United", shirtColor: "#FFCD00", numberColor: "#1D428A" },
  { id: "liverpool", name: "Liverpool", shirtColor: "#C8102E", numberColor: "#FFFFFF" },
  { id: "man-city", name: "Manchester City", shirtColor: "#6CABDD", numberColor: "#1C2C5B" },
  { id: "man-utd", name: "Manchester United", shirtColor: "#DA291C", numberColor: "#FFFFFF" },
  { id: "newcastle", name: "Newcastle United", shirtColor: "#241F20", numberColor: "#FFFFFF" },
  { id: "nottm-forest", name: "Nottingham Forest", shirtColor: "#DD0000", numberColor: "#FFFFFF" },
  { id: "sunderland", name: "Sunderland", shirtColor: "#EB172B", numberColor: "#FFFFFF" },
  { id: "tottenham", name: "Tottenham Hotspur", shirtColor: "#F8FAFC", numberColor: "#132257" },
  { id: "west-ham", name: "West Ham United", shirtColor: "#7A263A", numberColor: "#FFFFFF" },
  { id: "wolves", name: "Wolverhampton Wanderers", shirtColor: "#FDB913", numberColor: "#231F20" },
].sort((a, b) => a.name.localeCompare(b.name));

export function getPremierLeagueTeamById(id: string): PremierLeagueTeamPreset | undefined {
  return PREMIER_LEAGUE_TEAMS.find((t) => t.id === id);
}

/** Valid value for <input type="color" /> */
export function toColorInputValue(hex: string | undefined): string {
  const s = String(hex ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s}`;
  return "#808080";
}
