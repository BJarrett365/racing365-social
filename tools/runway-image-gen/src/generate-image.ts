/**
 * Core image generation — **text to image only** (not video).
 *
 * Flow (matches Runway `/v1/text_to_image` + task polling):
 * 1. Build `promptText` (≤1000 UTF-16 units) via {@link buildFinalPrompt}.
 * 2. `client.textToImage.create(params)` → starts async task.
 * 3. `waitForTaskOutput()` → returns `TaskRetrieveResponse.Succeeded` with `output[]` image URLs.
 *
 * Defaults: `gen4_image_turbo`, `1080:1920`. Output URLs are short-lived — fetch into your CDN for reuse in video/social pipelines.
 */

import RunwayML, {
  APIError,
  TaskFailedError,
  TaskTimedOutError,
} from "@runwayml/sdk";
import type { TextToImageCreateParams } from "@runwayml/sdk/resources/text-to-image";

import { buildFinalPrompt } from "../../../app/lib/runway-sports-image-templates.js";
import {
  DEFAULT_MODEL,
  DEFAULT_RATIO,
  DEFAULT_TURBO_REFERENCE_IMAGE_URI,
  MAX_PROMPT_LENGTH,
  RUNWAY_API_VERSION,
} from "./constants.js";
import { log } from "./logger.js";
import type { Gen4Ratio, GenerateImageInput, GenerateImageSuccess } from "./types.js";

const GEN4_RATIOS = new Set<string>([
  "1024:1024",
  "1080:1080",
  "1168:880",
  "1360:768",
  "1440:1080",
  "1080:1440",
  "1808:768",
  "1920:1080",
  "1080:1920",
  "2112:912",
  "1280:720",
  "720:1280",
  "720:720",
  "960:720",
  "720:960",
  "1680:720",
]);

function assertRatio(r: string): asserts r is Gen4Ratio {
  if (!GEN4_RATIOS.has(r)) {
    throw new Error(`Invalid gen4 ratio "${r}". See Gen4Ratio in types.ts.`);
  }
}

function resolveApiKey(): string {
  const key = process.env.RUNWAYML_API_SECRET?.trim();
  if (!key) {
    throw new Error(
      "Missing RUNWAYML_API_SECRET. Copy env.example to .env or export the variable (see README).",
    );
  }
  return key;
}

function normalizeReferenceImages(
  model: "gen4_image_turbo" | "gen4_image",
  refs: GenerateImageInput["referenceImages"],
): { list: Array<{ uri: string; tag?: string }>; usedDefault: boolean } {
  const cleaned =
    refs
      ?.map((r: { uri: string; tag?: string }) => {
        const uri = r.uri?.trim() ?? "";
        if (!uri.startsWith("https://")) {
          throw new Error('Each referenceImages[].uri must be an https URL.');
        }
        const tag = r.tag?.trim();
        return tag ? { uri, tag } : { uri };
      })
      .slice(0, 3) ?? [];

  if (model === "gen4_image_turbo") {
    if (cleaned.length === 0) {
      log.info("No referenceImages supplied — using default turbo reference asset.");
      return {
        list: [{ uri: DEFAULT_TURBO_REFERENCE_IMAGE_URI }],
        usedDefault: true,
      };
    }
    return { list: cleaned, usedDefault: false };
  }

  return { list: cleaned, usedDefault: false };
}

/**
 * Full pipeline: build prompt → textToImage.create → waitForTaskOutput → return succeeded task + meta.
 */
export async function generateImage(input: GenerateImageInput): Promise<GenerateImageSuccess> {
  const model = input.model ?? DEFAULT_MODEL;
  const ratio = (input.ratio ?? DEFAULT_RATIO) as Gen4Ratio;
  assertRatio(ratio);

  const finalPrompt = buildFinalPrompt({
    brand: input.brand,
    useCase: input.useCase,
    style: input.style,
    promptText: input.promptText,
    rawPrompt: input.rawPrompt,
  });

  if (finalPrompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt length ${finalPrompt.length} exceeds Runway limit ${MAX_PROMPT_LENGTH}.`);
  }

  const { list: referenceImages, usedDefault } = normalizeReferenceImages(model, input.referenceImages);

  const apiKey = resolveApiKey();
  const client = new RunwayML({ apiKey, runwayVersion: RUNWAY_API_VERSION });

  log.info("Starting generation", {
    brand: input.brand,
    useCase: input.useCase,
    model,
    ratio,
    promptChars: finalPrompt.length,
    referenceCount: referenceImages.length,
    seed: input.seed ?? null,
  });

  let params: TextToImageCreateParams;

  if (model === "gen4_image_turbo") {
    params = {
      model: "gen4_image_turbo",
      promptText: finalPrompt,
      ratio: ratio as TextToImageCreateParams.Gen4ImageTurbo["ratio"],
      referenceImages,
      ...(input.seed !== undefined ? { seed: input.seed } : {}),
    };
  } else {
    params = {
      model: "gen4_image",
      promptText: finalPrompt,
      ratio: ratio as TextToImageCreateParams.Gen4Image["ratio"],
      ...(referenceImages.length ? { referenceImages } : {}),
      ...(input.seed !== undefined ? { seed: input.seed } : {}),
    };
  }

  try {
    const pending = client.textToImage.create(params);
    const waitOpts =
      input.waitTimeoutMs === null
        ? { timeout: null as number | null }
        : { timeout: input.waitTimeoutMs ?? 600_000 };

    const { id: taskId } = await pending;
    log.info("Task created; waiting for output…", { taskId });

    const task = await pending.waitForTaskOutput(waitOpts);

    log.info("Task succeeded", {
      taskId: task.id,
      outputCount: task.output?.length ?? 0,
    });

    if (task.status !== "SUCCEEDED") {
      throw new Error(`Unexpected task status: ${(task as { status?: string }).status}`);
    }

    return {
      task,
      finalPrompt,
      meta: {
        brand: input.brand,
        useCase: input.useCase,
        style: input.style,
        model,
        ratio,
        usedDefaultReference: usedDefault,
      },
    };
  } catch (e) {
    if (e instanceof TaskFailedError) {
      const d = e.taskDetails;
      const msg =
        d.status === "FAILED" ? d.failure : d.status === "CANCELLED" ? "Task cancelled." : e.message;
      log.error("Runway task failed", e);
      throw new Error(`Runway task failed (${d.status}): ${msg}`);
    }
    if (e instanceof TaskTimedOutError) {
      log.error("Runway task timed out", e);
      throw new Error(`Runway wait timed out (task ${e.taskDetails.id}).`);
    }
    if (e instanceof APIError) {
      log.error("Runway API error", e);
      throw new Error(`Runway API: ${e.message}`);
    }
    log.error("Unexpected error", e);
    throw e;
  }
}
