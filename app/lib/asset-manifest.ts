/** Client-safe manifest shape + helpers (no Node `fs` — safe to import from Client Components). */

export type ManifestEntry = {
  id: string;
  format: string;
  createdAt: string;
  video: string;
  subtitles: string;
  images: string[];
  /** Human-readable title for library UI and video metadata */
  seoTitle?: string;
  /** Slug stem for downloads / filenames (no `-short` suffix) */
  seoSlug?: string;
  /** Preferred MP4 save name from SEO (e.g. `topic-entity-2026.mp4`) — overrides `-short` naming when set */
  seoDownloadFile?: string;
  /** Search helpers shown in Library filtering. */
  keywords?: string[];
  /** Post-build trim/edit output (`video/{id}-short-edited.mp4`) */
  editedVideo?: string;
  /** Build intent for hub filtering. */
  buildMode?: "shorts" | "portrait" | "landscape";
};

/** Parse paths like `video/foo-short.mp4` or `video/foo-short-edited.mp4` → `foo` */
export function contentIdFromVideoFilename(filename: string): string | null {
  const seg = filename.split(/[/\\]/).pop() ?? filename;
  const base = seg.replace(/\.mp4$/i, "");
  if (base.endsWith("-short-edited")) return base.slice(0, -"-short-edited".length);
  if (base.endsWith("-short")) return base.slice(0, -"-short".length);
  return null;
}

/** `uploads/foo/custom-bg.mp4` → `foo` */
export function contentIdFromBackdropRel(rel: string): string | null {
  const n = rel.replace(/\\/g, "/");
  const m = /^uploads\/([^/]+)\/custom-bg\.mp4$/i.exec(n);
  return m ? m[1] : null;
}

/** `uploads/foo/camera-record.webm` or `.mp4` → `foo` */
export function contentIdFromCameraRecordRel(rel: string): string | null {
  const n = rel.replace(/\\/g, "/");
  const m = /^uploads\/([^/]+)\/camera-record\.(webm|mp4)$/i.exec(n);
  return m ? m[1] : null;
}

/** Runway/editor backdrop or News Shorts camera recording under `uploads/`. */
export function contentIdFromUploadsBackdropVideoRel(rel: string): string | null {
  return contentIdFromBackdropRel(rel) ?? contentIdFromCameraRecordRel(rel);
}

/** `images/library/foo/custom-bg.png` → `foo` */
export function contentIdFromLibraryImageRel(rel: string): string | null {
  const n = rel.replace(/\\/g, "/");
  const m = /^images\/library\/([^/]+)\//i.exec(n);
  return m ? m[1] : null;
}

/** Legacy `uploads/foo/custom-bg.png` (still image) → `foo` */
export function contentIdFromUploadsBackgroundImageRel(rel: string): string | null {
  const n = rel.replace(/\\/g, "/");
  const m = /^uploads\/([^/]+)\/custom-bg[^/]*\.(png|jpe?g|webp|gif)$/i.exec(n);
  return m ? m[1] : null;
}

export function contentIdFromAnyBackgroundImageRel(rel: string): string | null {
  return contentIdFromLibraryImageRel(rel) ?? contentIdFromUploadsBackgroundImageRel(rel);
}

/** `audio/news-123-voice-record.webm` → `news-123` */
export function contentIdFromVoiceRecordingRel(rel: string): string | null {
  const n = rel.replace(/\\/g, "/");
  const base = n.split("/").pop() ?? n;
  const m = /^(.+)-voice-record\.(webm|mp3|m4a|wav)$/i.exec(base);
  return m ? m[1] : null;
}
