import type { Metadata } from "next";
import { BRAND_SUITE } from "@/app/lib/brand";
import { PromptsPageClient } from "@/app/prompts/PromptsPageClient";

export const metadata: Metadata = {
  title: `Prompts · ${BRAND_SUITE}`,
  description: "Built-in and custom AI prompt library for the editor and API routes.",
};

export default function PromptsPage() {
  return <PromptsPageClient />;
}
