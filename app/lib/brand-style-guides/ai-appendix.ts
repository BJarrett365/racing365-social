import { combinedAiAppendix, getBrandStyleGuideByGuidelineSlug } from "@/app/lib/brand-style-guides/catalog";
import type { BrandGuidelineSlug } from "@/app/lib/brand-guidelines-store";

export function brandStyleAppendixForSlug(
  slug: BrandGuidelineSlug,
  modes: Array<"editorial" | "video" | "social">,
): string {
  const entry = getBrandStyleGuideByGuidelineSlug(slug);
  if (!entry) return "";
  return combinedAiAppendix(entry, modes);
}
