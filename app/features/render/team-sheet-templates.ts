/**
 * Team Sheet templates — readable list layouts for social (portrait-first).
 * Complements formation/pitch cards in team-line-up-templates.ts.
 */

import { teamLineUpBrand } from "@/app/lib/team-line-up/brand-styles";
import { groupStartersByPitchBand, groupStartersForHeroSheet } from "@/app/lib/team-line-up/formation-layout";
import { NEUTRAL_KIT_FALLBACK } from "@/app/lib/kit-intelligence";
import {
  football365LogoHorizontalSvg,
  football365RightRailPatternHtml,
  football365SymbolSvg,
  FOOTBALL365_COLORS,
} from "@/app/lib/football365-brand";
import {
  planetFootballRightRailPatternHtml,
  planetFootballSymbolSvg,
  PLANET_FOOTBALL_COLORS,
} from "@/app/lib/planet-football-brand";
import {
  teamtalkLogoHorizontalSvg,
  teamtalkRightRailPatternHtml,
  TEAMTALK_COLORS,
} from "@/app/lib/teamtalk-brand";
import { surnameFromName } from "@/app/lib/team-line-up/player-label-layout";
import type { FootballBenchRow, TeamLineUpBrandStyle } from "@/types";

type SceneData = Record<string, unknown>;
type Starter = { n: number; name: string; gk?: boolean; surname?: string; x?: number; y?: number };
type SubRow = { n: number; name: string; surname?: string };

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normStarter(p: unknown): Starter | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const name = String(o.name ?? "").trim();
  if (!name) return null;
  return {
    n: Number(o.n) || 0,
    name,
    gk: o.gk === true,
    surname: typeof o.surname === "string" ? o.surname : undefined,
    x: Number(o.x) || 50,
    y: Number(o.y) || 50,
  };
}

function normSub(p: unknown): SubRow | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const name = String(o.name ?? "").trim();
  if (!name) return null;
  return {
    n: Number(o.n) || 0,
    name,
    surname: typeof o.surname === "string" ? o.surname : undefined,
  };
}

function displayName(s: Starter): string {
  const sur = (s.surname ?? "").trim() || surnameFromName(s.name);
  return sur.toUpperCase();
}

function sortStarters(starters: Starter[]): Starter[] {
  return [...starters].sort((a, b) => {
    if (a.gk && !b.gk) return -1;
    if (!a.gk && b.gk) return 1;
    return (a.n || 99) - (b.n || 99);
  });
}

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "FC").toUpperCase();
}

function clubBadgeSvg(teamName: string, shirtColor: string, size = 160): string {
  const initials = esc(teamInitials(teamName));
  return `<svg class="ts-badge" width="${size}" height="${size}" viewBox="0 0 160 160" aria-hidden="true">
    <defs>
      <linearGradient id="badgeGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${esc(shirtColor)}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${esc(shirtColor)}" stop-opacity="0.55"/>
      </linearGradient>
    </defs>
    <path d="M80 8 L128 28 L128 88 C128 118 104 142 80 152 C56 142 32 118 32 88 L32 28 Z" fill="url(#badgeGrad)" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
    <text x="80" y="98" text-anchor="middle" font-size="42" font-weight="900" fill="#fff" font-family="Arial Black,sans-serif">${initials}</text>
  </svg>`;
}

function heroVisual(data: SceneData, teamName: string, shirtColor: string, className: string): string {
  const url = String(data.editorBackgroundImageUrl ?? data.heroImageUrl ?? "").trim();
  if (url) {
    return `<div class="${className}"><img class="ts-hero-img" src="${esc(url)}" alt="" /></div>`;
  }
  return `<div class="${className} ts-hero-fallback">${clubBadgeSvg(teamName, shirtColor)}</div>`;
}

function brandLogoHtml(brandStyle: TeamLineUpBrandStyle): string {
  const brand = teamLineUpBrand(brandStyle);
  if (brandStyle === "sport365") {
    return `<svg class="ts-logo" viewBox="0 0 220 48" role="img" aria-label="Sport365">
      <text x="0" y="34" font-family="Arial Black,sans-serif" font-size="28" font-weight="900" fill="#FFFFFF">SPORT</text>
      <text x="108" y="34" font-family="Arial Black,sans-serif" font-size="28" font-weight="900" fill="${brand.accentColor}">365</text>
    </svg>`;
  }
  if (brandStyle === "teamtalk") {
    return teamtalkLogoHorizontalSvg("ts-logo ts-logo--tt");
  }
  if (brandStyle === "football365") {
    return football365SymbolSvg("ts-logo ts-logo--f365-symbol");
  }
  if (brandStyle === "planetfootball") {
    return planetFootballSymbolSvg("ts-logo ts-logo--pf-symbol");
  }
  return `<div class="ts-logo-text">${esc(brand.watermark)}</div>`;
}

