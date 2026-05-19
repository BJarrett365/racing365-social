import path from "path";
import fs from "fs/promises";
import { scanBackdropVideoRels } from "@/app/lib/scan-backdrop-videos";
import { outputVideoDir } from "@/app/lib/paths";

/** All video rel paths the library treats as managed files (folder scan + backdrop uploads). */
export async function scanLibraryVideoRels(): Promise<string[]> {
  const backdrop = await scanBackdropVideoRels();
  const folder: string[] = [];
  try {
    const dir = outputVideoDir();
    const files = await fs.readdir(dir);
    for (const f of files) {
      if (!f.endsWith(".mp4")) continue;
      folder.push(path.join("video", f).split(path.sep).join("/"));
    }
  } catch {
    /* output/video missing */
  }
  return [...new Set([...backdrop, ...folder])].sort((a, b) => a.localeCompare(b));
}
