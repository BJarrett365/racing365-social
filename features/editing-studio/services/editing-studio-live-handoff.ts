import type { EditingProject } from "@/features/editing-studio/types/domain";
import { getEditingProjectDisplayTitle } from "@/features/editing-studio/utils/project-display";
import type { LiveHandoffIntent } from "@/features/live-control/types/live-session";
import type { LiveSessionEditingHandoff } from "@/features/live-control/types/live-session-handoff";

const MAX_ASSET_REFS = 48;

/**
 * Map an Editing Studio project to Live Control handoff fields (no duplication of the full project model).
 */
export function mapEditingProjectToLiveHandoff(
  project: EditingProject,
  intent: LiveHandoffIntent,
): LiveSessionEditingHandoff {
  const assetRefs: string[] = [];
  for (const a of project.assets) {
    if (a.relPath?.trim()) assetRefs.push(`rel:${a.relPath.trim()}`);
    else if (a.url?.trim()) assetRefs.push(`url:${a.url.trim()}`);
    else assetRefs.push(`id:${a.id}`);
    if (assetRefs.length >= MAX_ASSET_REFS) break;
  }

  const title = getEditingProjectDisplayTitle(project);
  const primaryVariant = project.copyVariants[0];
  const headline =
    primaryVariant?.headline?.trim() || project.publicHeadline?.trim() || undefined;

  const summary =
    project.summary?.trim() ||
    project.description?.trim() ||
    project.editorialCopy?.socialCaption?.trim()?.slice(0, 4000) ||
    project.bodyNotes?.trim()?.slice(0, 4000) ||
    undefined;

  const sourceUrl =
    project.sourceUrl?.trim() || project.editorialCopy?.canonicalUrl?.trim() || undefined;

  return {
    editingProjectId: project.id,
    intent,
    title,
    summary,
    brand: project.brand?.trim() || undefined,
    sourceUrl,
    assetRefs,
    headline,
  };
}