function shortRoleLabel(title: string): string {
  if (title === "Goalkeeper") return "GK";
  if (title === "Defenders") return "DEF";
  if (title === "Midfielders") return "MID";
  if (title === "Forwards" || title === "Forward") return "FWD";
  return title.slice(0, 3).toUpperCase();
}

function pitchTextureSvg(accent: string): string {
  return `<svg class="ts-split-pitch-bg" viewBox="0 0 600 1200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <circle cx="300" cy="600" r="180" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.08"/>
    <circle cx="300" cy="600" r="60" fill="none" stroke="${accent}" stroke-width="1" opacity="0.06"/>
    <line x1="0" y1="600" x2="600" y2="600" stroke="${accent}" stroke-width="1" opacity="0.05"/>
    <rect x="120" y="80" width="360" height="1040" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.07" rx="8"/>
  </svg>`;
}

function splitFooterHtml(brandStyle: TeamLineUpBrandStyle, brand: ReturnType<typeof teamLineUpBrand>): string {
  const statsIcon = `<svg class="ts-split-footer-icon" viewBox="0 0 20 20" aria-hidden="true">
    <rect x="3" y="10" width="3" height="7" rx="0.5" fill="${brand.headerColor}"/>
    <rect x="8.5" y="6" width="3" height="11" rx="0.5" fill="${brand.headerColor}"/>
    <rect x="14" y="3" width="3" height="14" rx="0.5" fill="${brand.headerColor}"/>
  </svg>`;
  if (brandStyle === "sport365") {
    return `<div class="ts-split-footer">
      <span class="ts-split-footer-brand">SPORT<span class="ts-split-footer-accent">365</span></span>
      <span class="ts-split-footer-sep" aria-hidden="true"></span>
      ${statsIcon}
      <span class="ts-split-footer-tag">Live line-ups, scores &amp; stats</span>
    </div>`;
  }
  if (brandStyle === "planetfootball") {
    return `<div class="ts-split-footer">
      <span class="ts-split-footer-brand">PLANET<span class="ts-split-footer-accent"> FOOTBALL</span></span>
      <span class="ts-split-footer-sep" aria-hidden="true"></span>
      ${statsIcon}
      <span class="ts-split-footer-tag">Live line-ups, scores &amp; stats</span>
    </div>`;
  }
  if (brandStyle === "teamtalk") {
    return `<div class="ts-split-footer">
      <span class="ts-split-footer-brand">TEAM<span class="ts-split-footer-accent">TALK</span></span>
      <span class="ts-split-footer-sep" aria-hidden="true"></span>
      ${statsIcon}
      <span class="ts-split-footer-tag">Live line-ups, scores &amp; stats</span>
    </div>`;
  }
  if (brandStyle === "football365") {
    return `<div class="ts-split-footer">
      <span class="ts-split-footer-brand">Football<span class="ts-split-footer-accent">365</span></span>
      <span class="ts-split-footer-sep" aria-hidden="true"></span>
      ${statsIcon}
      <span class="ts-split-footer-tag">Live line-ups, scores &amp; stats</span>
    </div>`;
  }
  return `<div class="ts-split-footer">
    <span class="ts-split-footer-brand">${esc(brand.watermark)}</span>
    <span class="ts-split-footer-sep" aria-hidden="true"></span>
    <span class="ts-split-footer-tag">Confirmed line-ups</span>
  </div>`;
}

function renderSplitPlayerRow(s: Starter, numPx: number): string {
  const num = s.n ? String(s.n) : "";
  return `<div class="ts-split-player">
    ${num ? `<span class="ts-split-num" style="font-size:${numPx}px;">${num}</span>` : ""}
    <span class="ts-split-name">${esc(displayName(s))}</span>
  </div>`;
}

function renderSplitPositionGroups(formation: string, starters: Starter[], w: number): string {
  const groups = groupStartersByPitchBand(
    formation || "4-3-3",
    starters as Parameters<typeof groupStartersByPitchBand>[1],
  );
  const numPx = Math.round(w * 0.017);
  const namePx = Math.round(w * 0.021);
  return groups
    .map((g) => {
      const rows = (g.players as Starter[])
        .map((s) => renderSplitPlayerRow(s, numPx))
        .join("");
      return `<div class="ts-split-group">
        <div class="ts-split-role">
          <span class="ts-split-role-label">${esc(shortRoleLabel(g.title))}</span>
          <span class="ts-split-role-line" aria-hidden="true"></span>
        </div>
        <div class="ts-split-group-rows" style="--ts-split-name:${namePx}px;">${rows}</div>
      </div>`;
    })
    .join("");
}

