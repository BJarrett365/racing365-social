import type { ContentFormat, GeneratedContent } from "@/types";
import type { RunwayBgBrand } from "@/app/lib/runway-background-prompt-types";

export function runwayBrandFromFormat(format: ContentFormat): RunwayBgBrand {
  switch (format) {
    case "next-off":
    case "fast-results":
    case "racecard":
      return "Racing365";
    case "teamtalk-news":
    case "football-lineups":
      return "TEAMtalk";
    case "f1-grid":
    case "f1-results":
      return "PlanetF1";
    default:
      return "Racing365";
  }
}

/** Short scene label for Runway / OpenAI prompts from current template + script. */
export function deriveRunwaySceneHint(content: GeneratedContent): string {
  const ts = content.templateSource;
  if (ts?.format === "next-off") {
    const t = ts.bundle.race?.title?.trim();
    if (t) return t.slice(0, 120);
  }
  if (ts?.format === "fast-results") {
    const t = ts.bundle.result?.race?.title?.trim();
    if (t) return t.slice(0, 120);
  }
  if (ts?.format === "racecard") {
    const t = ts.snapshot.race?.title?.trim();
    if (t) return t.slice(0, 120);
  }
  if (ts?.format === "teamtalk-news") {
    const line = ts.bundle.headlineLines?.find((l) => l?.trim());
    if (line) return line.trim().slice(0, 120);
  }
  if (ts?.format === "football-lineups") {
    return content.headline?.trim()?.slice(0, 120) || "match lineups";
  }
  if (ts?.format === "f1-grid" || ts?.format === "f1-results") {
    const t = ts.bundle.title?.trim();
    if (t) return t.slice(0, 120);
  }
  const cap = content.scenes[0]?.captionLine?.trim();
  if (cap) return cap.slice(0, 120);
  const hl = content.headline?.trim();
  if (hl) return hl.slice(0, 120);
  return "social short";
}
