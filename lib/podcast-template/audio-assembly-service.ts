import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { ffmpegBinary, probeMediaDurationSec } from "@/app/features/video/ffmpeg-utils";
import { outputDir } from "@/app/lib/paths";

function ensureInsideOutput(rel: string): string {
  const normalized = rel.split(path.sep).join("/");
  if (normalized.includes("..")) throw new Error("Invalid relative path");
  const abs = path.normalize(path.join(outputDir(), ...normalized.split("/")));
  const root = path.normalize(outputDir());
  if (!abs.startsWith(root + path.sep) && abs !== root) throw new Error("Path outside output directory");
  return abs;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegBinary(), args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (c) => {
      err += c.toString();
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failed (${code}): ${err.slice(-1200)}`));
    });
  });
}

export class AudioAssemblyService {
  async concatMp3(segments: string[], outputRel: string): Promise<string> {
    const outAbs = ensureInsideOutput(outputRel);
    await fs.mkdir(path.dirname(outAbs), { recursive: true });
    const listFile = `${outAbs}.concat.txt`;
    const lines = segments.map((s) => `file '${ensureInsideOutput(s).replace(/'/g, "'\\''")}'`).join("\n");
    await fs.writeFile(listFile, `${lines}\n`, "utf-8");
    try {
      await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c:a", "libmp3lame", "-q:a", "3", outAbs]);
    } finally {
      await fs.unlink(listFile).catch(() => {});
    }
    return outputRel;
  }

  async assembleWithMusic(input: {
    speechRel: string;
    outputRel: string;
    introMusicRel?: string;
    outroMusicRel?: string;
    speechVolume: number;
    musicVolume: number;
    fadeInSec: number;
    fadeOutSec: number;
  }): Promise<string> {
    const speechAbs = ensureInsideOutput(input.speechRel);
    const outAbs = ensureInsideOutput(input.outputRel);
    await fs.mkdir(path.dirname(outAbs), { recursive: true });
    if (!input.introMusicRel && !input.outroMusicRel) {
      await fs.copyFile(speechAbs, outAbs);
      return input.outputRel;
    }
    const parts: string[] = [];
    const tempFiles: string[] = [];
    if (input.introMusicRel) {
      const introSrc = ensureInsideOutput(input.introMusicRel);
      const introAdjRel = `audio/podcast-template/_intro-${Date.now()}.mp3`;
      const introAdjAbs = ensureInsideOutput(introAdjRel);
      await runFfmpeg([
        "-y",
        "-i",
        introSrc,
        "-filter:a",
        `volume=${Math.max(0.01, input.musicVolume)},afade=t=in:st=0:d=${Math.max(0, input.fadeInSec)}`,
        "-c:a",
        "libmp3lame",
        "-q:a",
        "3",
        introAdjAbs,
      ]);
      tempFiles.push(introAdjAbs);
      parts.push(introAdjRel);
    }
    parts.push(input.speechRel);
    if (input.outroMusicRel) {
      const outroSrc = ensureInsideOutput(input.outroMusicRel);
      const outroAdjRel = `audio/podcast-template/_outro-${Date.now()}.mp3`;
      const outroAdjAbs = ensureInsideOutput(outroAdjRel);
      const outroDur = await probeMediaDurationSec(outroSrc).catch(() => 0);
      const fadeStart = outroDur > input.fadeOutSec ? Math.max(0, outroDur - input.fadeOutSec) : 0;
      await runFfmpeg([
        "-y",
        "-i",
        outroSrc,
        "-filter:a",
        `volume=${Math.max(0.01, input.musicVolume)},afade=t=out:st=${fadeStart}:d=${Math.max(0, input.fadeOutSec)}`,
        "-c:a",
        "libmp3lame",
        "-q:a",
        "3",
        outroAdjAbs,
      ]);
      tempFiles.push(outroAdjAbs);
      parts.push(outroAdjRel);
    }
    const tempRel = `audio/podcast-template/_tmp-${Date.now()}.mp3`;
    const tempAbs = ensureInsideOutput(tempRel);
    await this.concatMp3(parts, tempRel);
    const dur = await probeMediaDurationSec(tempAbs).catch(() => 0);
    const fadeStart = dur > input.fadeOutSec ? Math.max(0, dur - input.fadeOutSec) : 0;
    const filter = `volume=${Math.max(0.01, input.speechVolume)},afade=t=in:st=0:d=${Math.max(0, input.fadeInSec)},afade=t=out:st=${fadeStart}:d=${Math.max(0, input.fadeOutSec)}`;
    await runFfmpeg(["-y", "-i", tempAbs, "-filter:a", filter, "-c:a", "libmp3lame", "-q:a", "3", outAbs]);
    await fs.unlink(tempAbs).catch(() => {});
    for (const f of tempFiles) await fs.unlink(f).catch(() => {});
    return input.outputRel;
  }
}
