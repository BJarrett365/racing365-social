import type { Metadata } from "next";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata: Metadata = {
  title: `Schedule Studio | ${BRAND_SUITE}`,
  description: "Editorial workflow for social and promo post editing.",
};

/**
 * Schedule Studio — isolated route group. Does not alter Templates, Video Builder, Podcast, or Feed flows.
 */
export default function EditingStudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
