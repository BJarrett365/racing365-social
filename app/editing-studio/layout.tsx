import type { Metadata } from "next";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata: Metadata = {
  title: `Editing Studio | ${BRAND_SUITE}`,
  description: "Editorial workflow for social and promo post editing.",
};

/**
 * Editing Studio — isolated route group. Does not alter Templates, Video Builder, Podcast, or Feed flows.
 */
export default function EditingStudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
