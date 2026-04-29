import { getCopyVariantForPlatform } from "@/features/editing-studio/preview/resolve-preview-data";
import type { EditingProject } from "@/features/editing-studio/types/domain";
import type { BuildEditingProjectExportOptions, EditingProjectExport } from "@/features/editing-studio/export/types";

/**
 * Build a versioned JSON export payload from the current project snapshot.
 */
export function buildEditingProjectExport(
  project: EditingProject,
  options?: BuildEditingProjectExportOptions,
): EditingProjectExport {
  const platformList =
    options?.platforms !== undefined ? options.platforms : project.platforms;

  const selectedVariantByPlatform: EditingProjectExport["selectedVariantByPlatform"] = {};
  for (const p of platformList) {
    selectedVariantByPlatform[p] = getCopyVariantForPlatform(project, p);
  }

  const assets =
    options?.assetIds !== undefined
      ? project.assets.filter((a) => options.assetIds!.includes(a.id))
      : [...project.assets];

  const publishPlan: EditingProjectExport["publishPlan"] = {
    targetPlatforms: [...project.platforms],
    scheduledAt: project.scheduledAt,
    publishedAt: project.publishedAt,
    archivedAt: project.archivedAt,
  };

  const metadata: EditingProjectExport["metadata"] = {
    title: project.title,
    publicHeadline: project.publicHeadline,
    summary: project.summary,
    bodyNotes: project.bodyNotes,
    editorialCopy: project.editorialCopy,
    editorialSettings: project.editorialSettings,
    sourceUrl: project.sourceUrl,
    thumbnailRel: project.thumbnailRel,
    description: project.description,
    workflowComments: project.workflowComments,
    integrationMeta: project.integrationMeta,
  };

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    projectId: project.id,
    revision: project.revision,
    brand: project.brand,
    contentType: project.contentType,
    status: project.status,
    selectedVariantByPlatform,
    assets,
    publishPlan,
    metadata,
  };
}
