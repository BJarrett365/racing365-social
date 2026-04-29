import { EDITING_PROJECT_PATCH_KEYS } from "@/features/editing-studio/editor/editing-project-patch-keys";
import type { EditingProject } from "@/features/editing-studio/types/domain";

/** Includes workflow comments so revision history reflects reviewer notes. */
const REVISION_DIFF_KEYS: readonly (keyof EditingProject)[] = [
  ...EDITING_PROJECT_PATCH_KEYS,
  "workflowComments",
];

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizedEditorialSettings(p: EditingProject): Record<string, unknown> {
  return { ...(p.editorialSettings ?? {}) } as Record<string, unknown>;
}

/**
 * Lists top-level project keys that differ between two snapshots (for revision summaries).
 */
export function listChangedEditingProjectFields(before: EditingProject, after: EditingProject): string[] {
  const keys: string[] = [];
  for (const key of REVISION_DIFF_KEYS) {
    if (key === "editorialSettings") {
      if (!sameJson(normalizedEditorialSettings(after), normalizedEditorialSettings(before))) {
        keys.push("editorialSettings");
      }
    } else if (!sameJson(after[key], before[key])) {
      keys.push(key);
    }
  }
  return keys;
}
