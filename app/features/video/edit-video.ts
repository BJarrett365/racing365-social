import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import type { ManifestEntry } from "@/app/lib/asset-manifest";
import { assetsManifestPath, outputVideoDir, projectRoot } from "@/app/lib/paths";
import {
  assertVideoOutputRel,
  editedVideoRelForContentId,
  videoBasenameMatchesContentId,
} from "@/app/lib/video-output-paths";
import { ffmpegBinary, probeMediaDurationSec, FFMPEG_LIBX264_MP4_ARGS } from "@/app/features/video/ffmpeg-utils";
import { BRAND_ENCODER } from "@/app/lib/brand";
import { persistVideoOutputToBlob } from "@/app/lib/video-blob-assets";

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = ffmpegBinary();
    const p = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: projectRoot(),
    });
    let err = "";
    p.stderr?.on("data", (c) => {
      err += c.toString();
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${err.slice(-1200)}`));
    });
  });
}

export type TrimVideoParams = {
  contentId: string;
  /** Current file to trim (`video/{id}-short.mp4` or `video/{id}-short-edited.mp4`) */
  sourceVideoRel: string;
  trimStartSec: number;
  trimEndSec: number;
};

const MIN_OUT_SEC = 0.25;

/**
 * Writes `video/{contentId}-short-edited.mp4` (re-encode for accurate cuts).
 * Original `-short.mp4` is left unchanged.
 */
export async function trimVideoToEdited(params: TrimVideoParams): Promise<{
  videoRel: string;
  durationSec: number;
  outputDurationSec: number;
}> {
  const { contentId, sourceVideoRel } = params;
  if (!contentId || contentId.includes("..") || contentId.includes("/")) {
    throw new Error("Invalid content id");
  }

  const base = path.basename(sourceVideoRel);
  if (!videoBasenameMatchesContentId(base, contentId)) {
    throw new Error("Source video does not match this content id");
  }

  const { abs: srcAbs } = assertVideoOutputRel(sourceVideoRel);
  await fs.access(srcAbs);

  const trimStart = Math.max(0, Number(params.trimStartSec) || 0);
  const trimEnd = Math.max(0, Number(params.trimEndSec) || 0);

  const total = await probeMediaDurationSec(srcAbs);
  const outDur = total - trimStart - trimEnd;
  if (!Number.isFinite(outDur) || outDur < MIN_OUT_SEC) {
    throw new Error(
      `Trim too aggressive: length would be ${outDur.toFixed(2)}s (min ${MIN_OUT_SEC}s). Video is ${total.toFixed(2)}s.`,
    );
  }

  const outNorm = editedVideoRelForContentId(contentId);
  const outAbs = path.join(outputVideoDir(), `${contentId}-short-edited.mp4`);
  await fs.mkdir(outputVideoDir(), { recursive: true });

  const outDurStr = outDur.toFixed(3);
  const trimStartStr = trimStart.toFixed(3);

  await runFfmpeg([
    "-y",
    "-ss",
    trimStartStr,
    "-i",
    srcAbs,
    "-t",
    outDurStr,
    "-r",
    "30",
    ...FFMPEG_LIBX264_MP4_ARGS,
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-metadata",
    `encoder=${BRAND_ENCODER}`,
    outAbs,
  ]);

  await setManifestEditedVideo(contentId, outNorm);
  await persistVideoOutputToBlob(outAbs);

  return {
    videoRel: outNorm,
    durationSec: total,
    outputDurationSec: outDur,
  };
}

async function setManifestEditedVideo(contentId: string, editedRelNorm: string): Promise<void> {
  const p = assetsManifestPath();
  let list: ManifestEntry[] = [];
  try {
    const raw = await fs.readFile(p, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) list = parsed as ManifestEntry[];
  } catch {
    return;
  }
  let changed = false;
  const next = list.map((e) => {
    if (e.id === contentId) {
      changed = true;
      return { ...e, editedVideo: editedRelNorm };
    }
    return e;
  });
  if (changed) {
    await fs.writeFile(p, JSON.stringify(next, null, 2), "utf-8");
  }
}

/** Duration for any `video/*.mp4` under output. */
export async function probeVideoRelDurationSec(videoRel: string): Promise<number> {
  const { abs } = assertVideoOutputRel(videoRel);
  await fs.access(abs);
  return probeMediaDurationSec(abs);
}
