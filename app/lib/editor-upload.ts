import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { editorUploadDir, libraryBackgroundImagesDir, outputAudioDir, outputDir } from "@/app/lib/paths";
import { ffmpegBinary } from "@/app/features/video/ffmpeg-utils";

function normalizedUploadAbs(rel: string): string {
  return path.normalize(path.join(outputDir(), ...rel.split("/")));
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_VOICE_RECORD_BYTES = 50 * 1024 * 1024;

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

/**
 * Validates `rel` like `audio/{contentId}-voice-record.webm` and that it stays under `output/audio/`.
 */
export function assertVoiceRecordingRel(rel: string, contentId: string): string {
  const id = normalizeContentIdForFilename(contentId);
  if (!isSafeContentId(id)) throw new Error("Invalid content id");
  const norm = rel.split(path.sep).join("/");
  if (norm.includes("..")) throw new Error("Invalid path");
  const base = path.basename(norm);
  const expected = `${id}-voice-record`;
  const stem = base.replace(/\.[^.]+$/, "");
  if (stem !== expected) {
    throw new Error("Voice recording does not match this content id");
  }
  const ext = path.extname(base).toLowerCase();
  if (![".webm", ".mp3", ".m4a", ".wav"].includes(ext)) {
    throw new Error("Invalid voice recording file type");
  }
  if (!norm.startsWith("audio/")) throw new Error("Invalid voice recording path");
  const abs = path.normalize(path.join(outputDir(), ...norm.split("/")));
  const root = path.normalize(outputAudioDir());
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    throw new Error("Path outside audio folder");
  }
  return norm;
}

/** Save browser-recorded or uploaded voice audio for News Shorts (`output/audio/{contentId}-voice-record.*`). */
export async function saveVoiceRecording(contentId: string, file: File): Promise<{ voiceRecordingRel: string }> {
  const id = normalizeContentIdForFilename(contentId);
  if (!isSafeContentId(id)) throw new Error("Invalid content id");
  if (!file || file.size === 0) throw new Error("No audio file");
  if (file.size > MAX_VOICE_RECORD_BYTES) throw new Error("Recording too large (max 50MB)");

  const nameLower = (file.name || "").toLowerCase();
  const mime = file.type.toLowerCase();
  const ext = mime.includes("webm") || nameLower.endsWith(".webm")
    ? ".webm"
    : mime.includes("mpeg") || nameLower.endsWith(".mp3")
      ? ".mp3"
      : mime.includes("mp4") || mime.includes("audio/mp4") || nameLower.endsWith(".m4a")
        ? ".m4a"
        : mime.includes("wav") || nameLower.endsWith(".wav")
          ? ".wav"
          : ".webm";

  const dir = outputAudioDir();
  await fs.mkdir(dir, { recursive: true });
  const baseName = `${id}-voice-record${ext}`;
  const abs = path.join(dir, baseName);
  await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()));
  const rel = path.join("audio", baseName).split(path.sep).join("/");
  return { voiceRecordingRel: rel };
}

/** Remove any saved voice recording files for this content id (best-effort). */
export async function deleteVoiceRecordingsForContentId(contentId: string): Promise<void> {
  const id = normalizeContentIdForFilename(contentId);
  if (!isSafeContentId(id)) return;
  const dir = outputAudioDir();
  let names: string[] = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return;
  }
  const prefix = `${id}-voice-record`;
  for (const n of names) {
    if (n.startsWith(prefix)) {
      try {
        await fs.unlink(path.join(dir, n));
      } catch {
        /* ignore */
      }
    }
  }
}

