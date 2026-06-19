import {
  leagueTableBrandToken,
  type LeagueTableBrand,
} from "@/app/lib/league-table-card-config";
import {
  planetFootballSymbolSvg,
} from "@/app/lib/planet-football-brand";
import {
  football365LogoHorizontalSvg,
} from "@/app/lib/football365-brand";
import {
  teamtalkLogoHorizontalSvg,
} from "@/app/lib/teamtalk-brand";
import type { PlanetFootballDisplayBrand } from "@/types";

export type { PlanetFootballDisplayBrand };

export const PLANET_FOOTBALL_DISPLAY_BRANDS: { id: PlanetFootballDisplayBrand; label: string }[] = [
  { id: "sport365", label: "Sport365" },
  { id: "football365", label: "Football365" },
  { id: "teamtalk", label: "TEAMtalk" },
  { id: "planet-football", label: "Planet Football" },
];

const BRAND_SITE: Record<PlanetFootballDisplayBrand, string> = {
  sport365: "Sport365.com",
  football365: "Football365.com",
  teamtalk: "TEAMtalk.com",
  "planet-football": "PlanetFootball.com",
};

const BRAND_FOOTER: Record<PlanetFootballDisplayBrand, string> = {
  sport365: "SPORT365",
  football365: "FOOTBALL365",
  teamtalk: "TEAMtalk",
  "planet-football": "PLANET FOOTBALL",
};

export function displayBrandToLeagueTableBrand(display: PlanetFootballDisplayBrand): LeagueTableBrand {
  switch (display) {
    case "sport365":
      return "sport365";
    case "football365":
      return "football365";
    case "teamtalk":
      return "teamtalk";
    case "planet-football":
      return "planetfootball";
    default:
      return "sport365";
  }
}

export function normalizePlanetFootballDisplayBrand(raw: unknown): PlanetFootballDisplayBrand {
  const v = String(raw ?? "sport365").trim().toLowerCase();
  if (v === "football365") return "football365";
  if (v === "teamtalk") return "teamtalk";
  if (v === "planet-football" || v === "planetfootball") return "planet-football";
  return "sport365";
}

export function planetFootballBrandDefaults(display: PlanetFootballDisplayBrand) {
  const leagueBrand = displayBrandToLeagueTableBrand(display);
  const token = leagueTableBrandToken(leagueBrand);
  const site = BRAND_SITE[display];
  return {
    displayBrand: display,
    highlightColor: token.primary,
    outroLine: `For more coverage, head to ${site}`,
    cta: site,
    burnSubtitles: true as const,
    brandFooter: BRAND_FOOTER[display],
    subtitleAccentColor: token.primary,
  };
}

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length < 6) return "12,12,12";
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return "12,12,12";
  return `${r},${g},${b}`;
}

/** Canvas / panel colours for planet-football-table renders (all four display brands). */
export function planetFootballSurfaceTokens(display: PlanetFootballDisplayBrand) {
  const leagueBrand = displayBrandToLeagueTableBrand(display);
  const token = leagueTableBrandToken(leagueBrand);
  const panelRgb = hexToRgbTriplet(token.secondary);
  const heroFallbackByBrand: Record<PlanetFootballDisplayBrand, string> = {
    sport365: "linear-gradient(160deg,#240818 0%,#0b0814 100%)",
    football365: "linear-gradient(160deg,#1a2834 0%,#090e12 100%)",
    teamtalk: "linear-gradient(160deg,#2d313e 0%,#1a1f2c 100%)",
    "planet-football": "linear-gradient(160deg,#1b260f 0%,#090c06 100%)",
  };
  const radialFallbackByBrand: Record<PlanetFootballDisplayBrand, string> = {
    sport365: "radial-gradient(circle at 70% 20%,#3a1438 0%,#140812 45%,#050305 100%)",
    football365: "radial-gradient(circle at 70% 20%,#1e3a4a 0%,#0f141a 45%,#06090c 100%)",
    teamtalk: "radial-gradient(circle at 70% 20%,#3a4048 0%,#1a1f2c 45%,#0d1018 100%)",
    "planet-football": "radial-gradient(circle at 70% 20%,#1f2b10 0%,#101608 45%,#050605 100%)",
  };
  return {
    leagueBrand,
    accentColor: token.primary,
    stageBg: token.secondary,
    broadcastBg: token.secondary,
    panelRgb,
    heroFallback: heroFallbackByBrand[display],
    radialFallback: radialFallbackByBrand[display],
  };
}

export function leagueTableBrandAccentColor(display: PlanetFootballDisplayBrand): string {
  return leagueTableBrandToken(displayBrandToLeagueTableBrand(display)).primary;
}

export function leagueTableBrandLogoSvg(brand: LeagueTableBrand, className: string): string {
  switch (brand) {
    case "sport365":
      return `<svg class="${className}" viewBox="0 0 220 48" role="img" aria-label="Sport365">
    <text x="0" y="34" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF">SPORT</text>
    <text x="108" y="34" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="28" font-weight="900" fill="#BD33B5">365</text>
  </svg>`;
    case "football365":
      return football365LogoHorizontalSvg(className);
    case "teamtalk":
      return teamtalkLogoHorizontalSvg(className);
    case "planetfootball":
    default:
      return planetFootballSymbolSvg(className);
  }
}

export function resolveLeagueBrandFromSceneData(data: Record<string, unknown>): LeagueTableBrand {
  return displayBrandToLeagueTableBrand(normalizePlanetFootballDisplayBrand(data.brand));
}
