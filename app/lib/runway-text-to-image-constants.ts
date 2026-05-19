/** Default reference still for `gen4_image_turbo` when none supplied (Runway playground pattern). */
export const RUNWAY_T2I_DEFAULT_TURBO_REFERENCE_URI =
  "https://runway-static-assets.s3.us-east-1.amazonaws.com/devportal/playground-examples/t2i_gen4_image_turbo_input.png";

export const RUNWAY_T2I_PROMPT_MAX = 1000;

/**
 * Gen-4 `gen4_image` / `gen4_image_turbo` `ratio` values (matches `@runwayml/sdk` TextToImageCreateParams).
 * Used by Language Studio (Article Studio pipeline), Data Studio, etc.
 */
export const RUNWAY_T2I_RATIOS_GEN4_IMAGE = [
  "1080:1920",
  "720:1280",
  "1920:1080",
  "1280:720",
  "1360:768",
  "1680:720",
  "1808:768",
  "2112:912",
  "1024:1024",
  "1080:1080",
  "720:720",
  "1440:1080",
  "960:720",
  "1168:880",
  "1080:1440",
  "720:960",
] as const;

export type RunwayT2iRatioGen4Image = (typeof RUNWAY_T2I_RATIOS_GEN4_IMAGE)[number];

/** @deprecated Prefer RUNWAY_T2I_RATIOS_GEN4_IMAGE — same tuple; kept for existing imports */
export const RUNWAY_T2I_RATIOS_NEWS_SHORTS = RUNWAY_T2I_RATIOS_GEN4_IMAGE;

export type RunwayT2iRatioNewsShorts = RunwayT2iRatioGen4Image;

const ALLOWED = new Set<string>(RUNWAY_T2I_RATIOS_GEN4_IMAGE);

export function isAllowedRunwayT2iRatio(r: string): r is RunwayT2iRatioGen4Image {
  return ALLOWED.has(r);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** Readable dropdown label, e.g. `1920 × 1080 (16:9)` */
export function formatRunwayT2iRatioLabel(ratio: string): string {
  const parts = ratio.split(":");
  if (parts.length !== 2) return ratio.replace(":", " × ");
  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return ratio.replace(":", " × ");
  }
  const g = gcd(w, h);
  const rw = Math.round(w / g);
  const rh = Math.round(h / g);
  return `${w} × ${h} (${rw}:${rh})`;
}
