/** Shown when a project has no usable title or headline. */
export const EDITING_STUDIO_UNTITLED_LABEL = "Untitled project";

export function getEditingProjectDisplayTitle(project: {
  title: string;
  publicHeadline?: string;
}): string {
  const t = project.title?.trim();
  if (t) return t;
  const ph = project.publicHeadline?.trim();
  if (ph) return ph;
  return EDITING_STUDIO_UNTITLED_LABEL;
}
