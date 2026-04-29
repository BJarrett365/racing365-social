import type { GeneratedContent, TemplateSource } from "@/types";

/** Writes backdrop paths into `templateSource` so Save template / browser draft persists them. */
export function mergeBackdropIntoContent(
  content: GeneratedContent,
  partial: {
    backgroundVideoRel?: string | null;
    backgroundImageRel?: string | null;
    backgroundImageRelBySceneId?: Record<string, string> | null;
    motionBackdropOpaqueOpacity?: number;
    motionBackdropDimStrength?: number;
  },
): GeneratedContent {
  const ts = content.templateSource;
  if (!ts) return content;

  const bg: {
    backgroundImageRel?: string;
    backgroundImageRelBySceneId?: Record<string, string>;
    backgroundVideoRel?: string;
    motionBackdropOpaqueOpacity?: number;
    motionBackdropDimStrength?: number;
  } = {};

  if (partial.backgroundVideoRel !== undefined) {
    const v = partial.backgroundVideoRel?.trim();
    bg.backgroundVideoRel = v || undefined;
  }
  if (partial.backgroundImageRel !== undefined) {
    const v = partial.backgroundImageRel?.trim();
    bg.backgroundImageRel = v || undefined;
  }
  if (partial.backgroundImageRelBySceneId !== undefined) {
    const m = partial.backgroundImageRelBySceneId;
    bg.backgroundImageRelBySceneId =
      m && Object.keys(m).length > 0 ? { ...m } : undefined;
  }
  if (
    partial.motionBackdropOpaqueOpacity !== undefined &&
    Number.isFinite(partial.motionBackdropOpaqueOpacity)
  ) {
    bg.motionBackdropOpaqueOpacity = partial.motionBackdropOpaqueOpacity;
  }
  if (
    partial.motionBackdropDimStrength !== undefined &&
    Number.isFinite(partial.motionBackdropDimStrength)
  ) {
    bg.motionBackdropDimStrength = partial.motionBackdropDimStrength;
  }

  const merge = <T extends object>(base: T): T => ({ ...base, ...bg });

  let nextSource: TemplateSource;
  switch (ts.format) {
    case "next-off":
      nextSource = { format: "next-off", bundle: merge(ts.bundle) };
      break;
    case "fast-results":
      nextSource = { format: "fast-results", bundle: merge(ts.bundle) };
      break;
    case "racecard":
      nextSource = { format: "racecard", snapshot: merge(ts.snapshot) };
      break;
    case "teamtalk-news":
      nextSource = { format: "teamtalk-news", bundle: merge(ts.bundle) };
      break;
    case "f1-grid":
      nextSource = { format: "f1-grid", bundle: merge(ts.bundle) };
      break;
    case "f1-results":
      nextSource = { format: "f1-results", bundle: merge(ts.bundle) };
      break;
    case "football-lineups":
      return content;
    default:
      return content;
  }

  return { ...content, templateSource: nextSource };
}
