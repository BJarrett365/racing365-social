import type { Metadata } from "next";
import { BRAND_SUITE } from "@/app/lib/brand";
import { EditingStudioHistoryPageClient } from "@/features/editing-studio/components/EditingStudioHistoryPageClient";
import { EditingStudioInvalidProjectId } from "@/features/editing-studio/components/EditingStudioInvalidProjectId";
import { EditingStudioProjectNotFound } from "@/features/editing-studio/components/EditingStudioProjectNotFound";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";
import { getEditingProjectDisplayTitle } from "@/features/editing-studio/utils/project-display";
import { isValidEditingStudioProjectId } from "@/features/editing-studio/validators/project-id";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getEditingStudioRepository().getProject(projectId);
  return {
    title: project
      ? `History · ${getEditingProjectDisplayTitle(project)} | Editing Studio | ${BRAND_SUITE}`
      : `History · ${projectId} | Editing Studio | ${BRAND_SUITE}`,
  };
}

export default async function EditingStudioProjectHistoryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!isValidEditingStudioProjectId(projectId)) {
    return <EditingStudioInvalidProjectId rawId={projectId} />;
  }
  const project = await getEditingStudioRepository().getProject(projectId);
  if (!project) {
    return <EditingStudioProjectNotFound projectId={projectId} />;
  }
  return <EditingStudioHistoryPageClient projectId={projectId} project={project} />;
}
