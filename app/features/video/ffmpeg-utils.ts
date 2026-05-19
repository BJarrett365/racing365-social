import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";
import ffmpegStatic from "ffmpeg-static";
import { getServerSecret } from "@/app/lib/server-secrets";

/**
 * Resolution order: FFMPEG_PATH → `command -v` (augmented PATH) → common install paths
 * → bundled `ffmpeg-static` (npm) → bare "ffmpeg".
 * GUI-launched Node often lacks Homebrew on PATH; the bundled binary avoids ENOENT.
 */
const FALLBACK_PATHS = [
  "/opt/homebrew/bin/ffmpeg", // Apple Silicon Homebrew
  "/usr/local/bin/ffmpeg", // Intel Homebrew / some installs
  "/opt/local/bin/ffmpeg", // MacPorts
  "/usr/bin/ffmpeg", // Linux / some macOS
];

let cachedBin: string | null = null;

function augmentedPathEnv(): string {
  const extra = ["/opt/homebrew/bin", "/usr/local/bin", "/opt/local/bin", "/usr/bin"];
  return [...extra, process.env.PATH ?? ""].filter(Boolean).join(path.delimiter);
}

/** Find ffmpeg the same way a login shell would, after prepending standard install dirs */
function resolveViaCommandV(): string | null {
  if (process.platform === "win32") {
    const r = spawnSync("where.exe", ["ffmpeg"], {
      encoding: "utf-8",
      env: { ...process.env, PATH: augmentedPathEnv() },
      windowsHide: true,
    });
    const line = r.stdout?.split(/\r?\n/).find((l) => l.trim());
    if (line && fs.existsSync(line.trim())) return line.trim();
    return null;
  }

  const r = spawnSync("sh", ["-c", "command -v ffmpeg"], {
    encoding: "utf-8",
    env: { ...process.env, PATH: augmentedPathEnv() },
  });
  if (r.error || r.status !== 0) return null;
  const found = r.stdout?.trim();
  if (!found) return null;
  return fs.existsSync(found) ? found : null;
}

export function ffmpegBinary(): string {
  if (cachedBin) return cachedBin;

  const fromEnv = getServerSecret("FFMPEG_PATH")?.trim();
  if (fromEnv) {
    if (path.isAbsolute(fromEnv) && fs.existsSync(fromEnv)) {
      cachedBin = fromEnv;
      return cachedBin;
    }
    if (!path.isAbsolute(fromEnv) && fromEnv !== "ffmpeg") {
      cachedBin = fromEnv;
      return cachedBin;
    }
  }

  const viaShell = resolveViaCommandV();
  if (viaShell) {
    cachedBin = viaShell;
    return cachedBin;
  }

  for (const p of FALLBACK_PATHS) {
    if (fs.existsSync(p)) {
      cachedBin = p;
      return cachedBin;
    }
  }

  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    cachedBin = ffmpegStatic;
    return cachedBin;
  }

  cachedBin = "ffmpeg";
  return cachedBin;
}

/** Clear cache (e.g. tests) */
export function resetFfmpegBinaryCache() {
  cachedBin = null;
}

/**
 * libx264 tuning for MP4 exports: faster than the default `medium` preset; `+faststart` moves the moov atom
 * so players can begin playback sooner (better perceived load time).
 */
export const FFMPEG_LIBX264_MP4_ARGS = [
  "-c:v",
  "libx264",
  "-preset",
  "fast",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
] as const;

const DURATION_RE = /Duration:\s*(\d+):(\d+):(\d+\.?\d*)/;

/**
 * Media duration in seconds via `ffmpeg -i` (works with bundled ffmpeg-static; no ffprobe required).
 */
export function probeMediaDurationSec(filePath: string): Promise<number> {
  const bin = ffmpegBinary();
  return new Promise((resolve, reject) => {
    const p = spawn(bin, ["-hide_banner", "-nostdin", "-i", filePath, "-f", "null", "-"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    p.stderr?.on("data", (c) => {
      err += c.toString();
    });
    p.on("error", reject);
    p.on("close", () => {
      const m = err.match(DURATION_RE);
      if (!m) {
        reject(new Error("Could not read media duration (ffmpeg -i parse failed)"));
        return;
      }
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const sec = parseFloat(m[3]);
      const total = h * 3600 + min * 60 + sec;
      if (!Number.isFinite(total) || total <= 0) {
        reject(new Error("Invalid parsed duration"));
        return;
      }
      resolve(total);
    });
  });
}

/** True if ffmpeg reports an audio stream (e.g. camera clip with mic). */
export function probeHasAudioStream(filePath: string): Promise<boolean> {
  const bin = ffmpegBinary();
  return new Promise((resolve) => {
    const p = spawn(bin, ["-hide_banner", "-nostdin", "-i", filePath, "-f", "null", "-"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    p.stderr?.on("data", (c) => {
      err += c.toString();
    });
    p.on("error", () => resolve(false));
    p.on("close", () => {
      resolve(/Stream\s+#\d+:\d+(?:\([^)]*\))?:\s*Audio/i.test(err));
    });
  });
}
