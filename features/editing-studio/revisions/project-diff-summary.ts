import { EDITING_PROJECT_PATCH_KEYS } from "@/features/editing-studio/editor/editing-project-patch-keys";
import type { EditingProject } from "@/features/editing-studio/types/domain";

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizedEditorialSettings(p: EditingProject): Record<string, unknown> {
  return { ...(p.editorialSettings ?? {}) } as Record<string, unknown>;
}

function summarizeValue(key: string, value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") {
    const t = value.trim();
    if (t.length > 280) return `${t.slice(0, 277)}…`;
    return t || "—";
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const s = JSON.stringify(value, null, 0);
    if (s.length > 400) return `${s.slice(0, 397)}…`;
    return s;
  } catch {
    return String(value);
  }
}

export type EditingProjectFieldDiffRow = {
  field: string;
  current: string;
  other: string;
};

/**
 * Row-wise diff for compare UI (current project vs a revision snapshot).
 */
export function diffEditingProjectsForCompare(current: EditingProject, other: EditingProject): EditingProjectFieldDiffRow[] {
  const rows: EditingProjectFieldDiffRow[] = [];
  for (const key of EDITING_PROJECT_PATCH_KEYS) {
    const a = key === "editorialSettings" ? normalizedEditorialSettings(current) : current[key];
    const b = key === "editorialSettings" ? normalizedEditorialSettings(other) : other[key];
    if (sameJson(a, b)) continue;
    rows.push({
      field: key,
      current: summarizeValue(key, a),
      other: summarizeValue(key, b),
    });
  }
  return rows;
}
