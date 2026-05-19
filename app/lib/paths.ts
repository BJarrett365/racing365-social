import { tmpdir } from "os";
import path from "path";

export function projectRoot() {
  return process.cwd();
}

/**
 * Netlify / Vercel serverless: project root under `/var/task` is not writable — `mkdir output` fails with ENOENT.
 * Use a per-invocation writable tree under the OS temp directory. Pair library uploads with
 * {@link writeLibraryBlobAsset} so assets persist across instances.
 * Named without `use*` so ESLint `react-hooks/rules-of-hooks` does not treat this as a hook.
 */
function ephemeralWritableOutputRoot(): boolean {
  return (
    process.env.NETLIFY === "true" ||
    Boolean(process.env.NETLIFY_BLOBS_CONTEXT) ||
    process.env.VERCEL === "1"
  );
}

export function outputDir() {
  if (ephemeralWritableOutputRoot()) {
    return path.join(tmpdir(), "plexa-studio-output");
  }
  return path.join(projectRoot(), "output");
}

export function outputImagesDir() {
  return path.join(outputDir(), "images");
}

export function outputAudioDir() {
  return path.join(outputDir(), "audio");
}

export function outputSubtitlesDir() {
  return path.join(outputDir(), "subtitles");
}

export function outputVideoDir() {
  return path.join(outputDir(), "video");
}

export function assetsManifestPath() {
  return path.join(outputDir(), "manifest.json");
}

export function libraryMetadataPath() {
  return path.join(outputDir(), "library-metadata.json");
}

export function editorUploadDir(contentId: string) {
  return path.join(outputDir(), "uploads", contentId);
}

/** Background stills for Shorts — listed under Library → Library images. */
export function libraryBackgroundImagesDir(contentId: string) {
  return path.join(outputDir(), "images", "library", contentId);
}
