import type { ContentType, PlatformType } from "@/features/editing-studio/types/domain";
import { resolveBrandEditorialRules } from "@/features/editing-studio/brands";

export type BrandEditorialDefaults = {
  contentType?: ContentType;
  platforms?: PlatformType[];
};

/**
 * Defaults when a brand is recognised (content type + platforms).
 * Only applied when the user has not yet chosen platforms / content type, or via “Apply brand defaults”.
 */
export function getEditorialDefaultsForBrand(brandRaw: string): BrandEditorialDefaults {
  const resolved = resolveBrandEditorialRules(brandRaw);
  if (!resolved) return {};
  const { rules } = resolved;
  const out: BrandEditorialDefaults = {};
  if (rules.defaultContentType) out.contentType = rules.defaultContentType;
  if (rules.defaultPlatforms?.length) out.platforms = [...rules.defaultPlatforms];
  return out;
}
