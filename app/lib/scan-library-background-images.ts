import fs from "fs/promises";
import path from "path";
import { outputDir } from "@/app/lib/paths";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

/** Relative paths under `output/`: `images/library/…` (new) and legacy `uploads/…/custom-bg*.{png,…}`. */
export async function scanLibraryBackgroundImageRels(): Promise<string[]> {
  const out: { rel: string; mtimeMs: number }[] = [];
  const seen = new Set<string>();

  const libRoot = path.join(outputDir(), "images", "library");
  try {
    const dirs = await fs.readdir(libRoot, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const cid = d.name;
      if (cid.includes("..") || cid.includes("/") || cid.includes("\\")) continue;
      const dir = path.join(libRoot, cid);
      let files: string[];
      try {
        files = await fs.readdir(dir);
      } catch {
        continue;
      }
      for (const f of files) {
        if (!IMAGE_EXT.test(f)) continue;
        const rel = path.join("images", "library", cid, f).split(path.sep).join("/");
        const st = await fs.stat(path.join(dir, f));
        seen.add(rel);
        out.push({ rel, mtimeMs: st.mtimeMs });
      }
    }
  } catch {
    /* images/library missing */
  }

  const uploadsRoot = path.join(outputDir(), "uploads");
  try {
    const dirs = await fs.readdir(uploadsRoot, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const cid = d.name;
      if (cid.includes("..") || cid.includes("/") || cid.includes("\\")) continue;
      const dir = path.join(uploadsRoot, cid);
      let files: string[];
      try {
        files = await fs.readdir(dir);
      } catch {
        continue;
      }
      for (const f of files) {
        if (!IMAGE_EXT.test(f)) continue;
        if (f === "custom-bg-video-frame.png") continue;
        if (!/^custom-bg/i.test(f)) continue;
        const rel = path.join("uploads", cid, f).split(path.sep).join("/");
        if (seen.has(rel)) continue;
        const st = await fs.stat(path.join(dir, f));
        seen.add(rel);
        out.push({ rel, mtimeMs: st.mtimeMs });
      }
    }
  } catch {
    /* uploads missing */
  }

  out.sort((a, b) => b.mtimeMs - a.mtimeMs || a.rel.localeCompare(b.rel));
  return out.map((item) => item.rel);
}
