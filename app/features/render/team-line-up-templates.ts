/**
 * Team Line-Up formation cards — intro, single team, combined full pitch, outro.
 */

import { teamLineUpBrand } from "@/app/lib/team-line-up/brand-styles";
import { football365LogoHorizontalSvg, football365SymbolSvg } from "@/app/lib/football365-brand";
import { planetFootballSymbolSvg } from "@/app/lib/planet-football-brand";
import { teamtalkLogoHorizontalSvg } from "@/app/lib/teamtalk-brand";
import { NEUTRAL_KIT_FALLBACK } from "@/app/lib/kit-intelligence";
import { resolveStarterCollisions, surnameFromName } from "@/app/lib/team-line-up/player-label-layout";
import type { TeamLineUpBrandStyle } from "@/types";

type SceneData = Record<string, unknown>;
type Starter = { n: number; name: string; x: number; y: number; gk?: boolean; surname?: string };

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
    x: Number(o.x) || 50,
    y: Number(o.y) || 50,
    gk: o.gk === true,
    surname: typeof o.surname === "string" ? o.surname : undefined,
  };
}

function displayLabel(s: Starter): string {
  const sur = (s.surname ?? "").trim() || surnameFromName(s.name);
  return sur.toUpperCase();
}

function formatNameHtml(label: string, namePx: number, badge: boolean): string {
  const escLabel = esc(label);
  if (label.length <= 12) {
    return badge
      ? `<div class="tlu-name-badge" style="font-size:${namePx}px;">${escLabel}</div>`
      : `<div class="tlu-name" style="font-size:${namePx}px;">${escLabel}</div>`;
  }
  const mid = Math.ceil(label.length / 2);
  const splitAt = label.indexOf(" ", mid - 3);
  if (splitAt > 0 && splitAt < label.length - 2) {
    const line1 = esc(label.slice(0, splitAt));
    const line2 = esc(label.slice(splitAt + 1));
    const cls = badge ? "tlu-name-badge tlu-name-split" : "tlu-name tlu-name-split";
    return `<div class="${cls}" style="font-size:${Math.round(namePx * 0.92)}px;line-height:1.05;"><span>${line1}</span><span>${line2}</span></div>`;
  }
  const reduced = Math.round(namePx * 0.88);
  return badge
    ? `<div class="tlu-name-badge" style="font-size:${reduced}px;">${escLabel}</div>`
    : `<div class="tlu-name" style="font-size:${reduced}px;">${escLabel}</div>`;
}

function renderShirtSvg(shirt: string, sleeve: string, trim: string, number?: number): string {
  const num =
    number && number > 0
      ? `<text x="50" y="72" text-anchor="middle" font-size="26" font-weight="800" fill="${esc(trim)}" font-family="Arial,sans-serif">${number}</text>`
      : "";
  return `<svg class="tlu-shirt" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M18 28 L32 18 L50 24 L68 18 L82 28 L78 44 L88 52 L84 118 L16 118 L12 52 L22 44 Z" fill="${esc(shirt)}" stroke="${esc(trim)}" stroke-width="2"/>
    <path d="M32 18 L50 24 L68 18 L50 30 Z" fill="${esc(sleeve)}" opacity="0.95"/>
    ${num}
  </svg>`;
}

function pitchGrassDefs(id: string): string {
  return `<defs>
    <pattern id="${id}-stripes" patternUnits="userSpaceOnUse" width="120" height="120" patternTransform="rotate(0)">
      <rect width="120" height="60" fill="#1a5c32"/>
      <rect y="60" width="120" height="60" fill="#1f6b3a"/>
    </pattern>
    <linearGradient id="${id}-vignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.08)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.18)"/>
    </linearGradient>
  </defs>`;
}

function renderFlatHalfPitchSvg(): string {
  const id = "tluHalf";
  return `<svg class="tlu-pitch" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    ${pitchGrassDefs(id)}
    <polygon points="125,575 875,575 865,105 135,105" fill="url(#${id}-stripes)" stroke="rgba(255,255,255,0.55)" stroke-width="2.5"/>
    <polygon points="125,575 875,575 865,105 135,105" fill="url(#${id}-vignette)" stroke="none"/>
    <line x1="500" y1="105" x2="500" y2="575" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
    <circle cx="500" cy="340" r="44" fill="none" stroke="rgba(255,255,255,0.48)" stroke-width="2"/>
    <rect x="340" y="105" width="320" height="78" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
    <rect x="380" y="105" width="240" height="28" fill="none" stroke="rgba(255,255,255,0.38)" stroke-width="1.5"/>
    <rect x="340" y="497" width="320" height="78" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
    <rect x="380" y="547" width="240" height="28" fill="none" stroke="rgba(255,255,255,0.38)" stroke-width="1.5"/>
  </svg>`;
}

