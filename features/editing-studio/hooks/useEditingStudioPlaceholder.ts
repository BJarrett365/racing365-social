"use client";

import { useMemo } from "react";

/** Reserved for future client-side project state; currently a no-op readiness flag. */
export function useEditingStudioPlaceholder() {
  return useMemo(() => ({ ready: true as const }), []);
}