/** Reject path traversal; rel must live under uploads/{contentId}/ (video) or images/library/{contentId}/ (still). */
export function assertUploadRel(rel: string, contentId: string): string {
  const norm = rel.split(path.sep).join("/");
  if (norm.includes("..")) throw new Error("Invalid path");
  const uploadsPrefix = `uploads/${contentId}/`;
  const libraryPrefix = `images/library/${contentId}/`;
  if (!norm.startsWith(uploadsPrefix) && !norm.startsWith(libraryPrefix)) {
    throw new Error("Invalid upload path");
  }
  const abs = normalizedUploadAbs(norm);
  const roots = [path.normalize(editorUploadDir(contentId)), path.normalize(libraryBackgroundImagesDir(contentId))];
  const ok = roots.some((root) => abs === root || abs.startsWith(root + path.sep));
  if (!ok) throw new Error("Path outside upload folder");
  return norm;
}

/**
 * Validates a backdrop path under `output/uploads` or `output/images/library` for any content id
 * (library picker, re-use across News Shorts). Rejects traversal; must stay under `output/`.
 */
export function assertCrossContentBackdropRel(rel: string): string {
  const norm = rel.split(path.sep).join("/");
  if (!norm || norm.includes("..")) throw new Error("Invalid path");
  const abs = path.normalize(path.join(outputDir(), ...norm.split("/")));
  const root = path.normalize(outputDir());
  if (!abs.startsWith(root + path.sep)) throw new Error("Invalid path");
  const uploadsRoot = path.normalize(path.join(outputDir(), "uploads"));
  const libRoot = path.normalize(path.join(outputDir(), "images", "library"));
  if (abs.startsWith(uploadsRoot + path.sep) || abs.startsWith(libRoot + path.sep)) {
    return norm;
  }
  throw new Error("Invalid backdrop path");
}

/**
 * Validates an audio asset path under output for Backing Music.
 * Allowed roots:
 * - output/audio/
 * - output/uploads/{contentId}/music/
 * - output/library/music/
 * - output/generated/{contentId}/
 */
export function assertAudioAssetRel(rel: string): string {
  const norm = rel.split(path.sep).join("/");
  if (!norm || norm.includes("..")) throw new Error("Invalid audio path");
  const ext = path.extname(norm).toLowerCase();
  if (![".mp3", ".wav", ".m4a", ".aac"].includes(ext)) {
    throw new Error("Unsupported audio format");
  }
  const abs = path.normalize(path.join(outputDir(), ...norm.split("/")));
  const root = path.normalize(outputDir());
  if (!abs.startsWith(root + path.sep)) throw new Error("Invalid audio path");
  const allowed = [
    path.normalize(path.join(outputDir(), "audio")),
    path.normalize(path.join(outputDir(), "uploads")),
    path.normalize(path.join(outputDir(), "library", "music")),
    path.normalize(path.join(outputDir(), "generated")),
  ];
  if (allowed.some((r) => abs === r || abs.startsWith(r + path.sep))) return norm;
  throw new Error("Audio path outside allowed folders");
}

export async function fileToDataUrl(absFile: string): Promise<string> {
  const buf = await fs.readFile(absFile);
  const ext = path.extname(absFile).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/jpeg" || mime === "image/jpg") return ".jpg";
  return "";
}

export function imageExtForFile(file: File): string {
  const fromMime = extFromMime(file.type);
  if (fromMime) return fromMime;
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return ".png";
  if (n.endsWith(".webp")) return ".webp";
  if (n.endsWith(".gif")) return ".gif";
  return ".jpg";
}

const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function isVideoMime(mime: string, name: string): boolean {
  if (VIDEO_MIMES.has(mime)) return true;
  const n = name.toLowerCase();
  return n.endsWith(".mp4") || n.endsWith(".webm") || n.endsWith(".mov");
}

function extractOneFrame(videoAbs: string, posterAbs: string, ss: string): Promise<void> {
  const bin = ffmpegBinary();
  return new Promise((resolve, reject) => {
    const p = spawn(
      bin,
      [
        "-hide_banner",
        "-nostdin",
        "-y",
        "-ss",
        ss,
        "-i",
        videoAbs,
        "-vframes",
        "1",
        "-vf",
        "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
        posterAbs,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let err = "";
    p.stderr?.on("data", (c) => {
      err += c.toString();
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.slice(-400) || `ffmpeg exit ${code}`));
    });
  });
}

