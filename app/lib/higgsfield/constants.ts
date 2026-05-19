/** Model path segment under https://platform.higgsfield.ai/ — override via Admin or HIGGSFIELD_IMAGE_EDIT_ENDPOINT */
export const DEFAULT_HIGGSFIELD_IMAGE_EDIT_ENDPOINT = "flux-pro/kontext/max/text-to-image";

/**
 * Prompt-only text-to-image (no reference image). Override with env `HIGGSFIELD_TEXT_TO_IMAGE_ENDPOINT`.
 * Must match a model your Higgsfield project exposes.
 */
export const DEFAULT_HIGGSFIELD_TEXT_TO_IMAGE_ENDPOINT = "bytedance/seedream/v4/text-to-image";
