import type { Metadata } from "next";
import { Suspense } from "react";
import { BRAND_SUITE } from "@/app/lib/brand";
import { EditingStudioInvalidProjectId } from "@/features/editing-studio/components/EditingStudioInvalidProjectId";
import { EditingStudioProjectEditorClient } from "@/features/editing-studio/components/EditingStudioProjectEditorClient";
import { EditingStudioProjectEditorSkeleton } from "@/features/editing-studio/components/EditingStudioProjectEditorSkeleton";
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
      ? `${getEditingProjectDisplayTitle(project)} | Editing Studio | ${BRAND_SUITE}`
      : `${projectId} | Editing Studio | ${BRAND_SUITE}`,
  };
}

export default async function EditingStudioProjectPage({
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
  return (
    <Suspense fallback={<EditingStudioProjectEditorSkeleton />}>
      <EditingStudioProjectEditorClient initialProject={project} />
    </Suspense>
  );
}
