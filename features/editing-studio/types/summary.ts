import type { ContentType, EditingProjectStatus } from "@/features/editing-studio/types/domain";
import type { EditingStudioProjectId } from "@/features/editing-studio/types/ids";

export type EditingStudioProjectSummary = {
  id: EditingStudioProjectId;
  title: string;
  status: EditingProjectStatus;
  contentType: ContentType;
  updatedAt: string;
};
