import type { Metadata } from "next";
import { BRAND_SUITE } from "@/app/lib/brand";
import { EditingStudioInvalidProjectId } from "@/features/editing-studio/components/EditingStudioInvalidProjectId";
import { EditingStudioProjectSectionPlaceholder } from "@/features/editing-studio/components/EditingStudioProjectSectionPlaceholder";
import { isValidEditingStudioProjectId } from "@/features/editing-studio/validators/project-id";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  return {
    title: `Preview · ${projectId} | Schedule Studio | ${BRAND_SUITE}`,
  };
}

export default async function EditingStudioProjectPreviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!isValidEditingStudioProjectId(projectId)) {
    return <EditingStudioInvalidProjectId rawId={projectId} />;
  }
  return <EditingStudioProjectSectionPlaceholder projectId={projectId} section="preview" />;
}
