import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { outputAudioDir } from "@/app/lib/paths";
import type { AudioProvider, VoiceTrackOptions } from "./types";
import { ffmpegBinary } from "@/app/features/video/ffmpeg-utils";
import os from "os";

/** Free on-device narration on macOS (built-in `say`), converted to MP3 via FFmpeg */
export class MacosSayAudioProvider implements AudioProvider {
  async resolveVoiceTrack(
    script: string,
    contentId: string,
    options?: VoiceTrackOptions,
  ): Promise<string> {
    if (process.platform !== "darwin") {
      throw new Error("MacosSayAudioProvider only works on macOS");
    }

    const dir = outputAudioDir();
    await fs.mkdir(dir, { recursive: true });
    const txt = path.join(os.tmpdir(), `r365-say-${contentId}.txt`);
    const aiff = path.join(dir, `${contentId}-say.aiff`);
    const mp3 = path.join(dir, `${contentId}-say.mp3`);

    await fs.writeFile(txt, script.trim() || " ", "utf-8");

    let voice = process.env.MACOS_SAY_VOICE?.trim();
    if (!voice) {
      if (options?.gender === "male") voice = "Alex";
      else if (options?.gender === "female") voice = "Samantha";
    }
    const speed = options?.speed ?? 1;
    const wpm = Math.round(175 * speed);
    const rate = Math.min(400, Math.max(90, wpm));
    const sayArgs = ["-r", String(rate), "-o", aiff, "-f", txt];
    if (voice) {
      sayArgs.unshift("-v", voice);
    }

    await runCmd("say", sayArgs);
    await fs.unlink(txt).catch(() => {});

    await runFfmpegToMp3(aiff, mp3);
    await fs.unlink(aiff).catch(() => {});

    return mp3;
  }
}

function runCmd(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "ignore" });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

function runFfmpegToMp3(aiff: string, mp3: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = ffmpegBinary();
    const p = spawn(
      ff,
      ["-y", "-i", aiff, "-codec:a", "libmp3lame", "-q:a", "4", mp3],
      { stdio: "ignore" },
    );
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg AIFF→MP3 failed: ${code}`));
    });
  });
}
