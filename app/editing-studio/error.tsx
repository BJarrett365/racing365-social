"use client";

import { EditingStudioErrorDisplay } from "@/features/editing-studio/components/EditingStudioErrorDisplay";

export default function EditingStudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <EditingStudioErrorDisplay message={error.message || "Unexpected error"} onRetry={reset} />
    </div>
  );
}
