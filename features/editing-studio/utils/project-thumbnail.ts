import type { EditingProject } from "@/features/editing-studio/types/domain";

/** Prefer explicit thumbnail; else first image asset with a path. */
export function resolveEditingStudioThumbnailRel(project: EditingProject): string | undefined {
  const t = project.thumbnailRel?.trim();
  if (t) return t;
  const img = project.assets.find((a) => a.kind === "image" && (a.relPath?.trim() || a.url?.trim()));
  if (!img) return undefined;
  return (img.relPath ?? img.url)?.trim() || undefined;
}

export function editingStudioThumbnailSrc(relOrUrl: string): string {
  if (/^https?:\/\//i.test(relOrUrl)) return relOrUrl;
  return `/api/file?rel=${encodeURIComponent(relOrUrl)}`;
}
