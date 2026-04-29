import type { Metadata } from "next";
import { BRAND_SUITE } from "@/app/lib/brand";
import { LiveSessionDetailClient } from "@/features/live-control/components/LiveSessionDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Session ${id} | Live Control | ${BRAND_SUITE}`,
  };
}

export default async function LiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveSessionDetailClient sessionId={id} />;
}
