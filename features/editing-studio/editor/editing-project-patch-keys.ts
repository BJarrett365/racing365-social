import type { EditingProject } from "@/features/editing-studio/types/domain";

/** Top-level project fields compared for patches, diffs, and revision summaries. */
export const EDITING_PROJECT_PATCH_KEYS = [
  "title",
  "publicHeadline",
  "summary",
  "bodyNotes",
  "editorialCopy",
  "sourceUrl",
  "brand",
  "thumbnailRel",
  "description",
  "status",
  "contentType",
  "platforms",
  "assets",
  "copyVariants",
  "exportVariantPick",
  "scheduledAt",
  "publishedAt",
  "archivedAt",
  "editorialSettings",
  "integrationMeta",
] as const satisfies readonly (keyof EditingProject)[];

export type EditingProjectPatchKey = (typeof EDITING_PROJECT_PATCH_KEYS)[number];
