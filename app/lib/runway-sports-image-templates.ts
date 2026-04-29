/**
 * Sports brand prompt templates for Runway text-to-image (used by `tools/runway-image-gen` CLI only).
 * The Next.js app no longer exposes a text-to-image API; edit prompts here for the standalone generator.
 */

/** Runway API limit (UTF-16 code units). */
export const SPORTS_PROMPT_MAX_LENGTH = 1000;

/** Supported sports media brands — extend as you add templates. */
export type SportsBrand = "racing365" | "teamtalk" | "planetf1";

/** Short brand “voice” fragments prepended to structured prompts. */
export const BRAND_VOICE: Record<SportsBrand, string> = {
  racing365:
    "Racing365 premium motorsport aesthetic: credible pit-lane energy, broadcast polish, no fake logos or readable sponsor text.",
  teamtalk:
    "TEAMtalk football media look: stadium atmosphere, editorial sports photography feel, no club crests or readable kit text.",
  planetf1:
    "PlanetF1 F1 editorial tone: technical glamour, trackside mood, no team logos or readable branding in frame.",
};

/** Optional: map useCase to extra one-line hints (extend per product). */
export const USE_CASE_HINTS: Record<string, string> = {
  shorts_backdrop:
    "Vertical mobile frame, safe for overlays, abstract motion-friendly background, no text in frame.",
  matchday_hero: "Hero still for article or social card, strong focal subject, negative space for headline overlay.",
  paddock_broll_still: "B-roll still, shallow depth, documentary lighting.",
  default: "Sports editorial still suitable for video or social pipeline reuse.",
};

function hintForUseCase(useCase: string): string {
  const key = useCase.trim().toLowerCase().replace(/\s+/g, "_");
  return USE_CASE_HINTS[key] ?? USE_CASE_HINTS.default;
}

function styleLine(style: string): string {
  const s = style.trim();
  if (!s) return "Cinematic lighting, high detail.";
  return `Visual style: ${s.replace(/_/g, " ")}.`;
}

/**
 * Assembles brand + use-case + style + user prompt into one Runway `promptText`.
 * Truncates from the end if needed to respect SPORTS_PROMPT_MAX_LENGTH.
 */
export function buildSportsPrompt(input: {
  brand: SportsBrand;
  useCase: string;
  style: string;
  promptText: string;
}): string {
  const { brand, useCase, style, promptText } = input;
  const core = promptText.trim();
  const header = [
    BRAND_VOICE[brand],
    hintForUseCase(useCase),
    styleLine(style),
    core ? `Subject: ${core}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return clampPrompt(header);
}

/** Pass-through with length enforcement (for raw mode). */
export function clampPrompt(text: string): string {
  const t = text.trim();
  if (t.length <= SPORTS_PROMPT_MAX_LENGTH) return t;
  return t.slice(0, SPORTS_PROMPT_MAX_LENGTH);
}

/**
 * Builds the final string sent to Runway. If `rawPrompt`, only length-checks `promptText`.
 */
export function buildFinalPrompt(input: {
  brand: SportsBrand;
  useCase: string;
  style: string;
  promptText: string;
  rawPrompt?: boolean;
}): string {
  if (input.rawPrompt) {
    return clampPrompt(input.promptText);
  }
  return buildSportsPrompt(input);
}
