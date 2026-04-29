/**
 * Example prompt presets — copy/paste starting points for Racing365, TEAMtalk, PlanetF1.
 * Each preset is a ready-made `GenerateImageInput` minus API secret.
 */

import type { GenerateImageInput } from "./types.js";

export const PRESET_RACING365_SHORTS_BACKDROP: GenerateImageInput = {
  brand: "racing365",
  useCase: "shorts_backdrop",
  style: "dark_moody_neon_accents",
  promptText:
    "Abstract pit lane bokeh, rain-slick asphalt reflections, subtle motion streaks, vertical composition, no text",
};

export const PRESET_TEAMTALK_MATCHDAY: GenerateImageInput = {
  brand: "teamtalk",
  useCase: "matchday_hero",
  style: "high_contrast_stadium_floodlights",
  promptText: "Empty pitch center circle at night, dramatic lights, crowd as soft bokeh, space for headline",
};

export const PRESET_PLANETF1_PADDOCK: GenerateImageInput = {
  brand: "planetf1",
  useCase: "paddock_broll_still",
  style: "documentary_golden_hour",
  promptText: "Paddock lane depth, equipment racks silhouetted, warm sunset rim light, no people faces in focus",
};

/** All named presets (for examples / CLI). */
export const PROMPT_PRESETS = {
  racing365_shorts_backdrop: PRESET_RACING365_SHORTS_BACKDROP,
  teamtalk_matchday: PRESET_TEAMTALK_MATCHDAY,
  planetf1_paddock: PRESET_PLANETF1_PADDOCK,
} as const;
