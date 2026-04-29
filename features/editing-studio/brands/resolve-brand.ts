import { BRAND_EDITORIAL_RULES } from "./definitions";
import type { BrandEditorialRules, ResolvedBrandRules } from "./types";

function normalizeBrandKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Resolve editorial rules from a free-text brand field (e.g. project.brand).
 * Matches aliases case-insensitively after normalizing spaces and separators.
 */
export function resolveBrandEditorialRules(brandRaw: string | undefined | null): ResolvedBrandRules | null {
  if (!brandRaw?.trim()) return null;
  const needle = normalizeBrandKey(brandRaw);
  for (const rules of BRAND_EDITORIAL_RULES) {
    for (const alias of rules.aliases) {
      if (normalizeBrandKey(alias) === needle) {
        return { rules, matchedAlias: alias };
      }
    }
  }
  return null;
}

/** All registered rules (for admin / pickers). */
export function listBrandEditorialRules(): readonly BrandEditorialRules[] {
  return BRAND_EDITORIAL_RULES;
}

/** Lookup by stable id. */
export function getBrandEditorialRulesById(id: BrandEditorialRules["id"]): BrandEditorialRules | undefined {
  return BRAND_EDITORIAL_RULES.find((r) => r.id === id);
}
