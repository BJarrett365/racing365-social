import type { RunnerSilks, SilkPattern } from "@/types";
import {
  effectiveSilkImageSrc,
  silkImageBoxHeight,
  silkImageBoxWidth,
} from "@/app/features/render/silk-render-shared";

function normHex(c: string, fallback: string): string {
  const t = String(c ?? "").trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(t)) return t;
  return fallback;
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Deterministic id for SVG defs (pattern URLs). Must match on server and client — random IDs break React hydration
 * when procedural silks are rendered via `dangerouslySetInnerHTML` (e.g. `RaceSilkPreview`).
 */
function stablePatternUid(parts: string[]): string {
  const s = parts.join("\x1e");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0).toString(36);
  return `s${u.padStart(8, "0").slice(0, 12)}`;
}

function svgChestDisc(
  w: number,
  capH: number,
  bodyH: number,
  body: string,
  secondary: string,
  armBand: string,
): string {
  const cx = w / 2;
  const cy = capH + bodyH * 0.48;
  const r = Math.min(w, bodyH) * 0.27;
  const bandY = capH + bodyH * 0.36;
  const bandH = bodyH * 0.14;
  const lw = w * 0.2;
  return `
    <rect x="0" y="${capH}" width="${w}" height="${bodyH}" fill="${escAttr(body)}"/>
    <rect x="0" y="${bandY}" width="${lw}" height="${bandH}" fill="${escAttr(armBand)}" stroke="#1a1a1a" stroke-width="0.5"/>
    <rect x="${w - lw}" y="${bandY}" width="${lw}" height="${bandH}" fill="${escAttr(armBand)}" stroke="#1a1a1a" stroke-width="0.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${escAttr(secondary)}" stroke="#1a1a1a" stroke-width="1"/>
  `;
}

function svgStripedCap(w: number, capH: number, capC: string, stripeC: string): string {
  const capR = Math.min(4, Math.floor(capH / 2));
  const stripes = 5;
  const sh = capH / stripes;
  let rects = "";
  for (let i = 0; i < stripes; i++) {
    const fill = i % 2 === 0 ? capC : stripeC;
    rects += `<rect x="1" y="${1 + i * sh}" width="${w - 2}" height="${sh}" fill="${escAttr(fill)}"/>`;
  }
  return `<rect x="1" y="1" width="${w - 2}" height="${capH - 1}" rx="${capR}" fill="none" stroke="#1a1a1a" stroke-width="1"/>
    ${rects}
    <circle cx="${w * 0.75}" cy="${capH * 0.35}" r="${Math.max(2, capH * 0.12)}" fill="${escAttr(capC)}" stroke="#1a1a1a" stroke-width="0.75"/>`;
}

function svgVChest(
  w: number,
  capH: number,
  bodyH: number,
  body: string,
  secondary: string,
  capC: string,
  accent: string,
): string {
  const y0 = capH;
  const inset = w * 0.18;
  const collarH = Math.max(3, capH * 0.2);
  const collarY = capH - collarH * 0.15;
  const capSvg = svgStripedCap(w, capH, capC, secondary);
  const chestLeft = inset;
  const chestW = w - 2 * inset;
  const chestTop = y0 + bodyH * 0.08;
  const chestH = bodyH * 0.88;
  const vPath = `M ${chestLeft} ${chestTop + chestH * 0.08} L ${w / 2} ${chestTop + chestH * 0.62} L ${chestLeft + chestW} ${chestTop + chestH * 0.08} L ${chestLeft + chestW * 0.88} ${chestTop + chestH * 0.04} L ${w / 2} ${chestTop + chestH * 0.52} L ${chestLeft + chestW * 0.12} ${chestTop + chestH * 0.04} Z`;
  return `
    ${capSvg}
    <rect x="0" y="${collarY}" width="${w}" height="${collarH}" fill="${escAttr(accent)}" stroke="#1a1a1a" stroke-width="0.5"/>
    <rect x="0" y="${y0}" width="${w}" height="${bodyH}" fill="${escAttr(secondary)}" stroke="#1a1a1a" stroke-width="1"/>
    <rect x="${chestLeft}" y="${chestTop}" width="${chestW}" height="${chestH}" fill="${escAttr(body)}" stroke="#1a1a1a" stroke-width="0.75"/>
    <path d="${vPath}" fill="${escAttr(secondary)}" stroke="#1a1a1a" stroke-width="0.5"/>
  `;
}

function svgChevronBody(w: number, capH: number, bodyH: number, body: string, secondary: string): string {
  const uid = stablePatternUid(["cv", String(w), String(capH), String(bodyH), body, secondary]);
  const ph = Math.max(12, Math.round(bodyH / 5));
  const pw = Math.max(14, Math.round(w * 0.45));
  return `
    <defs>
      <pattern id="cv-${uid}" patternUnits="userSpaceOnUse" width="${pw}" height="${ph}" patternTransform="translate(0,${capH})">
        <path d="M0 ${ph} L${pw / 2} 0 L${pw} ${ph} Z" fill="${escAttr(body)}"/>
        <path d="M0 0 L${pw / 2} ${ph} L${pw} 0 Z" fill="${escAttr(secondary)}"/>
      </pattern>
    </defs>
    <rect x="0" y="${capH}" width="${w}" height="${bodyH}" fill="url(#cv-${uid})" stroke="#1a1a1a" stroke-width="1"/>
  `;
}

