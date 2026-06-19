/** Football365 brand tokens — colours, F symbol, logo, panel pattern. */

export const FOOTBALL365_COLORS = {
  richNavy: "#161E26",
  aqua: "#1FFFFF",
  white: "#FFFFFF",
  indigo: "#024059",
  yellow: "#FFE922",
  verdigris: "#00AFB9",
  columbia: "#B9D6F2",
  uiGreen: "#20FC8F",
  uiRed: "#E9292D",
} as const;

export const FOOTBALL365_FONT =
  '"Helvetica Neue", Helvetica, Arial, sans-serif';

/** Official F365 app-icon mark (graph F + football dot). */
function football365SymbolMark(ink: string): string {
  return `<rect x="30" y="30" width="12" height="58" fill="${ink}"/>
    <rect x="42" y="30" width="46" height="12" fill="${ink}"/>
    <rect x="42" y="50" width="34" height="12" fill="${ink}"/>
    <rect x="42" y="70" width="22" height="12" fill="${ink}"/>
    <circle cx="76" cy="76" r="7" fill="${ink}"/>`;
}

/** F365 symbol — matches @F365 profile / app icon. */
export function football365SymbolSvg(className = "", invert = false): string {
  const cls = className ? ` class="${className}"` : "";
  const tile = invert ? FOOTBALL365_COLORS.richNavy : FOOTBALL365_COLORS.aqua;
  const ink = invert ? FOOTBALL365_COLORS.aqua : FOOTBALL365_COLORS.richNavy;
  return `<svg${cls} viewBox="0 0 120 120" role="img" aria-label="Football365">
    <rect x="10" y="10" width="100" height="100" rx="22" fill="${tile}"/>
    ${football365SymbolMark(ink)}
  </svg>`;
}

/** Primary logo — F symbol + Football365 wordmark for dark panels. */
export function football365LogoHorizontalSvg(className = ""): string {
  const cls = className ? ` class="${className}"` : "";
  const { aqua, richNavy, white } = FOOTBALL365_COLORS;
  return `<svg${cls} viewBox="0 0 300 48" role="img" aria-label="Football365">
    <g transform="translate(0,6) scale(0.3)">
      <rect x="10" y="10" width="100" height="100" rx="22" fill="${aqua}"/>
      ${football365SymbolMark(richNavy)}
    </g>
    <text x="44" y="34" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="0.02em" fill="${white}">Football</text>
    <text x="148" y="34" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="0.02em" fill="${aqua}">365</text>
  </svg>`;
}

/** Rich navy right-rail pattern with subtle aqua glow. */
export function football365RightRailPatternHtml(): string {
  const { richNavy, aqua } = FOOTBALL365_COLORS;
  return `<div class="f365-rail-pattern" aria-hidden="true">
    <svg class="f365-rail-bg" viewBox="0 0 520 1200" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="f365-rail-glow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="${aqua}" stop-opacity="0.16"/>
          <stop offset="38%" stop-color="${aqua}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="520" height="1200" fill="${richNavy}"/>
      <rect width="520" height="1200" fill="url(#f365-rail-glow)"/>
      <rect x="0" y="0" width="5" height="1200" fill="${aqua}" opacity="0.28"/>
    </svg>
  </div>`;
}
