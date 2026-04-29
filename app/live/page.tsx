import type { Metadata } from "next";
import { Suspense } from "react";
import { BRAND_SUITE } from "@/app/lib/brand";
import { LiveControlDashboard } from "@/features/live-control/components/LiveControlDashboard";

export const metadata: Metadata = {
  title: `Live Control | ${BRAND_SUITE}`,
};

function LiveFallback() {
  return (
    <div className="rounded-xl border p-8 text-sm text-[color:var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
      Loading Live Control…
    </div>
  );
}

export default function LiveControlPage() {
  return (
    <Suspense fallback={<LiveFallback />}>
      <LiveControlDashboard />
    </Suspense>
  );
}
