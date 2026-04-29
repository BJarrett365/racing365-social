import fs from "fs/promises";
import type { Dirent } from "fs";
import path from "path";
import { outputDir } from "@/app/lib/paths";

const MUSIC_EXTS = new Set([".mp3", ".wav", ".m4a", ".aac"]);

async function listFilesRecursive(absDir: string, relPrefix: string, out: string[]) {
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const abs = path.join(absDir, e.name);
    const rel = path.join(relPrefix, e.name).split(path.sep).join("/");
    if (e.isDirectory()) {
      await listFilesRecursive(abs, rel, out);
      continue;
    }
    if (!e.isFile()) continue;
    if (MUSIC_EXTS.has(path.extname(e.name).toLowerCase())) {
      out.push(rel);
    }
  }
}

/**
 * Relative music paths under `output/` for Backing Music picker.
 */
export async function scanMusicAssetRels(): Promise<string[]> {
  const root = outputDir();
  const out: string[] = [];
  await listFilesRecursive(path.join(root, "library", "music"), path.join("library", "music"), out);
  await listFilesRecursive(path.join(root, "generated"), "generated", out);
  await listFilesRecursive(path.join(root, "uploads"), "uploads", out);
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

