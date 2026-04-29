import type { Metadata } from "next";
import { Suspense } from "react";
import { BRAND_SUITE } from "@/app/lib/brand";
import { LiveControlNewClient } from "@/features/live-control/components/LiveControlNewClient";

export const metadata: Metadata = {
  title: `New live session | Live Control | ${BRAND_SUITE}`,
};

function NewSessionFallback() {
  return (
    <div className="rounded-xl border p-8 text-sm text-[color:var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
      Loading…
    </div>
  );
}

export default function LiveControlNewPage() {
  return (
    <Suspense fallback={<NewSessionFallback />}>
      <LiveControlNewClient />
    </Suspense>
  );
}
