import { EDITING_PROJECT_PATCH_KEYS } from "@/features/editing-studio/editor/editing-project-patch-keys";
import type { EditingProject } from "@/features/editing-studio/types/domain";
import type { EditingProjectPatchInput } from "@/features/editing-studio/validators/editing-studio-schemas";

const PATCH_KEYS = EDITING_PROJECT_PATCH_KEYS;

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizedEditorialSettings(p: EditingProject): Record<string, unknown> {
  return { ...(p.editorialSettings ?? {}) } as Record<string, unknown>;
}

/**
 * Build a partial update payload from draft vs last-saved baseline (omit id/timestamps/revision).
 */
export function buildEditingProjectPatch(draft: EditingProject, baseline: EditingProject): EditingProjectPatchInput {
  const patch: EditingProjectPatchInput = {};
  for (const key of PATCH_KEYS) {
    if (key === "editorialSettings") {
      const merged = { ...(baseline.editorialSettings ?? {}), ...(draft.editorialSettings ?? {}) };
      if (!sameJson(merged, baseline.editorialSettings ?? {})) {
        patch.editorialSettings = merged;
      }
      continue;
    }
    if (!sameJson(draft[key], baseline[key])) {
      (patch as Record<string, unknown>)[key] = draft[key];
    }
  }
  return patch;
}

export function editingProjectsEqual(a: EditingProject, b: EditingProject): boolean {
  return PATCH_KEYS.every((key) => {
    if (key === "editorialSettings") {
      return sameJson(normalizedEditorialSettings(a), normalizedEditorialSettings(b));
    }
    return sameJson(a[key], b[key]);
  });
}
