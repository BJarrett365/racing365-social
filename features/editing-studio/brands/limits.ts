import { COPY_LIMITS } from "@/features/editing-studio/copy/copy-limits";
import type { PlatformType } from "@/features/editing-studio/types/domain";
import { resolveBrandEditorialRules } from "./resolve-brand";

/**
 * Effective max caption length for warnings / character hints: brand override, else global COPY_LIMITS.
 */
export function getEffectiveCaptionLimitForPlatform(
  brandRaw: string | undefined | null,
  platform: PlatformType
): number {
  const resolved = resolveBrandEditorialRules(brandRaw);
  const fromBrand = resolved?.rules.maxCaptionLengthByPlatform?.[platform];
  if (fromBrand != null) return fromBrand;
  switch (platform) {
    case "x":
      return COPY_LIMITS.xPost;
    case "instagram":
    case "instagram_story":
      return COPY_LIMITS.instagramCaption;
    case "linkedin":
      return COPY_LIMITS.linkedinPost;
    default:
      return COPY_LIMITS.instagramCaption;
  }
}

/**
 * Smallest applicable limit across selected social platforms (for a single “primary” caption field).
 */
export function getTightestCaptionLimitForPlatforms(
  brandRaw: string | undefined | null,
  platforms: PlatformType[]
): number | undefined {
  const candidates: number[] = [];
  if (platforms.includes("x")) candidates.push(getEffectiveCaptionLimitForPlatform(brandRaw, "x"));
  if (platforms.includes("instagram") || platforms.includes("instagram_story")) {
    candidates.push(getEffectiveCaptionLimitForPlatform(brandRaw, "instagram"));
  }
  if (platforms.includes("linkedin")) candidates.push(getEffectiveCaptionLimitForPlatform(brandRaw, "linkedin"));
  if (candidates.length === 0) return undefined;
  return Math.min(...candidates);
}
