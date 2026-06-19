/**
 * Score Line templates — full-bleed hero image with bottom score overlay (Sport365 / brand styles).
 */

import { teamLineUpBrand } from "@/app/lib/team-line-up/brand-styles";
import { displayScoreLineStatus } from "@/app/lib/score-line/build-bundle";
import { nationalTeamCrestUrl } from "@/app/lib/national-team-crest";
import {
  football365SymbolSvg,
} from "@/app/lib/football365-brand";
import { planetFootballSymbolSvg } from "@/app/lib/planet-football-brand";
import { teamtalkLogoHorizontalSvg } from "@/app/lib/teamtalk-brand";
import type { TeamLineUpBrandStyle } from "@/types";

type SceneData = Record<string, unknown>;

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function brandLogoHtml(brandStyle: TeamLineUpBrandStyle): string {
  const brand = teamLineUpBrand(brandStyle);
  if (brandStyle === "sport365") {
    return `<svg class="sl-logo" viewBox="0 0 220 48" role="img" aria-label="Sport365">
      <text x="0" y="34" font-family="Arial Black,sans-serif" font-size="28" font-weight="900" fill="#FFFFFF">SPORT</text>
      <text x="108" y="34" font-family="Arial Black,sans-serif" font-size="28" font-weight="900" fill="${brand.accentColor}">365</text>
    </svg>`;
  }
  if (brandStyle === "teamtalk") {
    return teamtalkLogoHorizontalSvg("sl-logo sl-logo--tt");
  }
  if (brandStyle === "football365") {
    return football365SymbolSvg("sl-logo sl-logo--f365");
  }
  if (brandStyle === "planetfootball") {
    return planetFootballSymbolSvg("sl-logo sl-logo--pf");
  }
  return `<div class="sl-logo-text">${esc(brand.watermark)}</div>`;
}

function crestHtml(team: string, logoUrl?: string, size = 72): string {
  const url = (logoUrl ?? "").trim() || nationalTeamCrestUrl(team) || "";
  if (url) {
    return `<img class="sl-crest" src="${esc(url)}" alt="" width="${size}" height="${size}" />`;
  }
  const initials = team
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();
  return `<span class="sl-crest-fallback">${esc(initials || "?")}</span>`;
}

function statsIconHtml(color: string): string {
  return `<svg class="sl-stats-icon" viewBox="0 0 20 20" aria-hidden="true">
    <rect x="3" y="10" width="3" height="7" rx="0.5" fill="${esc(color)}"/>
    <rect x="8.5" y="6" width="3" height="11" rx="0.5" fill="${esc(color)}"/>
    <rect x="14" y="3" width="3" height="14" rx="0.5" fill="${esc(color)}"/>
  </svg>`;
}

