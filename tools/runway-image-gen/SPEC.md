# Text-to-image tool — specification checklist

Implements the **reusable image generation** spec (RunwayML SDK + `/v1/text_to_image`).

| Requirement | Where |
|-------------|--------|
| Inputs: `brand`, `useCase`, `style`, `promptText`, `ratio`, `seed`, `referenceImages` | `src/types.ts` (`GenerateImageInput`), `src/generate-image.ts` |
| RunwayML SDK | `src/generate-image.ts` (`RunwayML`, `textToImage.create`) |
| `client.textToImage.create(...)` | `src/generate-image.ts` |
| Wait for task output | `pending.waitForTaskOutput(...)` |
| Return final task response | `GenerateImageSuccess.task` = `TaskRetrieveResponse.Succeeded` |
| Clean console logs | `src/logger.ts`, `log.info` / `log.error` in `generate-image.ts` |
| Errors | `APIError`, `TaskFailedError`, `TaskTimedOutError`, missing key, validation |
| Swappable prompt templates | `app/lib/runway-sports-image-templates.ts` (`BRAND_VOICE`, `USE_CASE_HINTS`, `buildSportsPrompt`) |
| Brand helpers | Same file — shared with Next.js API |
| Default model `gen4_image_turbo` | `src/constants.ts` (`DEFAULT_MODEL`) |
| Default ratio `1080:1920` | `src/constants.ts` (`DEFAULT_RATIO`) |
| Optional `referenceImages` / `seed` | `GenerateImageInput`, `normalizeReferenceImages` |
| `promptText` ≤ 1000 chars | `MAX_PROMPT_LENGTH`, `clampPrompt` |
| Output for video/social pipeline | README: download `task.output[]` URLs promptly |
| Presets Racing365 / TEAMtalk / PlanetF1 | `src/presets.ts` |
| Example script | `examples/run.ts` |
| Env / install / usage | `README.md`, `env.example` |