function splitPremiumCss(w: number, h: number, brand: ReturnType<typeof teamLineUpBrand>): string {
  const pad = Math.round(w * 0.048);
  const kickerPx = Math.round(w * 0.019);
  const teamPx = Math.round(w * 0.042);
  const headingPx = Math.round(w * 0.038);
  const statusPx = Math.round(w * 0.016);
  const rolePx = Math.round(w * 0.013);
  const footerPx = Math.round(w * 0.014);
  const isPf = brand.id === "planetfootball";
  const isTt = brand.id === "teamtalk";
  const isF365 = brand.id === "football365";
  const pfAccent = PLANET_FOOTBALL_COLORS.greenYellow;
  const ttAccent = TEAMTALK_COLORS.mint;
  const f365Accent = FOOTBALL365_COLORS.aqua;

  return `
    body.ts-split-premium {
      background: linear-gradient(160deg, #0a0a10 0%, ${brand.secondaryColor} 42%, ${brand.bgBottom} 100%);
    }
    .ts-split-premium .ts-split {
      display: grid;
      grid-template-columns: 48% 52%;
      flex: 1;
      min-height: 100%;
      height: 100%;
      position: relative;
    }
    .ts-split-premium .ts-split::before {
      content: "";
      position: absolute;
      left: 48%;
      top: 0;
      bottom: 0;
      width: 2px;
      transform: translateX(-50%);
      background: ${brand.headerColor};
      box-shadow: 0 0 16px ${brand.headerColor}88;
      z-index: 4;
      pointer-events: none;
    }
    .ts-split-premium .ts-split-left {
      position: relative;
      overflow: hidden;
      min-height: 100%;
      background: #050508;
    }
    .ts-split-premium .ts-split-left::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(0,0,0,0.05) 0%, rgba(5,5,12,0.45) 62%, ${brand.secondaryColor} 100%),
        linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 28%, rgba(0,0,0,0.4) 100%);
      pointer-events: none;
      z-index: 2;
    }
    .ts-split-premium .ts-hero-img {
      object-fit: cover;
      object-position: 58% 18%;
      transform: scale(1.06);
      transform-origin: center top;
    }
    .ts-split-premium .ts-split-right {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      padding: 0 ${Math.round(pad * 0.75)}px ${Math.round(pad * 0.55)}px;
      overflow: hidden;
    }
    .ts-split-pitch-bg {
      position: absolute;
      inset: -10% -20% -10% -5%;
      width: 120%;
      height: 120%;
      opacity: 1;
      pointer-events: none;
      z-index: 0;
    }
    .ts-split-premium .ts-split-card {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      justify-content: flex-start;
      padding-top: ${Math.round(pad * 0.65)}px;
    }
    .ts-split-premium .ts-split-header {
      flex-shrink: 0;
      padding-top: ${Math.round(pad * 2.25)}px;
      padding-right: ${Math.round(w * (isPf ? 0.04 : 0.14))}px;
    }
    .ts-split-premium .ts-logo {
      top: ${Math.round(pad * 0.85)}px;
      right: ${Math.round(pad * 0.65)}px;
      width: ${Math.round(w * (isPf ? 0.105 : isTt ? 0.22 : isF365 ? 0.105 : 0.19))}px;
    }
    .ts-split-kicker {
      font-size: ${kickerPx}px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: ${brand.headerColor};
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ts-split-kicker-icon {
      width: ${Math.round(w * 0.022)}px;
      height: ${Math.round(w * 0.022)}px;
      flex-shrink: 0;
    }
    .ts-split-team {
      margin-top: 10px;
      font-size: ${teamPx}px;
      line-height: 1.02;
      font-weight: 900;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .ts-split-heading {
      font-size: ${headingPx}px;
      line-height: 1.02;
      font-weight: 900;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .ts-split-status {
      margin-top: 8px;
      font-size: ${statusPx}px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.72);
      font-weight: 600;
    }
    .ts-split-status::before {
      content: "";
      display: block;
      width: 56px;
      height: 2px;
      background: ${brand.headerColor};
      margin-bottom: 8px;
      border-radius: 1px;
    }
    .ts-split-groups {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      margin-top: ${Math.round(pad * 0.28)}px;
      gap: ${Math.round(w * 0.017)}px;
    }
    .ts-split-group { min-height: 0; }
    .ts-split-role {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }
    .ts-split-role-label {
      font-size: ${rolePx}px;
      font-weight: 800;
      letter-spacing: 0.14em;
      color: ${brand.headerColor};
      flex-shrink: 0;
    }
    .ts-split-role-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, ${brand.headerColor}66, transparent);
    }
    .ts-split-group-rows {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ts-split-player {
      display: flex;
      align-items: center;
      gap: 10px;
      line-height: 1.15;
    }
    .ts-split-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: ${Math.round(w * 0.034)}px;
      height: ${Math.round(w * 0.028)}px;
      padding: 0 5px;
      font-weight: 800;
      color: #fff;
      background: ${brand.headerColor};
      border-radius: 3px;
      flex-shrink: 0;
      line-height: 1;
    }
    .ts-split-name {
      font-size: var(--ts-split-name, ${Math.round(w * 0.021)}px);
      font-weight: 800;
      letter-spacing: 0.03em;
    }
    .ts-split-premium .ts-subs {
      margin-top: ${Math.round(pad * 0.22)}px;
      padding-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.12);
      flex-shrink: 0;
    }
    .ts-split-premium .ts-subs-label {
      font-size: ${Math.round(w * 0.022)}px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: ${brand.headerColor};
      margin-bottom: 6px;
    }
    .ts-split-premium .ts-subs-list {
      font-size: ${Math.round(w * 0.019)}px;
      line-height: 1.35;
      color: rgba(255,255,255,0.9);
      font-style: italic;
      font-weight: 600;
    }
    .ts-split-footer {
      position: relative;
      z-index: 2;
      margin-top: auto;
      padding-top: ${Math.round(pad * 0.38)}px;
      padding-bottom: ${Math.round(pad * 0.15)}px;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .ts-split-footer-icon {
      width: ${Math.round(w * 0.024)}px;
      height: ${Math.round(w * 0.024)}px;
      flex-shrink: 0;
    }
    .ts-split-footer-brand {
      font-size: ${Math.round(w * 0.018)}px;
      font-weight: 900;
      letter-spacing: 0.06em;
      color: #fff;
    }
    .ts-split-footer-accent { color: ${brand.accentColor}; }
    .ts-split-footer-sep {
      width: 1px;
      height: ${Math.round(footerPx * 1.1)}px;
      background: rgba(255,255,255,0.25);
      flex-shrink: 0;
    }
    .ts-split-footer-tag {
      font-size: ${Math.round(w * 0.016)}px;
      color: rgba(255,255,255,0.62);
      letter-spacing: 0.02em;
    }
    ${isPf ? `
    body.ts-split-pf {
      background: ${PLANET_FOOTBALL_COLORS.offBlack};
      font-family: ${brand.fontFamily};
    }
    .ts-split-pf .ts-split-premium .ts-split::before {
      background: ${pfAccent};
      box-shadow: 0 0 16px ${pfAccent}55;
      width: 2px;
    }
    .ts-split-pf .ts-split-premium .ts-split-left::after {
      background:
        linear-gradient(90deg, rgba(0,0,0,0.06) 0%, rgba(5,5,12,0.42) 58%, ${PLANET_FOOTBALL_COLORS.offBlack} 100%),
        linear-gradient(180deg, rgba(0,0,0,0.28) 0%, transparent 32%, rgba(0,0,0,0.35) 100%);
    }
    .ts-split-pf .ts-split-right--pf {
      background: ${PLANET_FOOTBALL_COLORS.offBlack};
      color: ${PLANET_FOOTBALL_COLORS.white};
    }
    .ts-split-pf .pf-rail-pattern {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }
    .ts-split-pf .pf-rail-pattern-bg,
    .ts-split-pf .pf-rail-pitch,
    .ts-split-pf .pf-rail-tactical,
    .ts-split-pf .pf-rail-halftone {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .ts-split-pf .pf-rail-pitch { opacity: 0.35; }
    .ts-split-pf .pf-rail-tactical {
      top: auto;
      bottom: -10%;
      left: 10%;
      width: 72%;
      height: 38%;
      opacity: 0.28;
    }
    .ts-split-pf .pf-rail-halftone {
      inset: auto;
      top: -2%;
      right: -4%;
      width: 36%;
      height: auto;
      aspect-ratio: 1;
      opacity: 0.22;
    }
    .ts-split-pf .ts-split-kicker,
    .ts-split-pf .ts-split-role-label,
    .ts-split-pf .ts-split-premium .ts-subs-label {
      color: ${pfAccent};
    }
    .ts-split-pf .ts-split-team,
    .ts-split-pf .ts-split-heading,
    .ts-split-pf .ts-split-name,
    .ts-split-pf .ts-split-footer-brand {
      color: ${PLANET_FOOTBALL_COLORS.white};
    }
    .ts-split-pf .ts-split-status {
      color: rgba(255,255,255,0.72);
    }
    .ts-split-pf .ts-split-status::before {
      background: ${pfAccent};
    }
    .ts-split-pf .ts-split-role-line {
      background: linear-gradient(90deg, ${pfAccent}55, transparent);
    }
    .ts-split-pf .ts-split-num {
      color: ${PLANET_FOOTBALL_COLORS.offBlack};
      background: ${pfAccent};
    }
    .ts-split-pf .ts-split-premium .ts-subs {
      border-top-color: rgba(255,255,255,0.14);
    }
    .ts-split-pf .ts-split-premium .ts-subs-list {
      color: rgba(255,255,255,0.86);
    }
    .ts-split-pf .ts-split-footer {
      border-top-color: rgba(255,255,255,0.14);
    }
    .ts-split-pf .ts-split-footer-accent { color: ${pfAccent}; }
    .ts-split-pf .ts-split-footer-tag {
      color: rgba(255,255,255,0.58);
    }
    .ts-split-pf .ts-split-footer-icon rect { fill: ${pfAccent}; }
    ` : ""}
    ${isTt ? `
    body.ts-split-tt {
      background: ${TEAMTALK_COLORS.navyDark};
      font-family: ${brand.fontFamily};
    }
    .ts-split-tt .ts-split-premium .ts-split::before {
      background: ${ttAccent};
      box-shadow: 0 0 18px ${ttAccent}66;
    }
    .ts-split-tt .ts-split-premium .ts-split-left::after {
      background:
        linear-gradient(90deg, rgba(0,0,0,0.08) 0%, rgba(5,5,12,0.45) 55%, ${TEAMTALK_COLORS.navy} 100%),
        linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 28%, rgba(0,0,0,0.45) 100%);
    }
    .ts-split-tt .ts-split-right--tt {
      background: ${TEAMTALK_COLORS.navy};
      color: ${TEAMTALK_COLORS.white};
    }
    .ts-split-tt .tt-rail-pattern {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }
    .ts-split-tt .tt-rail-chevron {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .ts-split-tt .ts-logo--tt {
      width: ${Math.round(w * 0.22)}px;
    }
    .ts-split-tt .ts-split-num {
      color: ${TEAMTALK_COLORS.navy};
      background: ${ttAccent};
    }
    .ts-split-tt .ts-split-footer-accent { color: ${ttAccent}; }
    ` : ""}
    ${isF365 ? `
    body.ts-split-f365 {
      background: ${FOOTBALL365_COLORS.richNavy};
      font-family: ${brand.fontFamily};
    }
    .ts-split-f365 .ts-split-premium .ts-split::before {
      background: ${f365Accent};
      box-shadow: 0 0 18px ${f365Accent}55;
    }
    .ts-split-f365 .ts-split-premium .ts-split-left::after {
      background:
        linear-gradient(90deg, rgba(0,0,0,0.04) 0%, rgba(5,5,12,0.28) 58%, ${FOOTBALL365_COLORS.richNavy} 100%),
        linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 32%, rgba(0,0,0,0.22) 100%);
    }
    .ts-split-f365 .ts-split-right--f365 {
      background: ${FOOTBALL365_COLORS.richNavy};
      color: ${FOOTBALL365_COLORS.white};
    }
    .ts-split-f365 .f365-rail-pattern {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }
    .ts-split-f365 .f365-rail-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .ts-split-f365 .ts-logo--f365-symbol {
      width: ${Math.round(w * 0.105)}px;
      height: ${Math.round(w * 0.105)}px;
    }
    .ts-split-f365 .ts-split-num {
      color: ${FOOTBALL365_COLORS.richNavy};
      background: ${f365Accent};
    }
    .ts-split-f365 .ts-split-footer-accent { color: ${f365Accent}; }
    ` : ""}
  `;
}