function classicBodySvg(
  pattern: SilkPattern,
  w: number,
  capH: number,
  bodyH: number,
  body: string,
  secondary: string,
): string {
  if (pattern === "solid") {
    return `<rect x="0" y="${capH}" width="${w}" height="${bodyH}" fill="${escAttr(body)}"/>`;
  }
  if (pattern === "stripes") {
    const sw = w / 5;
    let s = "";
    for (let i = 0; i < 5; i++) {
      const fill = i % 2 === 0 ? body : secondary;
      s += `<rect x="${(i * sw).toFixed(2)}" y="${capH}" width="${sw.toFixed(2)}" height="${bodyH}" fill="${escAttr(fill)}"/>`;
    }
    return s;
  }
  if (pattern === "quarters") {
    return `<path d="M 0 ${capH} L ${w} ${capH} L 0 ${capH + bodyH} Z" fill="${escAttr(body)}"/><path d="M ${w} ${capH} L ${w} ${capH + bodyH} L 0 ${capH + bodyH} Z" fill="${escAttr(secondary)}"/>`;
  }
  /* halves */
  const hw = w / 2;
  return `<rect x="0" y="${capH}" width="${hw}" height="${bodyH}" fill="${escAttr(body)}"/><rect x="${hw}" y="${capH}" width="${hw}" height="${bodyH}" fill="${escAttr(secondary)}"/>`;
}

function simpleCapRect(w: number, capH: number, fillHex: string): string {
  const capR = Math.min(4, Math.floor(capH / 2));
  return `<rect x="1" y="1" width="${w - 2}" height="${capH - 1}" rx="${capR}" fill="${escAttr(fillHex)}" stroke="#262626" stroke-width="1"/>`;
}

