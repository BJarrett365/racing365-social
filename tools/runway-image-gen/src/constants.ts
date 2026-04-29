/**
 * Runway API version header — required on every request (SDK sets this when using `RunwayML`).
 * @see https://docs.dev.runwayml.com — must match the version your key supports.
 */
export const RUNWAY_API_VERSION = "2024-11-06";

/**
 * Official REST surface (SDK `textToImage.create` → POST this path on `api.dev.runwayml.com`).
 * Documented as “Text to image” in the Runway API reference.
 */
export const RUNWAY_TEXT_TO_IMAGE_HTTP_PATH = "/v1/text_to_image";

/**
 * `gen4_image_turbo` requires 1–3 reference images (SDK). Use this HTTPS asset when none are supplied.
 * Same pattern as Runway’s own playground examples.
 */
export const DEFAULT_TURBO_REFERENCE_IMAGE_URI =
  "https://runway-static-assets.s3.us-east-1.amazonaws.com/devportal/playground-examples/t2i_gen4_image_turbo_input.png";

/** Runway text-to-image prompt limit (UTF-16 code units). */
export const MAX_PROMPT_LENGTH = 1000;

/** Default vertical social frame (9:16). */
export const DEFAULT_RATIO = "1080:1920" as const;

/** Default model — fast, reference-guided. */
export const DEFAULT_MODEL = "gen4_image_turbo" as const;
