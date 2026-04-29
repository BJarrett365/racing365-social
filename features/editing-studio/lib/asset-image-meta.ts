import { defaultImageEditSettings } from "@/features/editing-studio/lib/image-edit-defaults";
import type { EditingAsset } from "@/features/editing-studio/types/domain";
import type { ImageEditSettingsV1, ImageAssetMetaBag } from "@/features/editing-studio/types/image-edit";
import { IMAGE_EDIT_META_KEY } from "@/features/editing-studio/types/image-edit";

export function getAssetMetaBag(asset: EditingAsset): ImageAssetMetaBag {
  return (asset.meta ?? {}) as ImageAssetMetaBag;
}

export function getImageEditSettings(asset: EditingAsset): ImageEditSettingsV1 {
  const raw = getAssetMetaBag(asset)[IMAGE_EDIT_META_KEY];
  if (raw && typeof raw === "object" && (raw as ImageEditSettingsV1).version === 1) {
    return raw as ImageEditSettingsV1;
  }
  return defaultImageEditSettings();
}

export function mergeImageEditSettings(
  asset: EditingAsset,
  patch: Partial<ImageEditSettingsV1>,
  nowIso: string,
): EditingAsset {
  const prev = getImageEditSettings(asset);
  const next: ImageEditSettingsV1 = { ...prev, ...patch, version: 1 };
  return {
    ...asset,
    updatedAt: nowIso,
    meta: {
      ...getAssetMetaBag(asset),
      [IMAGE_EDIT_META_KEY]: next,
    },
  };
}