/** Prefer ~1s in; retry at 0 for very short clips. */
export async function extractVideoPosterFrame(videoAbs: string, posterAbs: string): Promise<void> {
  try {
    await extractOneFrame(videoAbs, posterAbs, "1");
  } catch {
    await extractOneFrame(videoAbs, posterAbs, "0");
  }
}

export type EditorUploadResult = {
  backgroundImageRel?: string;
  backgroundImageRelBySceneId?: Record<string, string>;
  backgroundVideoRel?: string;
  /** PNG frame grab — use this for scene renders if no image uploaded */
  backgroundVideoFrameRel?: string;
};

export async function saveEditorUploads(
  contentId: string,
  image: File | null,
  video: File | null,
  sceneId?: string | null,
): Promise<EditorUploadResult> {
  const out: EditorUploadResult = {};
  if (!isSafeContentId(contentId)) throw new Error("Invalid content id");

  const uploadDir = editorUploadDir(contentId);
  await fs.mkdir(uploadDir, { recursive: true });

  if (image && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) throw new Error("Image too large (max 15MB)");
    const ext = imageExtForFile(image);
    if (![".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) {
      throw new Error("Image must be PNG, JPEG, WebP, or GIF");
    }
    const sid = (sceneId ?? "").trim();
    const sceneSafe = sid && /^[a-z0-9_-]+$/i.test(sid) ? sid : "";
    const name = sceneSafe ? `custom-bg-${sceneSafe}${ext}` : `custom-bg${ext}`;
    const libDir = libraryBackgroundImagesDir(contentId);
    await fs.mkdir(libDir, { recursive: true });
    const abs = path.join(libDir, name);
    const buf = Buffer.from(await image.arrayBuffer());
    await fs.writeFile(abs, buf);
    const rel = path.join("images", "library", contentId, name).split(path.sep).join("/");
    if (sceneSafe) {
      out.backgroundImageRelBySceneId = { [sceneSafe]: rel };
    } else {
      out.backgroundImageRel = rel;
    }
  }

  if (video && video.size > 0) {
    const dir = uploadDir;
    if (video.size > MAX_VIDEO_BYTES) throw new Error("Video too large (max 80MB)");
    if (!isVideoMime(video.type, video.name)) {
      throw new Error("Video must be MP4, WebM, or MOV");
    }
    const ext = video.name.toLowerCase().endsWith(".webm")
      ? ".webm"
      : video.name.toLowerCase().endsWith(".mov")
        ? ".mov"
        : ".mp4";
    const vname = `custom-bg${ext}`;
    const vabs = path.join(dir, vname);
    await fs.writeFile(vabs, Buffer.from(await video.arrayBuffer()));
    out.backgroundVideoRel = path.join("uploads", contentId, vname).split(path.sep).join("/");

    const posterName = "custom-bg-video-frame.png";
    const posterAbs = path.join(dir, posterName);
    await extractVideoPosterFrame(vabs, posterAbs);
    out.backgroundVideoFrameRel = path.join("uploads", contentId, posterName).split(path.sep).join("/");
  }

  return out;
}

function extFromImageContentType(ct: string | null): string {
  if (!ct) return ".png";
  const c = ct.toLowerCase();
  if (c.includes("png")) return ".png";
  if (c.includes("jpeg") || c.includes("jpg")) return ".jpg";
  if (c.includes("webp")) return ".webp";
  if (c.includes("gif")) return ".gif";
  return ".png";
}

/** Save a Runway-generated image into `images/library/{contentId}/custom-bg.{ext}` (same as manual upload). */
export async function saveRunwayImageBufferToLibraryBackground(
  contentId: string,
  buffer: Buffer,
  contentType: string | null,
): Promise<EditorUploadResult> {
  if (!isSafeContentId(contentId)) throw new Error("Invalid content id");
  if (buffer.length === 0) throw new Error("Empty image");
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("Image too large (max 15MB)");

  const ext = extFromImageContentType(contentType);
  const dir = libraryBackgroundImagesDir(contentId);
  await fs.mkdir(dir, { recursive: true });
  const name = `custom-bg${ext}`;
  const abs = path.join(dir, name);
  await fs.writeFile(abs, buffer);
  const rel = path.join("images", "library", contentId, name).split(path.sep).join("/");
  return { backgroundImageRel: rel };
}

