import type { BrandImageOverlayStyle, BrandLinkHandlingRule } from "./types";
import { resolveBrandEditorialRules } from "./resolve-brand";

/** Non-copy hints for design / export (overlay, link policy). */
export type BrandPresentationHints = {
  displayName: string;
  imageOverlayStyle?: BrandImageOverlayStyle;
  linkHandling?: BrandLinkHandlingRule;
};

export function getBrandPresentationHints(brandRaw: string | undefined | null): BrandPresentationHints | null {
  const r = resolveBrandEditorialRules(brandRaw);
  if (!r) return null;
  const { rules } = r;
  return {
    displayName: rules.displayName,
    imageOverlayStyle: rules.imageOverlayStyle,
    linkHandling: rules.linkHandling,
  };
}
