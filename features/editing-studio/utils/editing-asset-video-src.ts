import type { EditingAsset } from "@/features/editing-studio/types/domain";
import { editingStudioThumbnailSrc } from "@/features/editing-studio/utils/project-thumbnail";

export function editingAssetVideoSrc(asset: EditingAsset): string | null {
  const r = asset.relPath?.trim() || asset.url?.trim();
  if (!r) return null;
  return editingStudioThumbnailSrc(r);
}
