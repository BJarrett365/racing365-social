import type { GeneratedContent } from "@/types";
import type { RunwayBgBrand } from "@/app/lib/runway-background-prompt-types";
import { sceneDisplayLabel } from "@/app/lib/scene-display-labels";

export type RunwayI2vMotionAiSlide = {
  id?: string;
  type?: string;
  label: string;
  headline: string;
  subline: string;
};

export type RunwayI2vMotionAiFields = {
  brand: RunwayBgBrand;
  title: string;
  strapline?: string;
  sourceUrl?: string;
  tags?: string[];
  slides: RunwayI2vMotionAiSlide[];
  articleBodySample?: string;
  editorMotionContext?: string;
};

/** Context for `/api/ai/runway-image-to-video-prompt` from a racecard Short in the editor. */
export function buildRacecardRunwayI2vFields(content: GeneratedContent): RunwayI2vMotionAiFields {
  const brand: RunwayBgBrand = "Racing365";
  const title =
    (content.headline && content.headline.trim()) ||
    (content.caption && content.caption.trim()) ||
    "Racecard";

  const fmt = "racecard" as const;
  const slides: RunwayI2vMotionAiSlide[] = (content.scenes ?? []).map((s) => ({
    id: s.id,
    type: fmt,
    label: sceneDisplayLabel(fmt, s.id),
    headline: (s.captionLine ?? "").trim() || "(no scene caption)",
    subline: "",
  }));

  const scriptSample = (content.script ?? "").replace(/\s+/g, " ").trim().slice(0, 1200);
  const articleBodySample = scriptSample || undefined;

  let sourceUrl: string | undefined;
  const ts = content.templateSource;
  if (ts?.format === "racecard") {
    const u = ts.snapshot.sourceUrl?.trim();
    if (u) sourceUrl = u;
  }

  const strap =
    (content.caption ?? "").trim() &&
    (content.caption ?? "").trim() !== (content.headline ?? "").trim()
      ? (content.caption ?? "").trim()
      : undefined;

  const editorMotionContext =
    slides.length === 0
      ? [`format: racecard`, `headline: ${title}`, articleBodySample ? `script_sample: ${articleBodySample}` : ""]
          .filter(Boolean)
          .join("\n")
      : undefined;

  return {
    brand,
    title,
    ...(strap ? { strapline: strap } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    slides,
    ...(articleBodySample ? { articleBodySample } : {}),
    ...(editorMotionContext ? { editorMotionContext } : {}),
  };
}
