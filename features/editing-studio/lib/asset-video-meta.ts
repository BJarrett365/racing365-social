import type { EditingAsset } from "@/features/editing-studio/types/domain";
import { defaultVideoEditSettings } from "@/features/editing-studio/lib/video-edit-defaults";
import type { VideoEditSettingsV1, VideoAssetMetaBag } from "@/features/editing-studio/types/video-edit";
import { VIDEO_EDIT_META_KEY } from "@/features/editing-studio/types/video-edit";

export function getVideoAssetMetaBag(asset: EditingAsset): VideoAssetMetaBag {
  return (asset.meta ?? {}) as VideoAssetMetaBag;
}

export function getVideoEditSettings(asset: EditingAsset): VideoEditSettingsV1 {
  const raw = getVideoAssetMetaBag(asset)[VIDEO_EDIT_META_KEY];
  if (raw && typeof raw === "object" && (raw as VideoEditSettingsV1).version === 1) {
    return raw as VideoEditSettingsV1;
  }
  return defaultVideoEditSettings();
}

export function mergeVideoEditSettings(
  asset: EditingAsset,
  patch: Partial<VideoEditSettingsV1>,
  nowIso: string,
): EditingAsset {
  const prev = getVideoEditSettings(asset);
  const next: VideoEditSettingsV1 = { ...prev, ...patch, version: 1 };
  return {
    ...asset,
    updatedAt: nowIso,
    meta: {
      ...getVideoAssetMetaBag(asset),
      [VIDEO_EDIT_META_KEY]: next,
    },
  };
}
