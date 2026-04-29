import { z } from "zod";
import {
  workflowCommentEntrySchema,
} from "@/features/editing-studio/validators/workflow-schemas";

/** Loose JSON object for integration / extension fields. */
export const recordUnknownSchema = z.record(z.string(), z.unknown());

export const editingProjectStatusSchema = z.enum([
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "published",
  "archived",
]);

export const platformTypeSchema = z.enum([
  "facebook",
  "x",
  "instagram",
  "instagram_story",
  "linkedin",
  "tiktok",
  "youtube_shorts",
  "whatsapp",
  "telegram",
]);

export const contentTypeSchema = z.enum([
  "link_post",
  "image_post",
  "video_post",
  "story_post",
  "article_promo",
  "shorts_promo",
]);

export const utmPolicySchema = z.enum(["preserve", "strip_all", "append_brand_utms"]);

export const affiliatePolicySchema = z.enum(["none", "append_tag", "disclosure_only"]);

function isValidIanaTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const editorialProjectSettingsSchema = z
  .object({
    campaign: z.string().max(200).optional(),
    timezone: z
      .string()
      .max(80)
      .optional()
      .refine((s) => !s?.trim() || isValidIanaTimeZone(s.trim()), "Use a valid IANA time zone (e.g. Europe/London)"),
    utmSource: z.string().max(200).optional(),
    utmMedium: z.string().max(200).optional(),
    utmCampaign: z.string().max(200).optional(),
    utmContent: z.string().max(200).optional(),
    utmTerm: z.string().max(200).optional(),
    utmPolicy: utmPolicySchema.optional(),
    signOffPreset: z.string().max(2000).optional(),
    disclaimerPreset: z.string().max(8000).optional(),
    affiliateNetwork: z.string().max(120).optional(),
    affiliateTag: z.string().max(200).optional(),
    affiliatePolicy: affiliatePolicySchema.optional(),
    locale: z
      .string()
      .max(32)
      .optional()
      .refine((s) => {
        const t = s?.trim();
        if (!t) return true;
        try {
          void new Intl.Locale(t);
          return true;
        } catch {
          return false;
        }
      }, "Use a valid BCP 47 locale (e.g. en-GB)"),
    author: z.string().max(200).optional(),
    editor: z.string().max(200).optional(),
    approver: z.string().max(200).optional(),
    permissionsSummary: z.string().max(4000).optional(),
  });

export const editingAssetKindSchema = z.enum(["image", "video", "link", "file", "other"]);

export const editingAssetSchema = z.object({
  id: z.string().min(1),
  kind: editingAssetKindSchema,
  label: z.string().optional(),
  url: z.string().optional(),
  relPath: z.string().optional(),
  mimeType: z.string().optional(),
  byteSize: z.number().int().nonnegative().optional(),
  meta: recordUnknownSchema.optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const editorialCopySchema = z
  .object({
    subheading: z.string().max(500).optional(),
    socialCaption: z.string().max(20_000).optional(),
    shortCaption: z.string().max(500).optional(),
    tone: z.string().max(500).optional(),
    cta: z.string().max(500).optional(),
    hashtags: z.string().max(4000).optional(),
    signOff: z.string().max(500).optional(),
    pinnedComment: z.string().max(4000).optional(),
    altText: z.string().max(4000).optional(),
    tagsCategories: z.string().max(4000).optional(),
    canonicalUrl: z.string().max(2000).optional(),
    platformNotes: z.string().max(20_000).optional(),
  })
  .superRefine((data, ctx) => {
    const raw = data.canonicalUrl?.trim();
    if (!raw) return;
    try {
      const u = new URL(raw);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Canonical URL must use http or https",
          path: ["canonicalUrl"],
        });
      }
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid canonical URL", path: ["canonicalUrl"] });
    }
  });

export const copyVariantSourceSchema = z.enum(["human", "ai", "mixed"]);

export const copyVariantSchema = z.object({
  id: z.string().min(1),
  platform: platformTypeSchema,
  label: z.string().max(200).optional(),
  locale: z.string().optional(),
  headline: z.string().max(2000).optional(),
  subheadline: z.string().max(2000).optional(),
  caption: z.string().max(20_000).optional(),
  body: z.string().max(20_000).optional(),
  cta: z.string().max(500).optional(),
  linkUrl: z.string().max(2000).optional(),
  hashtags: z.array(z.string()).optional(),
  signOff: z.string().max(500).optional(),
  tone: z.string().max(200).optional(),
  approved: z.boolean().optional(),
  sourceHumanOrAi: copyVariantSourceSchema.optional(),
  notes: z.string().optional(),
  meta: recordUnknownSchema.optional(),
  revision: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const editingProjectSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  publicHeadline: z.string().optional(),
  summary: z.string().optional(),
  bodyNotes: z.string().optional(),
  editorialCopy: editorialCopySchema.optional(),
  sourceUrl: z.string().optional(),
  brand: z.string().optional(),
  thumbnailRel: z.string().optional(),
  description: z.string().optional(),
  status: editingProjectStatusSchema,
  contentType: contentTypeSchema,
  platforms: z.array(platformTypeSchema),
  assets: z.array(editingAssetSchema),
  copyVariants: z.array(copyVariantSchema),
  exportVariantPick: z.record(z.string(), z.string()).optional(),
  revision: z.number().int().nonnegative(),
  scheduledAt: z.string().optional(),
  publishedAt: z.string().optional(),
  archivedAt: z.string().optional(),
  editorialSettings: editorialProjectSettingsSchema.optional(),
  integrationMeta: recordUnknownSchema.optional(),
  workflowComments: z.array(workflowCommentEntrySchema).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const editingProjectExportFormatSchema = z.enum(["json", "markdown", "zip_placeholder"]);

/** Persisted export audit row (not the structured JSON payload). */
export const editingExportRunSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  format: editingProjectExportFormatSchema,
  revision: z.number().int().nonnegative(),
  relPath: z.string().optional(),
  payload: recordUnknownSchema.optional(),
  source: z.string().optional(),
  meta: recordUnknownSchema.optional(),
  createdAt: z.string().min(1),
});