function renderFullPitchSvg(): string {
  const id = "tluFull";
  return `<svg class="tlu-pitch tlu-pitch-full" viewBox="0 0 1000 1200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    ${pitchGrassDefs(id)}
    <rect x="80" y="40" width="840" height="1120" fill="url(#${id}-stripes)" stroke="rgba(255,255,255,0.55)" stroke-width="3"/>
    <rect x="80" y="40" width="840" height="1120" fill="url(#${id}-vignette)" stroke="none"/>
    <line x1="80" y1="600" x2="920" y2="600" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
    <circle cx="500" cy="600" r="70" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2.5"/>
    <rect x="280" y="40" width="440" height="120" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="2"/>
    <rect x="340" y="40" width="320" height="48" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
    <rect x="280" y="1040" width="440" height="120" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="2"/>
    <rect x="340" y="1112" width="320" height="48" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
    <line x1="80" y1="40" x2="120" y2="40" stroke="rgba(255,255,255,0.4)" stroke-width="4"/>
    <line x1="880" y1="40" x2="920" y2="40" stroke="rgba(255,255,255,0.4)" stroke-width="4"/>
    <line x1="80" y1="1160" x2="120" y2="1160" stroke="rgba(255,255,255,0.4)" stroke-width="4"/>
    <line x1="880" y1="1160" x2="920" y2="1160" stroke="rgba(255,255,255,0.4)" stroke-width="4"/>
  </svg>`;
}

function sport365LogoSvg(className: string): string {
  return `<svg class="${className}" viewBox="0 0 220 48" role="img" aria-label="Sport365">
    <text x="0" y="34" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF">SPORT</text>
    <text x="108" y="34" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="28" font-weight="900" fill="#BD33B5">365</text>
  </svg>`;
}

/** Map formation % (GK y≈92 bottom, ST y≈24 top) onto the flat half-pitch stage. */
function mapHalfPitchCoords(x: number, y: number): { left: number; top: number } {
  const yNorm = Math.max(0, Math.min(1, (92 - y) / 68));
  const top = 76 - yNorm * 54;
  const left = 10 + (x / 100) * 80;
  return { left, top };
}

function mapFullPitchCoords(x: number, y: number): { left: number; top: number } {
  return { left: 10 + (x / 100) * 80, top: 8 + (y / 100) * 84 };
}

function playerSizes(w: number, h: number): { shirtPx: number; namePx: number; portrait: boolean } {
  const portrait = h > w;
  if (portrait) {
    const shirtPx = Math.min(90, Math.max(70, Math.round(w * 0.078)));
    const namePx = Math.min(34, Math.max(26, Math.round(w * 0.028)));
    return { shirtPx, namePx, portrait: true };
  }
  const shirtPx = Math.min(72, Math.max(56, Math.round(w * 0.042)));
  const namePx = Math.min(28, Math.max(20, Math.round(w * 0.014)));
  return { shirtPx, namePx, portrait: false };
}

