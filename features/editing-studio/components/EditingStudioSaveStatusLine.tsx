"use client";

import type { SaveStatus } from "@/features/editing-studio/editor/editor-types";

type Props = {
  dirty: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  lastSavedAt: string | null;
};

/**
 * Save / autosave status for the project editor header (aria-live for dynamic updates).
 */
export function EditingStudioSaveStatusLine({ dirty, saveStatus, saveError, lastSavedAt }: Props) {
  if (saveError) {
    return (
      <span className="text-sm text-red-600 dark:text-red-400" role="status" aria-live="assertive">
        Save failed: {saveError}
      </span>
    );
  }
  if (saveStatus === "saving") {
    return (
      <span className="text-sm text-[color:var(--text-secondary)]" role="status" aria-live="polite">
        Saving…
      </span>
    );
  }
  if (saveStatus === "saved" && !dirty) {
    return (
      <span className="text-sm text-[color:var(--text-muted)]" role="status" aria-live="polite">
        Saved{lastSavedAt ? ` · ${new Date(lastSavedAt).toLocaleTimeString()}` : ""}
      </span>
    );
  }
  if (dirty) {
    return (
      <span className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2" role="status" aria-live="polite">
        <span className="text-sm text-amber-700 dark:text-amber-400">Unsaved changes</span>
        <span className="text-xs text-[color:var(--text-muted)]">Autosaves when you pause typing</span>
      </span>
    );
  }
  return (
    <span className="text-sm text-[color:var(--text-muted)]" role="status">
      {lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleString()}` : "Up to date"}
    </span>
  );
}