function renderScoreLine(data: SceneData, w: number, h: number): string {
  const brandStyle = String(data.brandStyle ?? "sport365") as TeamLineUpBrandStyle;
  const brand = teamLineUpBrand(brandStyle);
  const accent = brand.accentColor;
  const homeTeam = String(data.homeTeam ?? "Home");
  const awayTeam = String(data.awayTeam ?? "Away");
  const homeScore = Number(data.homeScore ?? 0);
  const awayScore = Number(data.awayScore ?? 0);
  const homeLogoUrl = String(data.homeLogoUrl ?? "");
  const awayLogoUrl = String(data.awayLogoUrl ?? "");
  const statusDisplay = String(data.statusDisplay ?? "").trim();
  const statusLabel = displayScoreLineStatus(
    statusDisplay || String(data.statusLabel ?? ""),
    String(data.status ?? ""),
  );
  const heroUrl = String(data.editorBackgroundImageUrl ?? data.heroImageUrl ?? "").trim();
  const pad = Math.round(w * 0.055);
  const boxW = Math.round(w * 0.78);
  const scorePx = Math.round(w * 0.115);
  const crestSize = Math.round(w * 0.1);
  const statusPx = Math.round(w * 0.028);
  const boxPadV = Math.round(w * 0.038);
  const boxPadH = Math.round(w * 0.06);
  const logoW = Math.round(w * 0.2);

  const heroBlock = heroUrl
    ? `<img class="sl-hero-img" src="${esc(heroUrl)}" alt="" />`
    : `<div class="sl-hero-fallback" aria-hidden="true"></div>`;

  const body = `
    <div class="sl-root sl-root--${esc(brandStyle)}">
      <div class="sl-hero">${heroBlock}<div class="sl-vignette"></div></div>
      <div class="sl-brand">${brandLogoHtml(brandStyle)}</div>
      <div class="sl-score-wrap">
        <div class="sl-scorebox">
          <div class="sl-status">${esc(statusLabel)}</div>
          <div class="sl-score-row">
            ${crestHtml(homeTeam, homeLogoUrl, crestSize)}
            <div class="sl-score" aria-label="${esc(homeTeam)} ${homeScore} ${awayScore} ${esc(awayTeam)}">
              <span class="sl-score-num">${homeScore}</span>
              <span class="sl-score-sep">-</span>
              <span class="sl-score-num">${awayScore}</span>
            </div>
            ${crestHtml(awayTeam, awayLogoUrl, crestSize)}
          </div>
          <div class="sl-box-footer">${statsIconHtml("#ffffff")}</div>
        </div>
      </div>
    </div>`;

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
    body {
      font-family: ${brand.fontFamily};
      background: ${brand.bgBottom};
      color: #fff;
    }
    .sl-root {
      position: relative;
      width: ${w}px;
      height: ${h}px;
      overflow: hidden;
    }
    .sl-hero {
      position: absolute;
      inset: 0;
      z-index: 0;
    }
    .sl-hero-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 28%;
      display: block;
    }
    .sl-hero-fallback {
      width: 100%;
      height: 100%;
      background:
        radial-gradient(ellipse 80% 60% at 50% 35%, rgba(255,255,255,0.08) 0%, transparent 55%),
        linear-gradient(165deg, ${brand.bgTop} 0%, ${brand.bgBottom} 100%);
    }
    .sl-vignette {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 28%, transparent 55%, rgba(0,0,0,0.72) 100%),
        linear-gradient(90deg, rgba(0,0,0,0.2) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.2) 100%);
      pointer-events: none;
    }
    .sl-brand {
      position: absolute;
      top: ${pad}px;
      left: ${pad}px;
      z-index: 3;
    }
    .sl-logo {
      width: ${logoW}px;
      height: auto;
      display: block;
    }
    .sl-logo--tt { width: ${Math.round(logoW * 1.15)}px; }
    .sl-logo--f365, .sl-logo--pf { width: ${Math.round(w * 0.09)}px; height: ${Math.round(w * 0.09)}px; }
    .sl-logo-text {
      font-size: ${Math.round(w * 0.034)}px;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #fff;
    }
    .sl-score-wrap {
      position: absolute;
      left: 0;
      right: 0;
      bottom: ${Math.round(h * 0.08)}px;
      z-index: 2;
      display: flex;
      justify-content: center;
      padding: 0 ${pad}px;
    }
    .sl-scorebox {
      width: ${boxW}px;
      max-width: 100%;
      padding: ${boxPadV}px ${boxPadH}px ${Math.round(boxPadV * 0.75)}px;
      border-radius: ${Math.round(w * 0.022)}px;
      background: rgba(18, 18, 22, 0.72);
      border: 1px solid rgba(255,255,255,0.14);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.45);
      text-align: center;
    }
    .sl-status {
      font-size: ${statusPx}px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.92);
      margin-bottom: ${Math.round(w * 0.02)}px;
    }
    .sl-score-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: ${Math.round(w * 0.04)}px;
    }
    .sl-crest {
      width: ${crestSize}px;
      height: ${crestSize}px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    }
    .sl-crest-fallback {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: ${crestSize}px;
      height: ${crestSize}px;
      border-radius: 50%;
      background: rgba(255,255,255,0.12);
      font-size: ${Math.round(crestSize * 0.32)}px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .sl-score {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: ${Math.round(w * 0.018)}px;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .sl-score-num {
      font-size: ${scorePx}px;
      font-weight: 900;
      color: ${accent};
      letter-spacing: 0.02em;
      text-shadow: 0 0 24px ${accent}55;
    }
    .sl-score-sep {
      font-size: ${Math.round(scorePx * 0.72)}px;
      font-weight: 700;
      color: #fff;
      padding: 0 2px;
    }
    .sl-box-footer {
      margin-top: ${Math.round(w * 0.018)}px;
      display: flex;
      justify-content: center;
      opacity: 0.75;
    }
    .sl-stats-icon {
      width: ${Math.round(w * 0.028)}px;
      height: ${Math.round(w * 0.028)}px;
    }
    .sl-root--planetfootball .sl-score-num { color: #B6F657; text-shadow: 0 0 24px #B6F65755; }
    .sl-root--teamtalk .sl-score-num { color: #70E1A1; text-shadow: 0 0 24px #70E1A155; }
    .sl-root--football365 .sl-score-num { color: #1FFFFF; text-shadow: 0 0 24px #1FFFFF55; }
    .sl-root--sport365 .sl-score-num { color: #DD70E7; text-shadow: 0 0 24px #DD70E755; }
  `;

  return `<!doctype html><html><head><meta charset="utf-8"/><style>${css}</style></head><body>${body}</body></html>`;
}

export function tryRenderScoreLineTemplate(
  templateId: string,
  data: SceneData,
  w: number,
  h: number,
): string | null {
  if (templateId === "score-line-full") {
    return renderScoreLine(data, w, h);
  }
  return null;
}
