export type {
  BrandEditorialRules,
  BrandRuleId,
  BrandEmojiGuidance,
  BrandLinkHandlingRule,
  BrandImageOverlayStyle,
  ResolvedBrandRules,
} from "./types";

export { BRAND_EDITORIAL_RULES } from "./definitions";
export {
  resolveBrandEditorialRules,
  listBrandEditorialRules,
  getBrandEditorialRulesById,
} from "./resolve-brand";
export {
  applyBrandDefaultsToEditorialCopy,
  buildEditorialCopyDefaultsFromRules,
  buildProjectBrandDefaultsPatch,
  type EditorialCopyPatch,
  type ProjectBrandDefaultsPatch,
} from "./apply-defaults";
export {
  computeBrandComplianceIssues,
  type BrandComplianceIssue,
  type BrandComplianceSeverity,
} from "./compliance";
export { getEffectiveCaptionLimitForPlatform, getTightestCaptionLimitForPlatforms } from "./limits";
export { getBrandPresentationHints, type BrandPresentationHints } from "./presentation";
