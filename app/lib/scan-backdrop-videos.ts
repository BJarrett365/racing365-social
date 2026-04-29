import fs from "fs/promises";
import path from "path";
import { outputDir } from "@/app/lib/paths";

const CAMERA_EXTS = [".webm", ".mp4"] as const;

/** Relative paths under `output/`: Runway/editor `custom-bg.mp4` and News Shorts `camera-record.*`. */
export async function scanBackdropVideoRels(): Promise<string[]> {
  const uploadsRoot = path.join(outputDir(), "uploads");
  const out: { rel: string; mtimeMs: number }[] = [];
  try {
    const dirs = await fs.readdir(uploadsRoot, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const cid = d.name;
      if (cid.includes("..") || cid.includes("/") || cid.includes("\\")) continue;
      const dir = path.join(uploadsRoot, cid);
      const mp4 = path.join(dir, "custom-bg.mp4");
      try {
        const st = await fs.stat(mp4);
        out.push({ rel: path.join("uploads", cid, "custom-bg.mp4").split(path.sep).join("/"), mtimeMs: st.mtimeMs });
      } catch {
        /* no Runway backdrop */
      }
      for (const ext of CAMERA_EXTS) {
        const cam = path.join(dir, `camera-record${ext}`);
        try {
          const st = await fs.stat(cam);
          out.push({ rel: path.join("uploads", cid, `camera-record${ext}`).split(path.sep).join("/"), mtimeMs: st.mtimeMs });
        } catch {
          /* no camera clip with this extension */
        }
      }
    }
  } catch {
    /* uploads missing */
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs || a.rel.localeCompare(b.rel));
  return out.map((item) => item.rel);
}
