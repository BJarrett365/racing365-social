/**
 * Editor may store only `backgroundImageRelBySceneId` (per-scene upload). For PNG renders we still
 * need a global rel so every scene receives `editorBackgroundImageUrl` unless overridden.
 * Kept separate from `editor-upload` so client components can import without pulling Node `fs`.
 */
export function coalesceGlobalBackgroundImageRel(
  backgroundImageRel: string | null | undefined,
  backgroundImageRelBySceneId: Record<string, string> | null | undefined,
): string | null {
  const g = typeof backgroundImageRel === "string" ? backgroundImageRel.trim() : "";
  if (g) return g;
  for (const v of Object.values(backgroundImageRelBySceneId ?? {})) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
