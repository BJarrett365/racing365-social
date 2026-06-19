import type { TeamLineUpBrandStyle } from "@/types";

export type TeamLineUpBrandTokens = {
  id: TeamLineUpBrandStyle;
  label: string;
  primaryColor: string;
  secondaryColor: string;
  headerColor: string;
  accentColor: string;
  bgTop: string;
  bgBottom: string;
  watermark: string;
  fontFamily: string;
};

export const TEAM_LINE_UP_BRAND_STYLES: TeamLineUpBrandTokens[] = [
  {
    id: "football365",
    label: "Football365",
    primaryColor: "#1FFFFF",
    secondaryColor: "#161E26",
    headerColor: "#1FFFFF",
    accentColor: "#1FFFFF",
    bgTop: "#161E26",
    bgBottom: "#0f141a",
    watermark: "Football365",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  {
    id: "teamtalk",
    label: "TEAMtalk",
    primaryColor: "#70E1A1",
    secondaryColor: "#2D313E",
    headerColor: "#70E1A1",
    accentColor: "#70E1A1",
    bgTop: "#2D313E",
    bgBottom: "#1A1F2C",
    watermark: "TEAMtalk",
    fontFamily: '"Roboto Condensed", "Helvetica Neue", Arial, sans-serif',
  },
  {
    id: "planetfootball",
    label: "PlanetFootball",
    primaryColor: "#B6F657",
    secondaryColor: "#111111",
    headerColor: "#B6F657",
    accentColor: "#79F8CA",
    bgTop: "#111111",
    bgBottom: "#0a0a0a",
    watermark: "PLANET FOOTBALL",
    fontFamily: '"Arial Black", "Helvetica Neue", Helvetica, sans-serif',
  },
  {
    id: "sport365",
    label: "Sport365",
    primaryColor: "#BD33B5",
    secondaryColor: "#151515",
    headerColor: "#BD33B5",
    accentColor: "#DD70E7",
    bgTop: "#151515",
    bgBottom: "#0b0814",
    watermark: "SPORT365",
    fontFamily: "Arial Black, Helvetica Neue, sans-serif",
  },
];

export function teamLineUpBrand(style: TeamLineUpBrandStyle): TeamLineUpBrandTokens {
  return TEAM_LINE_UP_BRAND_STYLES.find((s) => s.id === style) ?? TEAM_LINE_UP_BRAND_STYLES[3]!;
}
