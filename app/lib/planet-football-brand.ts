/** Planet Football brand tokens — colours, icon, patterns, typography. */

export const PLANET_FOOTBALL_COLORS = {
  greenYellow: "#B6F657",
  aquamarine: "#79F8CA",
  sandyBrown: "#F6A357",
  futsol: "#C461F2",
  icterine: "#EFF261",
  argentinianBlue: "#61B5F2",
  brightPink: "#FF5B8C",
  offBlack: "#111111",
  white: "#FFFFFF",
} as const;

export const PLANET_FOOTBALL_FONT =
  '"Arial Black", "Helvetica Neue", Helvetica, sans-serif';

/** PF symbol — rounded square logo with goal-post P mark (official app icon). */
export function planetFootballSymbolSvg(className = ""): string {
  const cls = className ? ` class="${className}"` : "";
  const ink = PLANET_FOOTBALL_COLORS.offBlack;
  const paper = PLANET_FOOTBALL_COLORS.white;
  return `<svg${cls} viewBox="0 0 120 120" role="img" aria-label="Planet Football">
    <rect x="24" y="28" width="72" height="72" rx="14" fill="${ink}"/>
    <rect x="18" y="22" width="72" height="72" rx="14" fill="${paper}" stroke="${ink}" stroke-width="5"/>
    <rect x="30" y="34" width="14" height="50" fill="${ink}"/>
    <rect x="30" y="34" width="38" height="12" fill="${ink}"/>
    <rect x="44" y="46" width="28" height="12" fill="${ink}"/>
    <rect x="44" y="46" width="12" height="38" fill="${ink}"/>
    <circle cx="78" cy="72" r="6.5" fill="${ink}"/>
  </svg>`;
}

/** Primary horizontal logo — icon + single-line wordmark. */
export function planetFootballLogoHorizontalSvg(
  className = "",
  opts: { textFill?: string; accentFill?: string } = {},
): string {
  const textFill = opts.textFill ?? PLANET_FOOTBALL_COLORS.white;
  const accentFill = opts.accentFill ?? PLANET_FOOTBALL_COLORS.greenYellow;
  const cls = className ? ` class="${className}"` : "";
  return `<svg${cls} viewBox="0 0 300 48" role="img" aria-label="Planet Football">
    <g transform="translate(0,4) scale(0.34)">
      <rect x="24" y="28" width="72" height="72" rx="14" fill="${PLANET_FOOTBALL_COLORS.offBlack}"/>
      <rect x="18" y="22" width="72" height="72" rx="14" fill="${PLANET_FOOTBALL_COLORS.white}" stroke="${PLANET_FOOTBALL_COLORS.offBlack}" stroke-width="5"/>
      <rect x="30" y="34" width="14" height="50" fill="${PLANET_FOOTBALL_COLORS.offBlack}"/>
      <rect x="30" y="34" width="38" height="12" fill="${PLANET_FOOTBALL_COLORS.offBlack}"/>
      <rect x="44" y="46" width="28" height="12" fill="${PLANET_FOOTBALL_COLORS.offBlack}"/>
      <rect x="44" y="46" width="12" height="38" fill="${PLANET_FOOTBALL_COLORS.offBlack}"/>
      <circle cx="78" cy="72" r="6.5" fill="${PLANET_FOOTBALL_COLORS.offBlack}"/>
    </g>
    <text x="46" y="22" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="17" font-weight="900" fill="${textFill}">Planet</text>
    <text x="46" y="42" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="17" font-weight="900" fill="${accentFill}">Football</text>
  </svg>`;
}

/** Compact stacked wordmark for corners (icon + two-line text). */
export function planetFootballLogoStackedSvg(className = ""): string {
  return planetFootballLogoHorizontalSvg(className, {
    textFill: PLANET_FOOTBALL_COLORS.greenYellow,
    accentFill: PLANET_FOOTBALL_COLORS.greenYellow,
  });
}

