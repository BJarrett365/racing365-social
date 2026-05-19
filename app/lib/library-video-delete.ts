import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { outputDir } from "@/app/lib/paths";

const VIDEO_MP4 = /\.mp4$/i;
const CAMERA_RECORD = /^camera-record\.(webm|mp4)$/i;

/**
 * Rel paths under `output/` that the library duplicate scanner may touch:
 * - `video/*.mp4` (folder scan)
 * - `uploads/<cid>/custom-bg.mp4`, `uploads/<cid>/camera-record.webm|mp4`
 */
export function validateLibraryVideoRel(rel: string): boolean {
  const cleaned = rel.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("..")) return false;
  const parts = cleaned.split("/").filter(Boolean);

  if (parts[0] === "video") {
    if (parts.length !== 2) return false;
    const file = parts[1];
    if (!file || file.includes("..")) return false;
    return VIDEO_MP4.test(file);
  }

  if (parts[0] === "uploads") {
    if (parts.length !== 3) return false;
    const cid = parts[1];
    const file = parts[2];
    if (!cid || cid.includes("..") || !file || file.includes("..")) return false;
    if (file === "custom-bg.mp4") return true;
    return CAMERA_RECORD.test(file);
  }

  return false;
}

function resolveLibraryVideoAbs(rel: string): string | null {
  if (!validateLibraryVideoRel(rel)) return null;
  const root = path.resolve(outputDir());
  const normalized = rel.replace(/\\/g, "/");
  const full = path.resolve(root, ...normalized.split("/"));
  const rootSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (full !== root && !full.startsWith(rootSep)) return null;
  return full;
}

async function readLibraryVideoBytes(rel: string): Promise<Buffer | null> {
  const abs = resolveLibraryVideoAbs(rel);
  if (!abs) return null;
  try {
    return await fs.readFile(abs);
  } catch {
    return null;
  }
}

export async function getLibraryVideoMtimeMs(rel: string): Promise<number> {
  const abs = resolveLibraryVideoAbs(rel);
  if (!abs) return 0;
  try {
    const st = await fs.stat(abs);
    return st.mtimeMs;
  } catch {
    return 0;
  }
}

/** Removes one library video file from disk (does not touch manifest). */
export async function deleteLibraryVideoByRel(rel: string): Promise<boolean> {
  if (!validateLibraryVideoRel(rel)) return false;
  const abs = resolveLibraryVideoAbs(rel);
  if (!abs) return false;
  try {
    await fs.unlink(abs);
    return true;
  } catch {
    return false;
  }
}

/**
 * Within `rels`, detect identical videos by SHA-256 of file bytes.
 * Keeps the newest (mtime) copy per hash; deletes older duplicates.
 */
export async function dedupeLibraryVideos(rels: string[]): Promise<{
  deleted: string[];
  duplicateGroups: number;
}> {
  const unique = [...new Set(rels)].filter(validateLibraryVideoRel);
  const rows: { rel: string; hash: string; mtimeMs: number }[] = [];

  for (const rel of unique) {
    const bytes = await readLibraryVideoBytes(rel);
    if (!bytes) continue;
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    const mtimeMs = await getLibraryVideoMtimeMs(rel);
    rows.push({ rel, hash, mtimeMs });
  }

  const byHash = new Map<string, typeof rows>();
  for (const row of rows) {
    const arr = byHash.get(row.hash) ?? [];
    arr.push(row);
    byHash.set(row.hash, arr);
  }

  const deleted: string[] = [];
  let duplicateGroups = 0;

  for (const group of byHash.values()) {
    if (group.length < 2) continue;
    duplicateGroups += 1;
    group.sort((a, b) => b.mtimeMs - a.mtimeMs || a.rel.localeCompare(b.rel));
    const [, ...dupes] = group;
    for (const d of dupes) {
      if (await deleteLibraryVideoByRel(d.rel)) deleted.push(d.rel);
    }
  }

  return { deleted, duplicateGroups };
}
