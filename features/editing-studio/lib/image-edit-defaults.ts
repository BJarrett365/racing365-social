import type { CropAspectPresetId, ImageEditSettingsV1, NormalizedRect } from "@/features/editing-studio/types/image-edit";

const FULL: NormalizedRect = { x: 0, y: 0, w: 1, h: 1 };

export function defaultImageEditSettings(aspectPreset: CropAspectPresetId = "1:1"): ImageEditSettingsV1 {
  return {
    version: 1,
    aspectPreset,
    crop: { ...FULL },
    focalPoint: { x: 0.5, y: 0.5 },
    blurBackground: false,
    extendMode: "blur",
    extendColor: "#111827",
    brightness: 0,
    contrast: 0,
    gradientOverlay: false,
    textBadge: false,
    logoBadge: false,
    ctaChip: false,
    safeZoneOverlay: true,
  };
}
