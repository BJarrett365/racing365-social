export type LeagueTableBrand =
  | "planetfootball"
  | "planetrugby"
  | "football365"
  | "teamtalk"
  | "planetf1"
  | "loverugbyleague";

export type LeagueTableMode = "full" | "top-half" | "bottom-half" | "head-to-head" | "custom";
export type LeagueTableHighlightMode = "leader" | "brand";

export interface LeagueRow {
  position: number;
  team: string;
  badge: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
}

export interface LeagueTableCardProps {
  brand: LeagueTableBrand;
  competitionTitle?: string;
  backgroundImageUrl: string;
  rows: LeagueRow[];
  mode?: LeagueTableMode;
  highlightedTeam?: string;
  highlightMode?: LeagueTableHighlightMode;
  footerText?: string;
}

export type LeagueTableBrandToken = {
  primary: string;
  secondary: string;
  text: string;
  mark: string;
};

export const LEAGUE_TABLE_BRANDS: Record<LeagueTableBrand, LeagueTableBrandToken> = {
  planetfootball: { primary: "#B7FF00", secondary: "#111111", text: "#FFFFFF", mark: "PF" },
  planetrugby: { primary: "#00B140", secondary: "#111111", text: "#FFFFFF", mark: "PR" },
  football365: { primary: "#FF6A00", secondary: "#111111", text: "#FFFFFF", mark: "365" },
  teamtalk: { primary: "#0066FF", secondary: "#111111", text: "#FFFFFF", mark: "TT" },
  planetf1: { primary: "#E10600", secondary: "#111111", text: "#FFFFFF", mark: "F1" },
  loverugbyleague: { primary: "#E4002B", secondary: "#111111", text: "#FFFFFF", mark: "LRL" },
};

export const LEAGUE_TABLE_CARD_TOKENS = {
  fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
  safeTopPx: 120,
  safeBottomPx: 180,
  targetTableCenterY: 950,
  baseTableBackground: "rgba(12,12,12,0.84)",
  backgroundOverlay: "rgba(0,0,0,0.55)",
  standardBorder: "rgba(255,255,255,0.10)",
  headerText: "rgba(255,255,255,0.75)",
  headerDivider: "rgba(255,255,255,0.16)",
  mainText: "#FFFFFF",
  statsText: "#EDEDED",
  leaderHighlight: {
    border: "#D4AF37",
    background: "rgba(212,175,55,0.12)",
    glow: "rgba(212,175,55,0.35)",
  },
  columns: {
    rank: "8%",
    team: "42%",
    p: "8%",
    w: "8%",
    d: "8%",
    l: "8%",
    gd: "9%",
    pts: "9%",
  },
} as const;

export const LEAGUE_TABLE_DEMO_ROWS: LeagueRow[] = [
  { position: 1, team: "Manchester City", badge: "", played: 33, won: 21, drawn: 7, lost: 5, goalDifference: 37, points: 70 },
  { position: 2, team: "Arsenal", badge: "", played: 33, won: 21, drawn: 7, lost: 5, goalDifference: 37, points: 70 },
  { position: 3, team: "Manchester United", badge: "", played: 33, won: 16, drawn: 10, lost: 7, goalDifference: 13, points: 58 },
  { position: 4, team: "Aston Villa", badge: "", played: 33, won: 17, drawn: 7, lost: 9, goalDifference: 6, points: 58 },
  { position: 5, team: "Liverpool", badge: "", played: 33, won: 16, drawn: 7, lost: 10, goalDifference: 11, points: 55 },
  { position: 6, team: "Brighton", badge: "", played: 34, won: 13, drawn: 11, lost: 10, goalDifference: 9, points: 55 },
];

export function leagueTableBrandToken(brand: LeagueTableBrand): LeagueTableBrandToken {
  return LEAGUE_TABLE_BRANDS[brand] ?? LEAGUE_TABLE_BRANDS.planetfootball;
}

export function leagueTableRowsForMode(rows: LeagueRow[], mode: LeagueTableMode = "full"): LeagueRow[] {
  if (mode === "top-half") return rows.slice(0, Math.ceil(rows.length / 2));
  if (mode === "bottom-half") return rows.slice(Math.floor(rows.length / 2));
  if (mode === "head-to-head") return rows.slice(0, 2);
  return rows;
}

export function leagueTablePageRows(rows: LeagueRow[], page = 0, maxRows = 20): LeagueRow[] {
  if (rows.length <= maxRows) return rows;
  return rows.slice(page * maxRows, page * maxRows + maxRows);
}