/**
 * Save a browser-recorded camera clip for News Shorts (`uploads/{contentId}/camera-record.webm` or `.mp4`).
 * Extracts a poster frame for scene renders (same pattern as Runway imports).
 */
export async function saveCameraVideoRecording(contentId: string, buffer: Buffer, mime: string): Promise<EditorUploadResult> {
  if (!isSafeContentId(contentId)) throw new Error("Invalid content id");
  if (buffer.length === 0) throw new Error("Empty video");
  if (buffer.length > MAX_VIDEO_BYTES) throw new Error("Video too large (max 80MB)");

  const dir = editorUploadDir(contentId);
  await fs.mkdir(dir, { recursive: true });

  const lower = mime.toLowerCase();
  const ext =
    lower.includes("mp4") || lower.includes("quicktime") ? ".mp4" : ".webm";
  const vname = `camera-record${ext}`;
  const vabs = path.join(dir, vname);
  await fs.writeFile(vabs, buffer);

  const out: EditorUploadResult = {
    backgroundVideoRel: path.join("uploads", contentId, vname).split(path.sep).join("/"),
  };

  const posterName = "camera-record-frame.png";
  const posterAbs = path.join(dir, posterName);
  await extractVideoPosterFrame(vabs, posterAbs);
  out.backgroundVideoFrameRel = path.join("uploads", contentId, posterName).split(path.sep).join("/");

  return out;
}

/** Remove saved camera recordings for this content id (video + poster). */
export async function deleteCameraVideoRecordingsForContentId(contentId: string): Promise<void> {
  const id = normalizeContentIdForFilename(contentId);
  if (!isSafeContentId(id)) return;
  const dir = editorUploadDir(id);
  let names: string[] = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return;
  }
  for (const n of names) {
    if (n.startsWith("camera-record")) {
      try {
        await fs.unlink(path.join(dir, n));
      } catch {
        /* ignore */
      }
    }
  }
}

/** Save a generated or downloaded MP4 (e.g. Runway) into the same slot as a user-uploaded backdrop. */
export async function saveVideoBufferToEditorUpload(contentId: string, buffer: Buffer): Promise<EditorUploadResult> {
  if (!isSafeContentId(contentId)) throw new Error("Invalid content id");
  if (buffer.length === 0) throw new Error("Empty video");
  if (buffer.length > MAX_VIDEO_BYTES) throw new Error("Video too large (max 80MB)");

  const dir = editorUploadDir(contentId);
  await fs.mkdir(dir, { recursive: true });

  const vname = "custom-bg.mp4";
  const vabs = path.join(dir, vname);
  await fs.writeFile(vabs, buffer);

  const out: EditorUploadResult = {
    backgroundVideoRel: path.join("uploads", contentId, vname).split(path.sep).join("/"),
  };

  const posterName = "custom-bg-video-frame.png";
  const posterAbs = path.join(dir, posterName);
  await extractVideoPosterFrame(vabs, posterAbs);
  out.backgroundVideoFrameRel = path.join("uploads", contentId, posterName).split(path.sep).join("/");

  return out;
}

/** Prefer custom image; else video frame grab — embedded as data URL for Puppeteer. */
export async function resolveEditorBackdropDataUrl(
  contentId: string,
  backgroundImageRel?: string | null,
  backgroundVideoFrameRel?: string | null,
): Promise<string | undefined> {
  const rel = backgroundImageRel?.trim() || backgroundVideoFrameRel?.trim();
  if (!rel) return undefined;
  if (!isSafeContentId(contentId)) return undefined;
  assertCrossContentBackdropRel(rel);
  const abs = normalizedUploadAbs(rel);
  try {
    await fs.access(abs);
  } catch {
    return undefined;
  }
  return fileToDataUrl(abs);
}
