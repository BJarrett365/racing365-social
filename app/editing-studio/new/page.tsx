import type { Metadata } from "next";
import { Suspense } from "react";
import { BRAND_SUITE } from "@/app/lib/brand";
import { EditingStudioNewProjectClient } from "@/features/editing-studio/components/EditingStudioNewProjectClient";

export const metadata: Metadata = {
  title: `New project | Editing Studio | ${BRAND_SUITE}`,
};

function NewProjectFallback() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="h-40 animate-pulse rounded-xl border bg-[var(--surface-muted)]" style={{ borderColor: "var(--border)" }} />
    </div>
  );
}

export default function EditingStudioNewPage() {
  return (
    <Suspense fallback={<NewProjectFallback />}>
      <EditingStudioNewProjectClient />
    </Suspense>
  );
}
