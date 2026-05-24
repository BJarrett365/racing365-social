import { Suspense } from "react";
import { EditorialCalendarClient } from "@/features/editing-studio/components/calendar/EditorialCalendarClient";

export default function EditingStudioCalendarPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[color:var(--text-muted)]">Loading calendar…</div>}>
      <EditorialCalendarClient />
    </Suspense>
  );
}
