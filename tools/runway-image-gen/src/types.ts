import type { TaskRetrieveResponse } from "@runwayml/sdk/resources/tasks";

import type { SportsBrand } from "../../../app/lib/runway-sports-image-templates.js";

export type { SportsBrand };

/** Inputs for `generateImage` — map directly to prompt assembly + Runway API body. */
export type GenerateImageInput = {
  brand: SportsBrand;
  /** e.g. "shorts_backdrop", "matchday_hero", "paddock_broll_still" */
  useCase: string;
  /** Visual direction, e.g. "dark_moody", "high_energy_broadcast" */
  style: string;
  /** User / creative subject line — combined into the final prompt (capped at 1000 chars total). */
  promptText: string;
  /** Output aspect. Default `1080:1920` for vertical social. */
  ratio?: Gen4Ratio;
  /** Optional reproducibility. */
  seed?: number;
  /** 1–3 HTTPS URLs; turbo model requires at least one (a default is used if omitted). */
  referenceImages?: Array<{ uri: string; tag?: string }>;
  /** Default `gen4_image_turbo`. */
  model?: "gen4_image_turbo" | "gen4_image";
  /**
   * If true, `promptText` is sent as-is (still length-checked). If false, brand/useCase/style templates wrap it.
   */
  rawPrompt?: boolean;
  /** SDK wait timeout (ms). Default 600_000 (10 min). `null` = unbounded (not recommended). */
  waitTimeoutMs?: number | null;
};

/** Ratios accepted for gen4_image / gen4_image_turbo in the current SDK. */
export type Gen4Ratio =
  | "1024:1024"
  | "1080:1080"
  | "1168:880"
  | "1360:768"
  | "1440:1080"
  | "1080:1440"
  | "1808:768"
  | "1920:1080"
  | "1080:1920"
  | "2112:912"
  | "1280:720"
  | "720:1280"
  | "720:720"
  | "960:720"
  | "720:960"
  | "1680:720";

export type GenerateImageSuccess = {
  task: TaskRetrieveResponse.Succeeded;
  /** Final prompt sent to Runway (after template + truncation). */
  finalPrompt: string;
  meta: {
    brand: SportsBrand;
    useCase: string;
    style: string;
    model: "gen4_image_turbo" | "gen4_image";
    ratio: Gen4Ratio;
    usedDefaultReference: boolean;
  };
};