function worldCupIconSvg(accent: string, _size: number): string {
  return `<svg class="ts-split-kicker-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="${accent}" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2.2c1.6 1.4 2.6 3.4 2.8 5.6H9.2c.2-2.2 1.2-4.2 2.8-5.6ZM7.4 9.8h9.2c-.1 1.1-.4 2.1-.9 3H8.3c-.5-.9-.8-1.9-.9-3Zm1.4 5c.9 1.5 2.2 2.6 3.8 3.1-1.2-.8-2.2-1.9-2.9-3.2h-.9Zm4.4 3.2c1.6-.5 2.9-1.6 3.8-3.1h-.9c-.7 1.3-1.7 2.4-2.9 3.2ZM12 19.8c-1.6-1.4-2.6-3.4-2.8-5.6h5.6c-.2 2.2-1.2 4.2-2.8 5.6Z"/>
  </svg>`;
}

function baseCss(w: number, h: number, brand: ReturnType<typeof teamLineUpBrand>): string {
  const portrait = h >= w;
  const pad = Math.round(w * 0.048);
  const titlePx = Math.round(w * (portrait ? 0.052 : 0.042));
  const kickerPx = Math.round(w * 0.022);
  const rowPx = Math.round(w * (portrait ? 0.036 : 0.028));
  const numPx = Math.round(w * 0.026);
  const subPx = Math.round(w * (portrait ? 0.022 : 0.02));
  const splitTitlePx = Math.round(w * (portrait ? 0.05 : 0.044));

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
    body.ts-root {
      width: ${w}px; height: ${h}px; overflow: hidden;
      font-family: ${brand.fontFamily};
      color: #fff;
      background: linear-gradient(165deg, ${brand.secondaryColor} 0%, ${brand.bgBottom} 55%, #050508 100%);
    }
    .ts-shell { position: relative; width: 100%; height: 100%; min-height: 100%; padding: ${pad}px; display: flex; flex-direction: column; }
    .ts-shell-full { padding: 0; }
    .ts-logo { position: absolute; top: ${pad}px; right: ${pad}px; width: ${Math.round(w * 0.14)}px; height: auto; z-index: 5; opacity: 0.95; }
    .ts-logo-text {
      position: absolute; top: ${pad}px; right: ${pad}px; z-index: 5;
      font-size: ${Math.round(w * 0.022)}px; font-weight: 900; letter-spacing: 0.12em;
      color: ${brand.primaryColor}; opacity: 0.9;
    }
    .ts-kicker { font-size: ${kickerPx}px; letter-spacing: 0.14em; text-transform: uppercase; color: ${brand.headerColor}; font-weight: 700; }
    .ts-title { font-size: ${titlePx}px; line-height: 1.05; font-weight: 900; margin-top: 8px; text-transform: uppercase; }
    .ts-meta { margin-top: 10px; font-size: ${Math.round(w * 0.018)}px; color: rgba(255,255,255,0.72); }
    .ts-section-label {
      margin-top: ${Math.round(pad * 0.7)}px; margin-bottom: 10px;
      font-size: ${Math.round(w * 0.024)}px; font-weight: 800; letter-spacing: 0.08em;
      text-transform: uppercase; color: ${brand.headerColor};
    }
    .ts-rows { display: flex; flex-direction: column; gap: ${Math.round(rowPx * 0.22)}px; }
    .ts-row { display: flex; align-items: baseline; gap: 14px; line-height: 1.15; }
    .ts-num { min-width: ${Math.round(numPx * 1.4)}px; font-size: ${numPx}px; font-weight: 700; color: ${brand.headerColor}; font-style: italic; }
    .ts-name { font-size: ${rowPx}px; font-weight: 800; letter-spacing: 0.02em; }
    .ts-subs { margin-top: ${Math.round(pad * 0.65)}px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.12); }
    .ts-subs-label { font-size: ${Math.round(w * 0.02)}px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: ${brand.headerColor}; margin-bottom: 8px; }
    .ts-subs-list { font-size: ${subPx}px; line-height: 1.45; color: rgba(255,255,255,0.88); font-style: italic; }
    .ts-hero-img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
    .ts-hero-fallback { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: radial-gradient(circle at 50% 30%, rgba(255,255,255,0.08), transparent 60%); }
    .ts-badge { filter: drop-shadow(0 12px 28px rgba(0,0,0,0.45)); }
    .ts-accent-bar { height: 4px; width: 72px; background: ${brand.headerColor}; margin-top: 12px; border-radius: 2px; }
    .ts-role-group { margin-bottom: ${Math.round(pad * 0.45)}px; }
    .ts-role-title { font-size: ${Math.round(w * 0.019)}px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 6px; }
    .ts-split { display: grid; grid-template-columns: 44% 56%; flex: 1; min-height: 100%; height: 100%; gap: 0; align-items: stretch; }
    .ts-split-left { position: relative; overflow: hidden; min-height: 100%; height: 100%; background: rgba(0,0,0,0.35); }
    .ts-split-left::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 55%, ${brand.secondaryColor} 100%); pointer-events: none; }
    .ts-split-right {
      display: flex; flex-direction: column; justify-content: flex-start; min-height: 100%; height: 100%;
      padding: ${Math.round(pad * 1.1)}px ${Math.round(pad * 0.75)}px ${Math.round(pad * 0.9)}px;
    }
    .ts-split-header { flex: 0 0 auto; }
    .ts-split-main { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; margin-top: ${Math.round(pad * 0.55)}px; }
    .ts-split-rows { display: flex; flex-direction: column; justify-content: space-between; flex: 1; min-height: 0; }
    .ts-split-title { font-size: ${splitTitlePx}px; line-height: 1.05; font-weight: 900; margin-top: 8px; text-transform: uppercase; }
    .ts-combined { display: grid; grid-template-columns: 1fr auto 1fr; gap: ${Math.round(pad * 0.5)}px; align-items: stretch; flex: 1; min-height: 0; margin-top: ${Math.round(pad * 0.5)}px; }
    .ts-combined-side { min-width: 0; display: flex; flex-direction: column; justify-content: space-between; min-height: 100%; }
    .ts-combined-vs { align-self: center; font-size: ${Math.round(w * 0.034)}px; font-weight: 900; color: ${brand.headerColor}; padding: 0 8px; }
    .ts-combined-team { font-size: ${Math.round(w * 0.028)}px; font-weight: 900; margin-bottom: 12px; text-transform: uppercase; color: ${brand.headerColor}; }
    .ts-standard-hero { height: ${Math.round(h * (portrait ? 0.46 : 0.38))}px; border-radius: 12px; overflow: hidden; margin-bottom: ${Math.round(pad * 0.6)}px; background: rgba(0,0,0,0.25); flex: 0 0 auto; }
    .ts-standard-body { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; }
    .ts-standard-rows { display: flex; flex-direction: column; justify-content: space-between; flex: 1; min-height: 0; }
    .ts-hero-full { position: absolute; inset: 0; z-index: 0; }
    .ts-hero-full::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 45%, ${brand.secondaryColor} 78%); }
    .ts-hero-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; padding: ${pad}px; }
    .ts-hero-panel { background: rgba(0,0,0,0.42); border-radius: 12px; padding: ${Math.round(pad * 0.7)}px; backdrop-filter: blur(6px); }
  `;
}

function renderXiRows(starters: Starter[]): string {
  return sortStarters(starters)
    .map(
      (s) =>
        `<div class="ts-row"><span class="ts-num">${s.n || ""}</span><span class="ts-name">${esc(displayName(s))}</span></div>`,
    )
    .join("");
}

function renderSubsBlock(subs: SubRow[]): string {
  if (!subs.length) return "";
  const names = subs.map((s) => esc((s.surname ?? surnameFromName(s.name)).toUpperCase())).join(", ");
  return `<div class="ts-subs"><div class="ts-subs-label">Subs</div><p class="ts-subs-list">${names}</p></div>`;
}

function renderHeroGroups(formation: string, starters: Starter[]): string {
  const groups = groupStartersForHeroSheet(formation, starters as Parameters<typeof groupStartersForHeroSheet>[1]);
  return groups
    .map(
      (g) => `<div class="ts-role-group">
        <div class="ts-role-title">${esc(g.title)}</div>
        <div class="ts-rows">${renderXiRows(g.players as Starter[])}</div>
      </div>`,
    )
    .join("");
}

function wrapHtml(
  w: number,
  h: number,
  brand: ReturnType<typeof teamLineUpBrand>,
  body: string,
  extraCss = "",
  bodyClass = "ts-root",
): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${baseCss(w, h, brand)}${extraCss}</style></head>
<body class="${bodyClass}">${body}</body></html>`;
}

