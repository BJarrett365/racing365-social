/**
 * Non-destructive image prep settings stored on {@link EditingAsset.meta}. `relPath` / `url` always
 * points at the original upload; these fields only describe how to render / export.
 */
export type CropAspectPresetId = "1:1" | "16:9" | "9:16" | "4:5" | "1.91:1";

/** Normalized rectangle in source image space (0–1). */
export type NormalizedRect = { x: number; y: number; w: number; h: number };

/** Normalized point in source image space (0–1). */
export type NormalizedPoint = { x: number; y: number };

export const IMAGE_EDIT_META_KEY = "imageEdit" as const;

export type ImageEditSettingsV1 = {
  version: 1;
  aspectPreset: CropAspectPresetId;
  /** Visible region of the source image. */
  crop: NormalizedRect;
  /** Attention point for object-position / blur centre. */
  focalPoint: NormalizedPoint;
  blurBackground: boolean;
  /** Letterbox / pillarbox fill behind the crop. */
  extendMode: "none" | "blur" | "color";
  extendColor?: string;
  brightness: number;
  contrast: number;
  gradientOverlay: boolean;
  textBadge: boolean;
  logoBadge: boolean;
  ctaChip: boolean;
  safeZoneOverlay: boolean;
};

export type ImageAssetMetaBag = {
  /** First uploaded relPath before any replace (optional). */
  originalRelPath?: string;
  /** Parsed image edit recipe. */
  imageEdit?: ImageEditSettingsV1;
  fromImport?: boolean;
  [key: string]: unknown;
};
