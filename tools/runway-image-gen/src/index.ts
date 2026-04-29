/**
 * @racing365/runway-image-gen — RunwayML text-to-image for sports media pipelines.
 * Prompt templates live in `app/lib/runway-sports-image-templates.ts` (shared with the repo; no Next text-to-image route).
 */

export * from "./constants.js";
export {
  BRAND_VOICE,
  USE_CASE_HINTS,
  SPORTS_PROMPT_MAX_LENGTH,
  buildFinalPrompt,
  buildSportsPrompt,
  clampPrompt,
  type SportsBrand,
} from "../../../app/lib/runway-sports-image-templates.js";
export * from "./presets.js";
export * from "./types.js";
export { log } from "./logger.js";
export { generateImage } from "./generate-image.js";