function sidePayload(data: SceneData) {
  const brandStyle = String(data.brandStyle ?? "sport365") as TeamLineUpBrandStyle;
  const brand = teamLineUpBrand(brandStyle);
  const teamName = String(data.teamName ?? "Team");
  const opponent = String(data.opponentName ?? "Opponent");
  const competition = String(data.competition ?? "");
  const status = String(data.lineupStatus ?? "predicted") === "confirmed" ? "CONFIRMED" : "PREDICTED";
  const formation = String(data.formation ?? "");
  const shirtColor = String(data.shirtColor ?? NEUTRAL_KIT_FALLBACK.shirt);
  const starters = (Array.isArray(data.starters) ? data.starters : []).map(normStarter).filter(Boolean) as Starter[];
  const subs = (Array.isArray(data.subs) ? data.subs : []).map(normSub).filter(Boolean) as SubRow[];
  return { brandStyle, brand, teamName, opponent, competition, status, formation, shirtColor, starters, subs };
}

function renderStandard(data: SceneData, w: number, h: number): string {
  const p = sidePayload(data);
  const header = `${p.teamName.toUpperCase()} ${p.status} LINE-UP`;
  const matchLine = `${p.teamName} v ${p.opponent}`;
  const body = `
    ${brandLogoHtml(p.brandStyle)}
    <div class="ts-shell">
      ${heroVisual(data, p.teamName, p.shirtColor, "ts-standard-hero")}
      <div class="ts-standard-body">
        <div>
          <div class="ts-kicker">${esc(matchLine)}</div>
          <h1 class="ts-title">${esc(header)}</h1>
          ${p.competition ? `<p class="ts-meta">${esc(p.competition)}${p.formation ? ` · ${esc(p.formation)}` : ""}</p>` : ""}
          <div class="ts-accent-bar"></div>
          <div class="ts-section-label">Starting XI</div>
        </div>
        <div class="ts-standard-rows">${renderXiRows(p.starters)}</div>
        ${renderSubsBlock(p.subs)}
      </div>
    </div>`;
  return wrapHtml(w, h, p.brand, body);
}

