import path from "path";
import { outputDir, outputVideoDir } from "@/app/lib/paths";

/** Normalised rel under `output/` (forward slashes). */
export function assertVideoOutputRel(rel: string): { abs: string; norm: string } {
  const norm = rel.split(path.sep).join("/").replace(/^\/+/, "");
  if (!norm || norm.includes("..") || !norm.startsWith("video/") || !norm.toLowerCase().endsWith(".mp4")) {
    throw new Error("Invalid video path");
  }
  const root = path.normalize(outputDir());
  const abs = path.normalize(path.resolve(root, ...norm.split("/")));
  const videoRoot = path.normalize(outputVideoDir());
  if (abs !== videoRoot && !abs.startsWith(videoRoot + path.sep)) {
    throw new Error("Video must be under output/video");
  }
  return { abs, norm };
}

export function videoBasenameMatchesContentId(basename: string, contentId: string): boolean {
  return (
    basename === `${contentId}-short.mp4` ||
    basename === `${contentId}-short-edited.mp4`
  );
}

export function editedVideoRelForContentId(contentId: string): string {
  return `video/${contentId}-short-edited.mp4`;
}
