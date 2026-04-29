import { z } from "zod";
import {
  contentTypeSchema,
  copyVariantSchema,
  editingAssetSchema,
  editingProjectStatusSchema,
  editorialCopySchema,
  editorialProjectSettingsSchema,
  platformTypeSchema,
  recordUnknownSchema,
} from "@/features/editing-studio/validators/editing-studio-schemas";
import { workflowCommentEntrySchema } from "@/features/editing-studio/validators/workflow-schemas";

export const editingPublishPlanSchema = z.object({
  targetPlatforms: z.array(platformTypeSchema),
  scheduledAt: z.string().optional(),
  publishedAt: z.string().optional(),
  archivedAt: z.string().optional(),
});

/** Optional body for `POST .../export/json` — subset filters for the handoff payload. */
export const editingProjectExportRequestBodySchema = z
  .object({
    assetIds: z.array(z.string().min(1)).optional(),
    platforms: z.array(platformTypeSchema).optional(),
  })
  .strict();

export const editingProjectExportMetadataSchema = z.object({
  title: z.string().min(1),
  publicHeadline: z.string().optional(),
  summary: z.string().optional(),
  bodyNotes: z.string().optional(),
  editorialCopy: editorialCopySchema.optional(),
  editorialSettings: editorialProjectSettingsSchema.optional(),
  sourceUrl: z.string().optional(),
  thumbnailRel: z.string().optional(),
  description: z.string().optional(),
  workflowComments: z.array(workflowCommentEntrySchema).optional(),
  integrationMeta: recordUnknownSchema.optional(),
});

/**
 * Validates the structured JSON handoff format (`EditingProjectExport`).
 */
export const editingProjectExportPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().min(1),
  projectId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  brand: z.string().optional(),
  contentType: contentTypeSchema,
  status: editingProjectStatusSchema,
  selectedVariantByPlatform: z.record(z.string(), copyVariantSchema.nullable()),
  assets: z.array(editingAssetSchema),
  publishPlan: editingPublishPlanSchema,
  metadata: editingProjectExportMetadataSchema,
});

export type EditingProjectExportPayloadParsed = z.infer<typeof editingProjectExportPayloadSchema>;

export function parseEditingProjectExportPayload(
  raw: unknown,
): { ok: true; data: EditingProjectExportPayloadParsed } | { ok: false; error: string } {
  const r = editingProjectExportPayloadSchema.safeParse(raw);
  if (!r.success) {
    return {
      ok: false,
      error: r.error.issues.map((i) => `${i.path.map(String).join(".") || "root"}: ${i.message}`).join("; "),
    };
  }
  return { ok: true, data: r.data };
}
