import type { TeamLineUpExportAspect } from "@/types";

export function teamLineUpExportDimensions(aspect: TeamLineUpExportAspect = "landscape"): {
  width: number;
  height: number;
} {
  switch (aspect) {
    case "portrait":
      return { width: 1080, height: 1350 };
    case "story":
      return { width: 1080, height: 1920 };
    case "social":
      return { width: 1080, height: 1350 };
    case "landscape":
    default:
      return { width: 1920, height: 1080 };
  }
}