function baseCss(w: number, h: number, brand: ReturnType<typeof teamLineUpBrand>): string {
  const portrait = h > w;
  const isSport365 = brand.watermark === "SPORT365";
  const logoWidth = portrait ? (isSport365 ? 184 : 148) : isSport365 ? 160 : 132;
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
    body.tlu-root {
      width: ${w}px; height: ${h}px; overflow: hidden;
      font-family: ${brand.fontFamily};
      color: #fff;
      background: radial-gradient(ellipse 90% 60% at 50% 0%, rgba(34,211,238,0.14), transparent 55%),
        radial-gradient(circle at 82% 12%, rgba(168,85,247,0.2), transparent 38%),
        linear-gradient(180deg, ${brand.bgTop} 0%, ${brand.bgBottom} 62%, #071018 100%);
    }
    .tlu-header {
      position: absolute; left: 0; right: 0; z-index: 6;
      text-align: ${portrait ? "left" : "center"};
      padding: ${portrait ? "48px 48px 0 44px" : "34px 48px 0"};
      font-size: ${portrait ? Math.round(w * (isSport365 ? 0.037 : 0.031)) : Math.round(w * 0.028)}px;
      line-height: 1.12; letter-spacing: 0.03em;
      color: ${brand.headerColor};
      text-shadow: 0 4px 20px rgba(0,0,0,0.5);
      max-width: ${portrait ? "78%" : "100%"};
    }
    .tlu-logo {
      position: absolute; right: ${portrait ? 36 : 40}px; top: ${portrait ? 40 : 28}px; z-index: 7;
      width: ${logoWidth}px; height: auto; display: block;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.35));
    }
    .tlu-stage {
      position: absolute; left: 50%; z-index: 2;
      transform: translate(-50%, -50%);
      width: ${portrait ? "94%" : "88%"};
      height: ${portrait ? (isSport365 ? "56%" : "62%") : "72%"};
      top: ${portrait ? (isSport365 ? "54%" : "55%") : "54%"};
      overflow: hidden;
      border-radius: 12px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.35);
    }
    .tlu-stage-full {
      top: ${portrait ? (isSport365 ? "53%" : "52%") : "52%"};
      height: ${portrait ? (isSport365 ? "72%" : "78%") : "78%"};
      width: 92%;
    }
    .tlu-pitch {
      position: absolute; inset: 0; width: 100%; height: 100%;
      opacity: 1; pointer-events: none; z-index: 1;
    }
    .tlu-players { position: absolute; inset: 0; z-index: 3; overflow: visible; pointer-events: none; }
    .tlu-player {
      position: absolute; transform: translate(-50%, -50%);
      text-align: center; min-width: 0; max-width: 42%;
    }
    .tlu-shirt { width: 100%; height: auto; display: block; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.45)); }
    .tlu-name {
      margin-top: 6px; font-weight: 800; letter-spacing: 0.04em;
      white-space: nowrap; color: #fff;
      text-shadow: 0 2px 8px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,1);
    }
    .tlu-name-badge {
      display: inline-block; margin-top: 4px; padding: 3px 10px; border-radius: 4px;
      background: rgba(0,0,0,0.75); font-weight: 700; letter-spacing: 0.02em; white-space: nowrap;
    }
    .tlu-name-split { white-space: normal; display: flex; flex-direction: column; gap: 1px; align-items: center; }
    .tlu-glow {
      position: absolute; left: 0; right: 0; bottom: 0; height: 24%;
      background: linear-gradient(180deg, transparent, rgba(34,211,238,0.08));
      pointer-events: none; z-index: 0;
    }
    .tlu-intro-panel {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; text-align: center; padding: 48px; z-index: 3;
    }
    .tlu-intro-kicker { font-size: ${Math.round(w * 0.018)}px; letter-spacing: 0.2em; color: ${brand.headerColor}; opacity: 0.9; }
    .tlu-intro-title { margin-top: 16px; font-size: ${Math.round(w * 0.065)}px; line-height: 1.05; color: #fff; }
    .tlu-intro-meta { margin-top: 16px; font-size: ${Math.round(w * 0.018)}px; color: rgba(255,255,255,0.75); }
    .tlu-outro-cta { font-size: ${Math.round(w * 0.038)}px; color: ${brand.headerColor}; font-weight: 800; }
  `;
}

function renderPlayerNodes(
  starters: Starter[],
  opts: {
    shirt: string;
    sleeve: string;
    trim: string;
    gkShirt: string;
    w: number;
    h: number;
    fullPitch?: boolean;
    badgeNames?: boolean;
    showNumbers?: boolean;
  },
): string {
  const { shirtPx, namePx, portrait } = playerSizes(opts.w, opts.h);
  const stageWidthPx = Math.round(opts.w * (portrait ? 0.94 : 0.88));
  const mapCoords = opts.fullPitch ? mapFullPitchCoords : mapHalfPitchCoords;
  const laidOut = resolveStarterCollisions(starters, {
    stageWidthPx,
    namePx,
    shirtPx,
    minGapPx: 20,
    edgePadPct: 14,
  });
  return laidOut
    .map((s) => {
      const pos = mapCoords(s.x, s.y);
      const body = s.gk ? opts.gkShirt : opts.shirt;
      const z = 10 + Math.round(100 - s.y);
      const label = displayLabel(s);
      const nameHtml = formatNameHtml(label, namePx, Boolean(opts.badgeNames));
      return `<div class="tlu-player" style="left:${pos.left.toFixed(2)}%;top:${pos.top.toFixed(2)}%;z-index:${z};width:${shirtPx}px;">
        ${renderShirtSvg(body, opts.sleeve, opts.trim, opts.showNumbers ? s.n : undefined)}
        ${nameHtml}
      </div>`;
    })
    .join("");
}

function wrapHtml(w: number, h: number, brand: ReturnType<typeof teamLineUpBrand>, body: string, extraCss = ""): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${baseCss(w, h, brand)}${extraCss}</style></head>
<body class="tlu-root">${body}</body></html>`;
}

