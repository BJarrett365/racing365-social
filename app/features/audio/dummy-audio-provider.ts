import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { outputAudioDir, projectRoot } from "@/app/lib/paths";
import type { AudioProvider, VoiceTrackOptions } from "./types";
import { ffmpegBinary } from "@/app/features/video/ffmpeg-utils";

export class DummyAudioProvider implements AudioProvider {
  async resolveVoiceTrack(_script: string, contentId: string, options?: VoiceTrackOptions): Promise<string> {
    void options;
    const custom = process.env.DUMMY_AUDIO_PATH;
    if (custom) {
      await fs.access(custom);
      return custom;
    }

    const asset = path.join(projectRoot(), "assets", "dummy", "voice.mp3");
    try {
      await fs.access(asset);
      return asset;
    } catch {
      // Generate short silent MP3 so pipeline works without a bundled file
      const out = path.join(outputAudioDir(), `${contentId}-dummy.mp3`);
      await fs.mkdir(path.dirname(out), { recursive: true });
      await generateSilentMp3(out, 4);
      return out;
    }
  }
}

function generateSilentMp3(outPath: string, seconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = ffmpegBinary();
    const args = [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=44100:cl=mono`,
      "-t",
      String(seconds),
      "-q:a",
      "9",
      "-acodec",
      "libmp3lame",
      outPath,
    ];
    const p = spawn(ff, args, { stdio: "ignore" });
    p.on("error", (e) => {
      const err = e as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        reject(
          new Error(
            `ffmpeg not found (${ff}). Run \`npm install\` (ffmpeg-static) or set FFMPEG_PATH in .env.local.`,
          ),
        );
        return;
      }
      reject(e);
    });
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${ff} silent audio failed with code ${code}`));
    });
  });
}
