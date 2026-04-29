import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";
import type { EditingProject } from "@/features/editing-studio/types/domain";
import type { EditingStudioProjectId, EditingStudioProjectSummary } from "@/features/editing-studio/types";

function toSummary(p: EditingProject): EditingStudioProjectSummary {
  return {
    id: p.id as EditingStudioProjectId,
    title: p.title,
    status: p.status,
    contentType: p.contentType,
    updatedAt: p.updatedAt,
  };
}

/** Server-side facade for pages — delegates to the file repository. */
export async function listEditingStudioProjects(options?: {
  includeArchived?: boolean;
}): Promise<readonly EditingStudioProjectSummary[]> {
  const projects = await getEditingStudioRepository().listProjects(options);
  return projects.map(toSummary);
}

export async function getEditingStudioProjectFull(
  projectId: string,
): Promise<EditingProject | null> {
  return getEditingStudioRepository().getProject(projectId);
}

export async function getEditingStudioProject(
  projectId: string,
): Promise<EditingStudioProjectSummary | null> {
  const p = await getEditingStudioRepository().getProject(projectId);
  return p ? toSummary(p) : null;
}