function brandLogoHtml(brandStyle: TeamLineUpBrandStyle): string {
  if (brandStyle === "sport365") return sport365LogoSvg("tlu-logo");
  if (brandStyle === "planetfootball") return planetFootballSymbolSvg("tlu-logo tlu-logo--pf-symbol");
  if (brandStyle === "teamtalk") return teamtalkLogoHorizontalSvg("tlu-logo tlu-logo--tt");
  if (brandStyle === "football365") return football365SymbolSvg("tlu-logo tlu-logo--f365-symbol");
  const brand = teamLineUpBrand(brandStyle);
  return `<div class="tlu-logo" style="font-size:14px;letter-spacing:0.18em;color:rgba(255,255,255,0.7);width:auto;">${esc(brand.watermark)}</div>`;
}

function renderIntro(data: SceneData, w: number, h: number): string {
  const brandStyle = String(data.brandStyle ?? "sport365") as TeamLineUpBrandStyle;
  const brand = teamLineUpBrand(brandStyle);
  const home = String(data.homeName ?? "Home");
  const away = String(data.awayName ?? "Away");
  const introLine = String(data.introLine ?? "Line-ups");
  const competition = String(data.competition ?? data.league ?? "");
  const matchDate = String(data.matchDate ?? "");
  const status = String(data.lineupStatus ?? "predicted") === "confirmed" ? "Confirmed" : "Predicted";
  const body = `
    <div class="tlu-glow" aria-hidden="true"></div>
    ${brandLogoHtml(brandStyle)}
    <div class="tlu-intro-panel">
      <p class="tlu-intro-kicker">${esc(introLine.toUpperCase())}</p>
      <h1 class="tlu-intro-title">${esc(home)}<br/><span style="opacity:0.65;font-size:0.55em;">v</span><br/>${esc(away)}</h1>
      <p class="tlu-intro-meta">${esc(status)} line-ups${competition ? ` · ${esc(competition)}` : ""}${matchDate ? ` · ${esc(matchDate)}` : ""}</p>
    </div>`;
  return wrapHtml(w, h, brand, body);
}

function renderOutro(data: SceneData, w: number, h: number): string {
  const brandStyle = String(data.brandStyle ?? "sport365") as TeamLineUpBrandStyle;
  const brand = teamLineUpBrand(brandStyle);
  const outroLine = String(data.outroLine ?? `For more coverage, head to ${brand.watermark}`);
  const body = `
    <div class="tlu-glow" aria-hidden="true"></div>
    ${brandLogoHtml(brandStyle)}
    <div class="tlu-intro-panel">
      <p class="tlu-outro-cta">${esc(outroLine)}</p>
    </div>`;
  return wrapHtml(w, h, brand, body);
}

