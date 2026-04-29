import type { EditorialCopy } from "@/features/editing-studio/types/domain";
import { buildEditorialCopyDefaultsFromRules, resolveBrandEditorialRules } from "@/features/editing-studio/brands";

/**
 * Template copy defaults for a recognised brand (CTA, sign-off, tone, hashtags, pinned outro).
 * Used for “Apply brand defaults” and for editorial hints — does not merge with current fields;
 * use `buildEditorialCopyDefaultsFromRules` with the live draft when filling only empty fields.
 */
export function getCopyDefaultsForBrand(brandRaw: string): Partial<EditorialCopy> {
  const resolved = resolveBrandEditorialRules(brandRaw);
  if (!resolved) return {};
  return buildEditorialCopyDefaultsFromRules(resolved.rules, {});
}