function renderSplit(data: SceneData, w: number, h: number): string {
  const p = sidePayload(data);
  const competition = (p.competition || "Matchday").toUpperCase();
  const statusLine = p.status === "CONFIRMED" ? "CONFIRMED LINE-UP" : "PREDICTED LINE-UP";
  const showWorldCupIcon = /world\s*cup/i.test(competition);
  const kickerAccent = p.brand.headerColor;
  const kickerInner = showWorldCupIcon
    ? `${worldCupIconSvg(kickerAccent, Math.round(w * 0.022))}<span>${esc(competition)}</span>`
    : esc(competition);

  const body = `
    ${p.brandStyle === "planetfootball" ? "" : brandLogoHtml(p.brandStyle)}
    <div class="ts-shell ts-shell-full ts-split-premium">
      <div class="ts-split">
        ${heroVisual(data, p.teamName, p.shirtColor, "ts-split-left")}
        <div class="ts-split-right${p.brandStyle === "planetfootball" ? " ts-split-right--pf" : p.brandStyle === "teamtalk" ? " ts-split-right--tt" : p.brandStyle === "football365" ? " ts-split-right--f365" : ""}">
          ${
            p.brandStyle === "planetfootball"
              ? planetFootballRightRailPatternHtml()
              : p.brandStyle === "teamtalk"
                ? teamtalkRightRailPatternHtml()
                : p.brandStyle === "football365"
                  ? football365RightRailPatternHtml()
                  : pitchTextureSvg(p.brand.headerColor)
          }
          <div class="ts-split-card">
            <header class="ts-split-header">
              <div class="ts-split-kicker">${kickerInner}</div>
              <h1 class="ts-split-team">${esc(p.teamName.toUpperCase())}</h1>
              <h2 class="ts-split-heading">STARTING XI</h2>
              <p class="ts-split-status">${esc(statusLine)}</p>
            </header>
            <div class="ts-split-groups">${renderSplitPositionGroups(p.formation, p.starters, w)}</div>
            ${renderSubsBlock(p.subs)}
            ${splitFooterHtml(p.brandStyle, p.brand)}
          </div>
        </div>
      </div>
    </div>`;
  const rootClass =
    p.brandStyle === "planetfootball"
      ? "ts-root ts-split-premium ts-split-pf"
      : p.brandStyle === "teamtalk"
        ? "ts-root ts-split-premium ts-split-tt"
        : p.brandStyle === "football365"
          ? "ts-root ts-split-premium ts-split-f365"
          : "ts-root ts-split-premium";
  return wrapHtml(w, h, p.brand, body, splitPremiumCss(w, h, p.brand), rootClass);
}

