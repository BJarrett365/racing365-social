import type { BrandEditorialRules } from "@/features/editing-studio/brands/types";
import type { EditorialProjectSettings, UtmPolicy } from "@/features/editing-studio/types/domain";

function linkHandlingToUtmPolicy(linkHandling: BrandEditorialRules["linkHandling"]): UtmPolicy | undefined {
  if (!linkHandling) return undefined;
  if (linkHandling === "strip_utm") return "strip_all";
  return undefined;
}

/**
 * Fill empty editorial settings from resolved brand rules (sign-off, UTM policy hints).
 */
export function buildEditorialSettingsDefaultsFromBrandRules(
  rules: BrandEditorialRules,
  current: EditorialProjectSettings | undefined,
): Partial<EditorialProjectSettings> {
  const cur = current ?? {};
  const patch: Partial<EditorialProjectSettings> = {};

  if (!cur.signOffPreset?.trim() && rules.defaultSignOff) {
    patch.signOffPreset = rules.defaultSignOff;
  }

  if (cur.utmPolicy === undefined) {
    const fromLink = linkHandlingToUtmPolicy(rules.linkHandling);
    if (fromLink) patch.utmPolicy = fromLink;
  }

  return patch;
}
