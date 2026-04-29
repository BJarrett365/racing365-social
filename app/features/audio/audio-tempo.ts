import fs from "fs/promises";
import { spawn } from "child_process";
import { ffmpegBinary } from "@/app/features/video/ffmpeg-utils";

/** Build FFmpeg atempo chain (each atempo must stay within 0.5–2). */
function buildAtempoFilterChain(speed: number): string {
  const filters: string[] = [];
  let s = Math.max(0.25, Math.min(4, speed));
  while (s > 2 + 1e-6) {
    filters.push("atempo=2");
    s /= 2;
  }
  while (s < 0.5 - 1e-6) {
    filters.push("atempo=0.5");
    s /= 0.5;
  }
  if (Math.abs(s - 1) >= 0.015) {
    const v = Math.min(2, Math.max(0.5, Math.round(s * 1000) / 1000));
    filters.push(`atempo=${v}`);
  }
  return filters.length ? filters.join(",") : "atempo=1";
}

function runFfmpegAtempo(input: string, output: string, filter: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = ffmpegBinary();
    const p = spawn(
      ff,
      ["-y", "-i", input, "-filter:a", filter, "-codec:a", "libmp3lame", "-q:a", "4", output],
      { stdio: "ignore" },
    );
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg atempo failed: ${code}`));
    });
  });
}

/** Adjust MP3 tempo in place (speed above 1 = faster). No-op near 1×. */
export async function applyAudioTempoInPlace(mp3Path: string, speed: number): Promise<void> {
  if (Math.abs(speed - 1) < 0.02) return;
  const filter = buildAtempoFilterChain(speed);
  const tmp = `${mp3Path}.r365-tempo.mp3`;
  await runFfmpegAtempo(mp3Path, tmp, filter);
  await fs.unlink(mp3Path).catch(() => {});
  await fs.rename(tmp, mp3Path);
}
