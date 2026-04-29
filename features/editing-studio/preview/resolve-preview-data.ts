import { getImageEditSettings } from "@/features/editing-studio/lib/asset-image-meta";
import { getVideoEditSettings } from "@/features/editing-studio/lib/asset-video-meta";
import { variantCaption } from "@/features/editing-studio/variants/variant-helpers";
import type { CopyVariant, EditingAsset, EditingProject, PlatformType } from "@/features/editing-studio/types/domain";
import { editingStudioThumbnailSrc } from "@/features/editing-studio/utils/project-thumbnail";
import { editingAssetImageSrc } from "@/features/editing-studio/utils/editing-asset-src";
import { editingAssetVideoSrc } from "@/features/editing-studio/utils/editing-asset-video-src";
import { getEditingProjectDisplayTitle } from "@/features/editing-studio/utils/project-display";

const PREVIEW_EMPTY_BODY_HINT =
  "No copy for this preview yet — add text in the Copy tab or a variant on the Variants tab.";

export type ResolvedPreviewCopy = {
  headline: string;
  body: string;
  cta: string;
  signOff: string;
  hashtags: string;
  linkUrl?: string;
  source: "variant" | "editorial";
};

export type PreviewMedia =
  | { kind: "none" }
  | { kind: "image"; src: string; logoBadge: boolean }
  | { kind: "video"; src: string; coverSec: number; logoBug: boolean };

function parseHashtagsEditorial(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  const parts = raw
    .split(/[\s,\n]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
  return parts.join(" ");
}

/** Selected copy variant for a platform (export pick, else first variant for that platform). */
export function getCopyVariantForPlatform(project: EditingProject, platform: PlatformType): CopyVariant | null {
  const pickId = project.exportVariantPick?.[platform];
  if (pickId) {
    const v = project.copyVariants.find((c) => c.id === pickId);
    if (v) return v;
  }
  return project.copyVariants.find((c) => c.platform === platform) ?? null;
}

export function resolvePreviewCopy(project: EditingProject, platform: PlatformType): ResolvedPreviewCopy {
  const ec = project.editorialCopy ?? {};
  const v = getCopyVariantForPlatform(project, platform);

  if (v) {
    const cap = variantCaption(v);
    const bodyRaw = cap || ec.socialCaption?.trim() || ec.shortCaption?.trim() || project.summary?.trim() || "";
    const body = bodyRaw.trim() ? bodyRaw : PREVIEW_EMPTY_BODY_HINT;
    const hashtagsArr = v.hashtags?.length
      ? v.hashtags.join(" ")
      : parseHashtagsEditorial(ec.hashtags);
    return {
      headline:
        v.headline?.trim() ||
        project.publicHeadline?.trim() ||
        getEditingProjectDisplayTitle(project),
      body,
      cta: v.cta?.trim() || ec.cta?.trim() || "",
      signOff: v.signOff?.trim() || ec.signOff?.trim() || "",
      hashtags: hashtagsArr,
      linkUrl: v.linkUrl?.trim() || ec.canonicalUrl?.trim() || project.sourceUrl?.trim(),
      source: "variant",
    };
  }

  const bodyRaw =
    ec.socialCaption?.trim() ||
    ec.shortCaption?.trim() ||
    project.summary?.trim() ||
    project.description?.trim() ||
    "";
  const body = bodyRaw.trim() ? bodyRaw : PREVIEW_EMPTY_BODY_HINT;
  return {
    headline: project.publicHeadline?.trim() || getEditingProjectDisplayTitle(project),
    body,
    cta: ec.cta?.trim() || "",
    signOff: ec.signOff?.trim() || "",
    hashtags: parseHashtagsEditorial(ec.hashtags),
    linkUrl: ec.canonicalUrl?.trim() || project.sourceUrl?.trim(),
    source: "editorial",
  };
}

function assetMatchesRel(asset: EditingAsset, rel: string): boolean {
  const r = asset.relPath?.trim();
  const u = asset.url?.trim();
  return r === rel || u === rel;
}

export function resolvePreviewMedia(project: EditingProject): PreviewMedia {
  const thumbRel = project.thumbnailRel?.trim();
  if (thumbRel) {
    const asset = project.assets.find((a) => assetMatchesRel(a, thumbRel));
    if (asset?.kind === "image") {
      const src = editingStudioThumbnailSrc(thumbRel);
      return { kind: "image", src, logoBadge: getImageEditSettings(asset).logoBadge };
    }
    if (asset?.kind === "video") {
      const src = editingAssetVideoSrc(asset);
      if (src) {
        const vs = getVideoEditSettings(asset);
        return { kind: "video", src, coverSec: vs.coverFrameSec, logoBug: vs.logoBug };
      }
    }
    // Thumbnail path set but no matching asset row (e.g. import drift) — still try static image URL.
    if (!/\.(mp4|webm|mov)$/i.test(thumbRel)) {
      return { kind: "image", src: editingStudioThumbnailSrc(thumbRel), logoBadge: false };
    }
  }

  const vid = project.assets.find((a) => a.kind === "video" && (a.relPath?.trim() || a.url?.trim()));
  if (vid) {
    const src = editingAssetVideoSrc(vid);
    if (src) {
      const vs = getVideoEditSettings(vid);
      return { kind: "video", src, coverSec: vs.coverFrameSec, logoBug: vs.logoBug };
    }
  }

  const img = project.assets.find((a) => a.kind === "image" && (a.relPath?.trim() || a.url?.trim()));
  if (img) {
    const src = editingAssetImageSrc(img);
    if (src) {
      return { kind: "image", src, logoBadge: getImageEditSettings(img).logoBadge };
    }
  }

  return { kind: "none" };
}