/** Halftone dot cluster — top-right brand pattern. */
export function planetFootballHalftonePatternSvg(className = "pf-halftone"): string {
  const ink = PLANET_FOOTBALL_COLORS.greenYellow;
  return `<svg class="${className}" viewBox="0 0 240 240" aria-hidden="true">
    <circle cx="212" cy="28" r="18" fill="${ink}" opacity="0.22"/>
    <circle cx="188" cy="48" r="14" fill="${ink}" opacity="0.18"/>
    <circle cx="168" cy="68" r="11" fill="${ink}" opacity="0.15"/>
    <circle cx="148" cy="88" r="9" fill="${ink}" opacity="0.12"/>
    <circle cx="128" cy="108" r="7" fill="${ink}" opacity="0.1"/>
    <circle cx="110" cy="126" r="5.5" fill="${ink}" opacity="0.08"/>
    <circle cx="94" cy="142" r="4.5" fill="${ink}" opacity="0.07"/>
    <circle cx="80" cy="156" r="3.5" fill="${ink}" opacity="0.06"/>
    <circle cx="68" cy="168" r="3" fill="${ink}" opacity="0.05"/>
  </svg>`;
}

/** Tactical chalk marks — arrows, X and O (brand pattern). */
export function planetFootballTacticalPatternSvg(className = "pf-tactical"): string {
  const ink = PLANET_FOOTBALL_COLORS.greenYellow;
  return `<svg class="${className}" viewBox="0 0 520 520" aria-hidden="true">
    <path d="M88 392 Q168 312 248 268" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round" opacity="0.1"/>
    <polygon points="248,268 228,282 236,258" fill="${ink}" opacity="0.1"/>
    <path d="M248 268 Q332 228 392 188" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round" opacity="0.08"/>
    <polygon points="392,188 376,204 388,176" fill="${ink}" opacity="0.08"/>
    <text x="118" y="148" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="44" font-weight="900" fill="${ink}" opacity="0.07">X</text>
    <text x="228" y="248" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="40" font-weight="900" fill="${ink}" opacity="0.06">X</text>
    <text x="348" y="168" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="38" font-weight="900" fill="${ink}" opacity="0.06">X</text>
    <text x="168" y="328" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="36" font-weight="900" fill="${ink}" opacity="0.06">O</text>
    <text x="288" y="368" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="34" font-weight="900" fill="${ink}" opacity="0.05">O</text>
    <text x="388" y="308" font-family="Arial Black, Helvetica Neue, sans-serif" font-size="32" font-weight="900" fill="${ink}" opacity="0.05">O</text>
  </svg>`;
}

/** Pitch watermark for lime-green panels. */
export function planetFootballPitchMarkingsSvg(accent: string, className = "pf-pitch"): string {
  return `<svg class="${className}" viewBox="0 0 520 1200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <circle cx="260" cy="760" r="210" fill="none" stroke="${accent}" stroke-width="2" opacity="0.14"/>
    <circle cx="260" cy="760" r="72" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.1"/>
    <line x1="0" y1="760" x2="520" y2="760" stroke="${accent}" stroke-width="1.5" opacity="0.08"/>
  </svg>`;
}

/** Full right-rail brand pattern — dark panel with subtle lime accents. */
export function planetFootballRightRailPatternHtml(): string {
  const { greenYellow, offBlack } = PLANET_FOOTBALL_COLORS;
  return `<div class="pf-rail-pattern" aria-hidden="true">
    <svg class="pf-rail-pattern-bg" viewBox="0 0 520 1200" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="pf-rail-glow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="${greenYellow}" stop-opacity="0.14"/>
          <stop offset="42%" stop-color="${greenYellow}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="520" height="1200" fill="${offBlack}"/>
      <rect width="520" height="1200" fill="url(#pf-rail-glow)"/>
      <rect x="0" y="0" width="4" height="1200" fill="${greenYellow}" opacity="0.24"/>
    </svg>
    ${planetFootballPitchMarkingsSvg(greenYellow, "pf-rail-pitch")}
    ${planetFootballTacticalPatternSvg("pf-rail-tactical")}
    ${planetFootballHalftonePatternSvg("pf-rail-halftone")}
  </div>`;
}

/** Combined decorative layers for dark templates. */
export function planetFootballBrandPatternsHtml(accent: string = PLANET_FOOTBALL_COLORS.greenYellow): string {
  return planetFootballRightRailPatternHtml();
}
