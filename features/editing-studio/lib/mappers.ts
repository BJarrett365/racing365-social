import type { ZodError } from "zod";
import type { EditingExportRun, EditingProject, EditingStudioStoreV1, EditingStudioStoreV2 } from "@/features/editing-studio/types/domain";
import {
  editingExportRunSchema,
  editingProjectSchema,
  editingStudioStoreV1Schema,
  editingStudioStoreV2Schema,
} from "@/features/editing-studio/validators/editing-studio-schemas";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

function formatZodError(err: ZodError): string {
  return err.issues.map((i) => `${i.path.map(String).join(".") || "root"}: ${i.message}`).join("; ");
}

export function parseEditingProject(raw: unknown): ParseResult<EditingProject> {
  const r = editingProjectSchema.safeParse(raw);
  if (!r.success) return { ok: false, error: formatZodError(r.error) };
  return { ok: true, data: r.data };
}

export function parseEditingExportRun(raw: unknown): ParseResult<EditingExportRun> {
  const r = editingExportRunSchema.safeParse(raw);
  if (!r.success) return { ok: false, error: formatZodError(r.error) };
  return { ok: true, data: r.data };
}

export function migrateEditingStudioStoreV1ToV2(v1: EditingStudioStoreV1): EditingStudioStoreV2 {
  return {
    version: 2,
    projects: v1.projects,
    exports: v1.exports,
    revisions: {},
    revisionIdsByProject: {},
  };
}

/** @deprecated Use parseEditingStudioStoreJson */
export function parseEditingStudioStoreV1(raw: unknown): ParseResult<EditingStudioStoreV1> {
  const r = editingStudioStoreV1Schema.safeParse(raw);
  if (!r.success) return { ok: false, error: formatZodError(r.error) };
  return { ok: true, data: r.data };
}

export function parseEditingStudioStoreJson(text: string): ParseResult<EditingStudioStoreV2> {
  try {
    const raw = JSON.parse(text) as unknown;
    if (typeof raw !== "object" || raw === null || !("version" in raw)) {
      return { ok: false, error: "Invalid store root" };
    }
    const version = (raw as { version: unknown }).version;
    if (version === 1) {
      const r = editingStudioStoreV1Schema.safeParse(raw);
      if (!r.success) return { ok: false, error: formatZodError(r.error) };
      return { ok: true, data: migrateEditingStudioStoreV1ToV2(r.data) };
    }
    if (version === 2) {
      const r = editingStudioStoreV2Schema.safeParse(raw);
      if (!r.success) return { ok: false, error: formatZodError(r.error) };
      return { ok: true, data: r.data };
    }
    return { ok: false, error: `Unsupported store version: ${String(version)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

/** Stable stringify for writing to disk. */
export function serializeEditingStudioStore(store: EditingStudioStoreV2): string {
  return `${JSON.stringify(store, null, 2)}\n`;
}

export function assertEditingProject(project: EditingProject): EditingProject {
  return editingProjectSchema.parse(project);
}