/** Five-point star path (pointing up), outer radius `outer`. */
function fivePointStarD(cx: number, cy: number, outer: number): string {
  const inner = outer * 0.42;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(" L ")} Z`;
}

/**
 * Timeform-style composite: long-sleeve shirt (left) + cap (right), stars in `secondary` on shirt.
 */
function svgSilksIcon(w: number, h: number, bodyC: string, secondaryC: string, capC: string): string {
  const eb = escAttr(bodyC);
  const es = escAttr(secondaryC);
  const ec = escAttr(capC);
  const stroke = "#1a1a1a";
  const torsoX = 4;
  const torsoY = h * 0.34;
  const torsoW = w * 0.44;
  const torsoH = h * 0.62;
  const stars: [number, number, number][] = [
    [0.14 * w, 0.44 * h, Math.max(2.2, h * 0.052)],
    [0.24 * w, 0.52 * h, Math.max(1.9, h * 0.044)],
    [0.17 * w, 0.68 * h, Math.max(2.3, h * 0.05)],
    [0.33 * w, 0.47 * h, Math.max(1.9, h * 0.04)],
    [0.37 * w, 0.66 * h, Math.max(2.2, h * 0.047)],
    [0.11 * w, 0.58 * h, Math.max(1.9, h * 0.041)],
    [0.26 * w, 0.38 * h, Math.max(2.1, h * 0.045)],
  ];
  let starEls = "";
  for (const [cx, cy, r] of stars) {
    starEls += `<path d="${fivePointStarD(cx, cy, r)}" fill="${es}" stroke="${stroke}" stroke-width="0.35"/>`;
  }
  const capX = w * 0.46;
  const capY = 2;
  const capW = w * 0.48;
  const capH = h * 0.38;
  const capRx = Math.min(7, h * 0.09);
  const capStarR = Math.max(2.2, h * 0.058);
  const capStarCx = w * 0.71;
  const capStarCy = h * 0.14;
  return `<g class="silks-icon">
    <rect x="${torsoX}" y="${torsoY.toFixed(1)}" width="${torsoW.toFixed(1)}" height="${torsoH.toFixed(1)}" rx="3" fill="${eb}" stroke="${stroke}" stroke-width="1"/>
    <rect x="2" y="${(h * 0.4).toFixed(1)}" width="${(w * 0.16).toFixed(1)}" height="${(h * 0.28).toFixed(1)}" rx="2" fill="${eb}" stroke="${stroke}" stroke-width="1"/>
    <rect x="${(w * 0.36).toFixed(1)}" y="${(h * 0.4).toFixed(1)}" width="${(w * 0.2).toFixed(1)}" height="${(h * 0.26).toFixed(1)}" rx="2" fill="${eb}" stroke="${stroke}" stroke-width="1"/>
    ${starEls}
    <rect x="${capX.toFixed(1)}" y="${capY}" width="${capW.toFixed(1)}" height="${capH.toFixed(1)}" rx="${capRx.toFixed(1)}" fill="${ec}" stroke="${stroke}" stroke-width="1"/>
    <path d="${fivePointStarD(capStarCx, capStarCy, capStarR)}" fill="${es}" stroke="${stroke}" stroke-width="0.4"/>
  </g>`;
}

/** Inline handler: hide broken bitmap, show procedural sibling (no double quotes inside). */
const SILK_IMG_ONERROR_ATTR = escAttr(
  "this.style.display='none';var n=this.nextElementSibling;if(n)n.style.display='inline-block';",
);

/**
 * Procedural shirt+cap SVG only (no wrapper). When `force` is true, missing `body` uses greys so bitmap fallback always works.
 * Pass explicit `w`/`h` when matching a bitmap `<img>` box (aspect ratio).
 */
function proceduralSilkSvgMarkup(
  silks: RunnerSilks,
  force: boolean,
  w: number,
  h: number,
): string {
  /* Failed bitmap: always use shirt+cap icon so placeholders match Timeform-style layout. */
  const patternEff: SilkPattern = force ? "silks_icon" : (silks.pattern ?? "halves");

  if (!force && !silks.body?.trim()) return "";
  const body = normHex(silks.body ?? "", "#525252");
  const secondary = normHex(silks.secondary ?? silks.body ?? "", body);
  const cap = normHex(silks.cap ?? secondary, "#f8fafc");

  let inner: string;
  let frameOverlay: string;

  if (patternEff === "silks_icon") {
    inner = svgSilksIcon(w, h, body, secondary, cap);
    frameOverlay = `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="#262626" stroke-width="1" rx="2"/>`;
  } else {
    const capH = Math.max(5, Math.round(h * 0.22));
    const bodyH = h - capH;
    if (patternEff === "chest_disc") {
      const armBand = normHex(silks.accent ?? "", "#ffffff");
      inner = `${simpleCapRect(w, capH, cap)}${svgChestDisc(w, capH, bodyH, body, secondary, armBand)}`;
    } else if (patternEff === "v_chest") {
      const collar = normHex(silks.accent ?? "", "#0f172a");
      inner = `${svgVChest(w, capH, bodyH, body, secondary, cap, collar)}`;
    } else if (patternEff === "chevron") {
      inner = `${simpleCapRect(w, capH, cap)}${svgChevronBody(w, capH, bodyH, body, secondary)}`;
    } else {
      inner = `${simpleCapRect(w, capH, cap)}${classicBodySvg(patternEff, w, capH, bodyH, body, secondary)}`;
    }
    frameOverlay = `<rect x="0.5" y="${capH - 0.5}" width="${w - 1}" height="${bodyH + 0.5}" fill="none" stroke="#262626" stroke-width="1" rx="0"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="led-silk-svg">
    ${inner}
    ${frameOverlay}
  </svg>`;
}

function proceduralDimensionsFromHeight(heightPx: number, patternEff: SilkPattern): { w: number; h: number } {
  const h = Math.max(18, Math.min(400, heightPx));
  const w = patternEff === "silks_icon" ? Math.round(h * 0.9) : Math.round(h * 0.58);
  return { w, h };
}

/**
 * Renders a silk badge: bitmap (`imageUrl` or Timeform `silkCode`) when present, else procedural SVG shirt + cap.
 * When a bitmap URL is set but fails (403, 404, proxy off), a hidden procedural SVG is shown via `img` `onerror`.
 */
export function raceSilkBadgeHtml(silks: RunnerSilks | undefined, heightPx: number): string {
  if (!silks) return "";

  const imgUrl = effectiveSilkImageSrc(silks);
  if (imgUrl) {
    const h = silkImageBoxHeight(heightPx);
    const w = silkImageBoxWidth(heightPx, silks.imageAspectRatio);
    const src = escAttr(imgUrl);
    const fallbackSvg = proceduralSilkSvgMarkup(silks, true, w, h);
    const img = `<img class="led-silk-img" src="${src}" alt="" width="${w}" height="${h}" style="width:${w}px;height:${h}px;object-fit:contain;object-position:center;display:block;vertical-align:middle;" onerror="${SILK_IMG_ONERROR_ATTR}"/>`;
    if (fallbackSvg) {
      return `<span class="led-silk-wrap led-silk-wrap--image" aria-hidden="true">${img}<span class="led-silk-procedural-fallback" style="display:none;line-height:0;vertical-align:middle;">${fallbackSvg}</span></span>`;
    }
    return `<span class="led-silk-wrap led-silk-wrap--image" aria-hidden="true">${img}</span>`;
  }

  const patternForSize = silks.pattern ?? "halves";
  const { w, h } = proceduralDimensionsFromHeight(heightPx, patternForSize);
  const svg = proceduralSilkSvgMarkup(silks, false, w, h);
  if (!svg) return "";
  return `<span class="led-silk-wrap" aria-hidden="true">${svg}</span>`;
}
