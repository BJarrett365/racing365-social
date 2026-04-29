/**
 * Editing Studio — public type surface.
 */

export type { EditingStudioProjectId } from "@/features/editing-studio/types/ids";

export type { EditingStudioProjectSummary } from "@/features/editing-studio/types/summary";

export type {
  ContentType,
  CopyVariant,
  EditingAsset,
  EditingAssetKind,
  EditingProject,
  EditingExportRun,
  EditingProjectExportFormat,
  EditingProjectRevision,
  EditingProjectRevisionSummary,
  EditingProjectStatus,
  EditingRevisionActor,
  EditingStudioStoreV1,
  EditingStudioStoreV2,
  PlatformType,
} from "@/features/editing-studio/types/domain";

export type {
  EditingWorkflowRole,
  WorkflowCommentEntry,
  WorkflowCommentKind,
} from "@/features/editing-studio/types/workflow";

export type {
  BuildEditingProjectExportOptions,
  EditingProjectExport,
  EditingProjectExportMetadata,
  EditingPublishPlan,
} from "@/features/editing-studio/export/types";