export const editingStudioStoreV1Schema = z.object({
  version: z.literal(1),
  projects: z.record(z.string(), editingProjectSchema),
  exports: z.record(z.string(), editingExportRunSchema),
});

/** Create payload (server assigns id, timestamps, revision baseline). */
export const editingProjectCreateSchema = z.object({
  title: z.string().min(1),
  publicHeadline: z.string().optional(),
  summary: z.string().optional(),
  bodyNotes: z.string().optional(),
  editorialCopy: editorialCopySchema.optional(),
  sourceUrl: z.string().optional(),
  brand: z.string().optional(),
  thumbnailRel: z.string().optional(),
  description: z.string().optional(),
  status: editingProjectStatusSchema.optional(),
  contentType: contentTypeSchema.optional(),
  platforms: z.array(platformTypeSchema).optional(),
  assets: z.array(editingAssetSchema).optional(),
  copyVariants: z.array(copyVariantSchema).optional(),
  exportVariantPick: z.record(z.string(), z.string()).optional(),
  editorialSettings: editorialProjectSettingsSchema.optional(),
  integrationMeta: recordUnknownSchema.optional(),
});

/** Patch update — any project field optional; nested editorial settings merge on the server. Workflow comments are server-only. */
export const editingProjectPatchSchema = editingProjectSchema
  .partial()
  .extend({
    editorialSettings: editorialProjectSettingsSchema.partial().optional(),
  })
  .omit({ workflowComments: true });

export type EditingProjectCreateInput = z.infer<typeof editingProjectCreateSchema>;
export type EditingProjectPatchInput = z.infer<typeof editingProjectPatchSchema>;

export const editingRevisionActorSchema = z.object({
  userId: z.string().optional(),
  displayName: z.string().optional(),
  email: z.string().optional(),
  source: z.enum(["api", "rollback", "create"]).optional(),
});

export const editingProjectRevisionKindSchema = z.enum(["create", "save", "rollback"]);

export const editingProjectRevisionSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  kind: editingProjectRevisionKindSchema,
  projectRevisionAfter: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  changedBy: editingRevisionActorSchema,
  fieldsChanged: z.array(z.string()),
  note: z.string().max(500).optional(),
  snapshot: editingProjectSchema,
});

export const editingStudioStoreV2Schema = z.object({
  version: z.literal(2),
  projects: z.record(z.string(), editingProjectSchema),
  exports: z.record(z.string(), editingExportRunSchema),
  revisions: z.record(z.string(), editingProjectRevisionSchema),
  revisionIdsByProject: z.record(z.string(), z.array(z.string())),
});

/** PUT body: project patch + optional save note (not persisted on the project row). */
export const editingProjectPutBodySchema = editingProjectPatchSchema.extend({
  revisionNote: z.string().max(500).optional(),
});

export const editingProjectRollbackBodySchema = z.object({
  revisionId: z.string().min(1),
  note: z.string().max(500).optional(),
});

/** Manual create — POST /api/editing-studio/projects/manual */
export const manualProjectCreateSchema = z
  .object({
    title: z.string().min(1, "Internal title is required").max(200),
    publicHeadline: z.string().min(1, "Public headline is required").max(500),
    brand: z.string().min(1, "Brand is required").max(120),
    contentType: contentTypeSchema,
    summary: z.string().min(1, "Summary is required").max(8000),
    bodyNotes: z.string().min(1, "Body / notes are required").max(500_000),
    sourceUrl: z.string().max(2000).optional(),
    platforms: z.array(platformTypeSchema).min(1, "Select at least one platform"),
  })
  .superRefine((data, ctx) => {
    const raw = data.sourceUrl?.trim();
    if (!raw) return;
    try {
      const u = new URL(raw);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Source URL must use http or https", path: ["sourceUrl"] });
      }
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid source URL", path: ["sourceUrl"] });
    }
  });

export type ManualProjectCreateInput = z.infer<typeof manualProjectCreateSchema>;

/** POST /api/editing/import/url */
export const importUrlRequestSchema = z.object({
  url: z
    .string()
    .min(1)
    .refine((s) => {
      try {
        const u = new URL(s);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    }, "Enter a valid http(s) URL"),
  brand: z.string().optional(),
  contentType: contentTypeSchema.optional(),
});
