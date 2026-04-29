import path from "path";

export function projectRoot() {
  return process.cwd();
}

export function outputDir() {
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
