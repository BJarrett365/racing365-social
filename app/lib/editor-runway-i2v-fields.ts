import type { ContentFormat, GeneratedContent } from "@/types";
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

export function runwayBrandForEditorFormat(format: ContentFormat): RunwayBgBrand {
  if (format === "teamtalk-news") return "TEAMtalk";
  if (format === "f1-grid" || format === "f1-results") return "PlanetF1";
  return "Racing365";
}

/** Context for `/api/ai/runway-image-to-video-prompt` from a generic Short editor template. */
export function buildEditorRunwayI2vFields(content: GeneratedContent, format: ContentFormat): RunwayI2vMotionAiFields {
  const brand = runwayBrandForEditorFormat(format);
  const title =
    (content.headline && content.headline.trim()) ||
    (content.caption && content.caption.trim()) ||
    "Editor template";

  const slides: RunwayI2vMotionAiSlide[] = (content.scenes ?? []).map((s) => ({
    id: s.id,
    type: format,
    label: sceneDisplayLabel(format, s.id),
    headline: (s.captionLine ?? "").trim() || "(no scene caption)",
    subline: "",
  }));

  const scriptSample = (content.script ?? "").replace(/\s+/g, " ").trim().slice(0, 1200);
  const articleBodySample = scriptSample || undefined;

  let sourceUrl: string | undefined;
  let tags: string[] | undefined;
  const ts = content.templateSource;
  if (ts?.format === "teamtalk-news") {
    const u = ts.bundle.sourceUrl?.trim();
    if (u) sourceUrl = u;
    const tag = ts.bundle.tag?.trim();
    if (tag) tags = [tag];
  } else if (ts?.format === "racecard") {
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
      ? [
          `format: ${format}`,
          `headline: ${title}`,
          strap ? `caption: ${strap}` : "",
          articleBodySample ? `script_sample: ${articleBodySample}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : undefined;

  return {
    brand,
    title,
    ...(strap ? { strapline: strap } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(tags?.length ? { tags } : {}),
    slides,
    ...(articleBodySample ? { articleBodySample } : {}),
    ...(editorMotionContext ? { editorMotionContext } : {}),
  };
}
