import type { CropAspectPresetId, NormalizedPoint, NormalizedRect } from "@/features/editing-studio/types/image-edit";

export const CROP_ASPECT_PRESETS: readonly {
  id: CropAspectPresetId;
  label: string;
  ratio: number;
}[] = [
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "1.91:1", label: "1.91:1", ratio: 1.91 },
] as const;

export function aspectRatioForPreset(id: CropAspectPresetId): number {
  const p = CROP_ASPECT_PRESETS.find((x) => x.id === id);
  return p?.ratio ?? 1;
}

/**
 * Largest axis-aligned rect with given aspect ratio inside a 1×1 box, centred on `focal`.
 */
export function maxCropRectForAspect(
  imageAspect: number,
  targetAspect: number,
  focal: NormalizedPoint,
): NormalizedRect {
  let w: number;
  let h: number;
  if (imageAspect > targetAspect) {
    h = 1;
    w = targetAspect / imageAspect;
  } else {
    w = 1;
    h = imageAspect / targetAspect;
  }
  w = Math.min(w, 1);
  h = Math.min(h, 1);
  let x = focal.x - w / 2;
  let y = focal.y - h / 2;
  x = Math.max(0, Math.min(1 - w, x));
  y = Math.max(0, Math.min(1 - h, y));
  return { x, y, w, h };
}

export function imageAspectFromNatural(width: number, height: number): number {
  if (height <= 0) return 1;
  return width / height;
}
