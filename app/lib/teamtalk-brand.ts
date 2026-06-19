/** TEAMtalk brand tokens — colours, TT mark, logo, chevron pattern. */

export const TEAMTALK_COLORS = {
  mint: "#70E1A1",
  mintBright: "#23FF9F",
  navy: "#2D313E",
  navyDark: "#1A1F2C",
  white: "#FFFFFF",
} as const;

export const TEAMTALK_FONT =
  '"Roboto Condensed", "Helvetica Neue", Arial, sans-serif';

/** TT logomark — charcoal tile with mint TT symbol. */
export function teamtalkSymbolSvg(className = ""): string {
  const cls = className ? ` class="${className}"` : "";
  return `<svg${cls} viewBox="0 0 120 120" role="img" aria-label="TEAMtalk">
    <rect x="10" y="10" width="100" height="100" rx="18" fill="${TEAMTALK_COLORS.navy}"/>
    <path fill="${TEAMTALK_COLORS.mint}" d="M32 36h56v14H66v52H54V50H32V36z"/>
    <path fill="${TEAMTALK_COLORS.mint}" d="M68 50h20v14H80v38H68V64L80 50H68z"/>
  </svg>`;
}

/** Horizontal logo — TT icon + TEAMTALK wordmark. */
export function teamtalkLogoHorizontalSvg(className = ""): string {
  const cls = className ? ` class="${className}"` : "";
  return `<svg${cls} viewBox="0 0 280 48" role="img" aria-label="TEAMtalk">
    <g transform="translate(0,6) scale(0.3)">
      <rect x="10" y="10" width="100" height="100" rx="18" fill="${TEAMTALK_COLORS.navy}"/>
      <path fill="${TEAMTALK_COLORS.mint}" d="M32 36h56v14H66v52H54V50H32V36z"/>
      <path fill="${TEAMTALK_COLORS.mint}" d="M68 50h20v14H80v38H68V64L80 50H68z"/>
    </g>
    <text x="44" y="34" font-family="Roboto Condensed, Helvetica Neue, Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="0.1em" fill="${TEAMTALK_COLORS.white}">TEAMTALK</text>
  </svg>`;
}

/** Chevron / diamond brand pattern for dark panels. */
export function teamtalkChevronPatternSvg(className = "tt-chevron"): string {
  return `<svg class="${className}" viewBox="0 0 520 1200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <pattern id="tt-chevron-grid" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M0 28 L28 0 L56 28 L28 56 Z" fill="none" stroke="rgba(255,255,255,0.055)" stroke-width="1.2"/>
      </pattern>
    </defs>
    <rect width="520" height="1200" fill="${TEAMTALK_COLORS.navy}"/>
    <rect width="520" height="1200" fill="url(#tt-chevron-grid)"/>
    <rect width="520" height="1200" fill="${TEAMTALK_COLORS.navyDark}" opacity="0.22"/>
  </svg>`;
}

/** Full right-rail pattern for split team sheets. */
export function teamtalkRightRailPatternHtml(): string {
  return `<div class="tt-rail-pattern" aria-hidden="true">
    ${teamtalkChevronPatternSvg("tt-rail-chevron")}
  </div>`;
}
