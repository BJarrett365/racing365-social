/** Default reference still for `gen4_image_turbo` when none supplied (Runway playground pattern). */
export const RUNWAY_T2I_DEFAULT_TURBO_REFERENCE_URI =
  "https://runway-static-assets.s3.us-east-1.amazonaws.com/devportal/playground-examples/t2i_gen4_image_turbo_input.png";

export const RUNWAY_T2I_PROMPT_MAX = 1000;

/** Ratios exposed in News Shorts UI (9:16 and 16:9 HD). */
export const RUNWAY_T2I_RATIOS_NEWS_SHORTS = ["1080:1920", "720:1280", "1920:1080", "1280:720"] as const;
export type RunwayT2iRatioNewsShorts = (typeof RUNWAY_T2I_RATIOS_NEWS_SHORTS)[number];

const ALLOWED = new Set<string>(RUNWAY_T2I_RATIOS_NEWS_SHORTS);

export function isAllowedRunwayT2iRatio(r: string): r is RunwayT2iRatioNewsShorts {
  return ALLOWED.has(r);
}