function renderSingleTeam(data: SceneData, w: number, h: number): string {
  const brandStyle = String(data.brandStyle ?? "sport365") as TeamLineUpBrandStyle;
  const brand = teamLineUpBrand(brandStyle);
  const side = String(data.lineupSide ?? "home") === "away" ? "away" : "home";
  const teamName = String(data.teamName ?? (side === "home" ? data.homeName : data.awayName) ?? "Team");
  const opponent = String(data.opponentName ?? (side === "home" ? data.awayName : data.homeName) ?? "Opponent");
  const lineupStatus = String(data.lineupStatus ?? "predicted") === "confirmed" ? "CONFIRMED" : "PREDICTED";
  const header = `${teamName.toUpperCase()} ${lineupStatus} LINE-UP V ${opponent.toUpperCase()}`;
  const starters = (Array.isArray(data.starters) ? data.starters : []).map(normStarter).filter(Boolean) as Starter[];
  const playerNodes = renderPlayerNodes(starters, {
    shirt: String(data.shirtColor ?? NEUTRAL_KIT_FALLBACK.shirt),
    sleeve: String(data.sleeveColor ?? NEUTRAL_KIT_FALLBACK.shorts),
    trim: String(data.trimColor ?? NEUTRAL_KIT_FALLBACK.shorts),
    gkShirt: String(data.gkShirtColor ?? NEUTRAL_KIT_FALLBACK.goalkeeper.shirt),
    w,
    h,
    badgeNames: true,
    showNumbers: true,
  });
  const body = `
    <div class="tlu-glow" aria-hidden="true"></div>
    ${brandLogoHtml(brandStyle)}
    <h1 class="tlu-header">${esc(header)}</h1>
    <div class="tlu-stage">
      ${renderFlatHalfPitchSvg()}
      <div class="tlu-players">${playerNodes}</div>
    </div>`;
  return wrapHtml(w, h, brand, body);
}

function renderCombined(data: SceneData, w: number, h: number): string {
  const brandStyle = String(data.brandStyle ?? "sport365") as TeamLineUpBrandStyle;
  const brand = teamLineUpBrand(brandStyle);
  const homeName = String(data.homeName ?? "Home");
  const awayName = String(data.awayName ?? "Away");
  const lineupStatus = String(data.lineupStatus ?? "predicted") === "confirmed" ? "CONFIRMED" : "PREDICTED";
  const header = `${homeName.toUpperCase()} v ${awayName.toUpperCase()} · ${lineupStatus} LINE-UPS`;
  const homeStarters = (Array.isArray(data.homeStarters) ? data.homeStarters : []).map(normStarter).filter(Boolean) as Starter[];
  const awayStarters = (Array.isArray(data.awayStarters) ? data.awayStarters : []).map(normStarter).filter(Boolean) as Starter[];
  const homeNodes = renderPlayerNodes(homeStarters, {
    shirt: String(data.homeShirtColor ?? NEUTRAL_KIT_FALLBACK.shirt),
    sleeve: String(data.homeSleeveColor ?? NEUTRAL_KIT_FALLBACK.shorts),
    trim: String(data.homeTrimColor ?? NEUTRAL_KIT_FALLBACK.shorts),
    gkShirt: String(data.homeGkShirtColor ?? NEUTRAL_KIT_FALLBACK.goalkeeper.shirt),
    w,
    h,
    fullPitch: true,
    badgeNames: true,
    showNumbers: true,
  });
  const awayNodes = renderPlayerNodes(awayStarters, {
    shirt: String(data.awayShirtColor ?? NEUTRAL_KIT_FALLBACK.shirt),
    sleeve: String(data.awaySleeveColor ?? NEUTRAL_KIT_FALLBACK.shorts),
    trim: String(data.awayTrimColor ?? NEUTRAL_KIT_FALLBACK.shorts),
    gkShirt: String(data.awayGkShirtColor ?? NEUTRAL_KIT_FALLBACK.goalkeeper.shirt),
    w,
    h,
    fullPitch: true,
    badgeNames: true,
    showNumbers: true,
  });
  const body = `
    <div class="tlu-glow" aria-hidden="true"></div>
    ${brandLogoHtml(brandStyle)}
    <h1 class="tlu-header" style="font-size:${Math.round(w * 0.022)}px;text-align:center;max-width:100%;">${esc(header)}</h1>
    <div class="tlu-stage tlu-stage-full">
      ${renderFullPitchSvg()}
      <div class="tlu-players">${homeNodes}${awayNodes}</div>
    </div>`;
  return wrapHtml(w, h, brand, body, `.tlu-root { background: linear-gradient(180deg, ${brand.bgTop} 0%, ${brand.bgBottom} 55%, #071018 100%); }`);
}

export function tryRenderTeamLineUpTemplate(
  templateId: string,
  data: SceneData,
  w: number,
  h: number,
): string | null {
  switch (templateId) {
    case "team-line-up-intro":
      return renderIntro(data, w, h);
    case "team-line-up-card":
      return renderSingleTeam(data, w, h);
    case "team-line-up-combined":
      return renderCombined(data, w, h);
    case "team-line-up-outro":
      return renderOutro(data, w, h);
    default:
      return null;
  }
}