function renderHero(data: SceneData, w: number, h: number): string {
  const p = sidePayload(data);
  const featured = String(data.heroPlayerName ?? "").trim();
  const body = `
    ${heroVisual(data, p.teamName, p.shirtColor, "ts-hero-full")}
    ${brandLogoHtml(p.brandStyle)}
    <div class="ts-hero-content">
      <div class="ts-kicker">${esc(p.teamName)} v ${esc(p.opponent)}</div>
      <h1 class="ts-title">${esc(p.status)} LINE-UP</h1>
      ${featured ? `<p class="ts-meta" style="font-size:${Math.round(w * 0.024)}px;font-weight:800;color:#fff;">${esc(featured.toUpperCase())}</p>` : ""}
      <div class="ts-hero-panel">
        ${renderHeroGroups(p.formation, p.starters)}
        ${renderSubsBlock(p.subs)}
      </div>
    </div>`;
  return wrapHtml(w, h, p.brand, body);
}

function renderCombined(data: SceneData, w: number, h: number): string {
  const brandStyle = String(data.brandStyle ?? "sport365") as TeamLineUpBrandStyle;
  const brand = teamLineUpBrand(brandStyle);
  const homeName = String(data.homeName ?? "Home");
  const awayName = String(data.awayName ?? "Away");
  const competition = String(data.competition ?? "");
  const status = String(data.lineupStatus ?? "predicted") === "confirmed" ? "CONFIRMED" : "PREDICTED";
  const homeStarters = (Array.isArray(data.homeStarters) ? data.homeStarters : []).map(normStarter).filter(Boolean) as Starter[];
  const awayStarters = (Array.isArray(data.awayStarters) ? data.awayStarters : []).map(normStarter).filter(Boolean) as Starter[];
  const homeSubs = (Array.isArray(data.homeSubs) ? data.homeSubs : []).map(normSub).filter(Boolean) as SubRow[];
  const awaySubs = (Array.isArray(data.awaySubs) ? data.awaySubs : []).map(normSub).filter(Boolean) as SubRow[];

  const body = `
    ${brandLogoHtml(brandStyle)}
    <div class="ts-shell">
      <div class="ts-kicker">${esc(competition || "Matchday")}</div>
      <h1 class="ts-title">${esc(`${homeName} v ${awayName}`)}</h1>
      <p class="ts-meta">${esc(status)} LINE-UPS</p>
      <div class="ts-accent-bar"></div>
      <div class="ts-combined">
        <div class="ts-combined-side">
          <div>
            <div class="ts-combined-team">${esc(homeName.toUpperCase())}</div>
            <div class="ts-rows">${renderXiRows(homeStarters)}</div>
          </div>
          ${renderSubsBlock(homeSubs)}
        </div>
        <div class="ts-combined-vs">v</div>
        <div class="ts-combined-side">
          <div>
            <div class="ts-combined-team">${esc(awayName.toUpperCase())}</div>
            <div class="ts-rows">${renderXiRows(awayStarters)}</div>
          </div>
          ${renderSubsBlock(awaySubs)}
        </div>
      </div>
    </div>`;
  return wrapHtml(w, h, brand, body);
}

export function tryRenderTeamSheetTemplate(
  templateId: string,
  data: SceneData,
  w: number,
  h: number,
): string | null {
  switch (templateId) {
    case "team-sheet-standard":
      return renderStandard(data, w, h);
    case "team-sheet-split":
      return renderSplit(data, w, h);
    case "team-sheet-hero":
      return renderHero(data, w, h);
    case "team-sheet-combined":
      return renderCombined(data, w, h);
    default:
      return null;
  }
}

export function pickDefaultHeroPlayer(starters: Starter[]): string {
  const sorted = sortStarters(starters);
  const forward = [...sorted].reverse().find((s) => !s.gk);
  return forward ? displayName(forward) : sorted[0] ? displayName(sorted[0]) : "";
}
