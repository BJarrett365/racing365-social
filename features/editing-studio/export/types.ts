import type {
  ContentType,
  CopyVariant,
  EditingAsset,
  EditingProjectStatus,
  EditorialCopy,
  EditorialProjectSettings,
  PlatformType,
} from "@/features/editing-studio/types/domain";
import type { WorkflowCommentEntry } from "@/features/editing-studio/types/workflow";

/**
 * Scheduling / go-live fields for downstream publishers (mirrors project where relevant).
 */
export type EditingPublishPlan = {
  targetPlatforms: PlatformType[];
  scheduledAt?: string;
  publishedAt?: string;
  archivedAt?: string;
};

/**
 * Editorial and integration metadata (everything not covered by top-level export fields).
 */
export type EditingProjectExportMetadata = {
  title: string;
  publicHeadline?: string;
  summary?: string;
  bodyNotes?: string;
  editorialCopy?: EditorialCopy;
  editorialSettings?: EditorialProjectSettings;
  sourceUrl?: string;
  thumbnailRel?: string;
  description?: string;
  workflowComments?: WorkflowCommentEntry[];
  integrationMeta?: Record<string, unknown>;
};

/**
 * Structured JSON export for CMS / schedulers / handoff tools. Versioned for stable integrations.
 */
export type EditingProjectExport = {
  schemaVersion: 1;
  exportedAt: string;
  projectId: string;
  revision: number;
  brand?: string;
  contentType: ContentType;
  status: EditingProjectStatus;
  /** Resolved variant per target platform (null if none). */
  selectedVariantByPlatform: Partial<Record<PlatformType, CopyVariant | null>>;
  assets: EditingAsset[];
  publishPlan: EditingPublishPlan;
  metadata: EditingProjectExportMetadata;
};

export type BuildEditingProjectExportOptions = {
  /**
   * When provided, only these asset ids are included. Pass `[]` for no assets.
   * When omitted, all project assets are included.
   */
  assetIds?: string[];
  /**
   * When provided, only these platforms appear in `selectedVariantByPlatform`. Pass `[]` for none.
   * When omitted, all project platforms are included.
   */
  platforms?: PlatformType[];
};
