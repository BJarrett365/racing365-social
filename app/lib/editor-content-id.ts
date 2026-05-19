/**
 * Content id rules shared by editor upload routes and **client** UI (Runway import, etc.).
 * Keep this file free of Node-only imports (`fs`, `ffmpeg`, …).
 */

export function isSafeContentId(contentId: string): boolean {
  return Boolean(
    contentId &&
      !contentId.includes("..") &&
      !contentId.includes("/") &&
      !contentId.includes("\\"),
  );
}

/** Same rules as `toContentId` in news-shorts build routes — filenames must match this id. */
export function normalizeContentIdForFilename(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return `news-${Date.now()}`;
  const cleaned = raw.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80);
  return cleaned || `news-${Date.now()}`;
}
