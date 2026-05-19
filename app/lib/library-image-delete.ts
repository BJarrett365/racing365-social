import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import {
  deleteLibraryBlobAsset,
  getLibraryBlobAssetMtimeMs,
  isLibraryBlobAssetRel,
  readLibraryBlobAsset,
} from "@/app/lib/library-blob-assets";
import { shouldUseNetlifyBlobStore } from "@/app/lib/netlify-blob-json";
import { outputDir } from "@/app/lib/paths";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

/** Rel paths listed by Library (disk under output/ or Netlify blobs `images/library/…`). */
export function validateLibraryImageRel(rel: string): boolean {
  const cleaned = rel.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("..")) return false;
  const parts = cleaned.split("/").filter(Boolean);

  if (parts[0] === "images" && parts[1] === "library") {
    if (parts.length !== 4) return false;
    const cid = parts[2];
    const file = parts[3];
    if (!cid || cid.includes("..")) return false;
    return IMAGE_EXT.test(file);
  }

  if (parts[0] === "uploads") {
    if (parts.length !== 3) return false;
    const cid = parts[1];
    const file = parts[2];
    if (!cid || cid.includes("..")) return false;
    if (file === "custom-bg-video-frame.png") return false;
    if (!/^custom-bg/i.test(file)) return false;
    return IMAGE_EXT.test(file);
  }

  return false;
}

function resolveLibraryImageAbs(rel: string): string | null {
  if (!validateLibraryImageRel(rel)) return null;
  const root = path.resolve(outputDir());
  const normalized = rel.replace(/\\/g, "/");
  const full = path.resolve(root, ...normalized.split("/"));
  const rootSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (full !== root && !full.startsWith(rootSep)) return null;
  return full;
}

async function readLibraryImageBytes(rel: string): Promise<Buffer | null> {
  if (!validateLibraryImageRel(rel)) return null;
  if (shouldUseNetlifyBlobStore() && isLibraryBlobAssetRel(rel)) {
    const asset = await readLibraryBlobAsset(rel);
    return asset?.bytes ?? null;
  }
  const abs = resolveLibraryImageAbs(rel);
  if (!abs) return null;
  try {
    return await fs.readFile(abs);
  } catch {
    return null;
  }
}

export async function getLibraryImageMtimeMs(rel: string): Promise<number> {
  if (!validateLibraryImageRel(rel)) return 0;
  if (shouldUseNetlifyBlobStore() && isLibraryBlobAssetRel(rel)) {
    return getLibraryBlobAssetMtimeMs(rel);
  }
  const abs = resolveLibraryImageAbs(rel);
  if (!abs) return 0;
  try {
    const st = await fs.stat(abs);
    return st.mtimeMs;
  } catch {
    return 0;
  }
}

/** Removes one library image file from disk or blob store (does not touch manifest). */
export async function deleteLibraryImageByRel(rel: string): Promise<boolean> {
  if (!validateLibraryImageRel(rel)) return false;
  if (shouldUseNetlifyBlobStore() && isLibraryBlobAssetRel(rel)) {
    return deleteLibraryBlobAsset(rel);
  }
  const abs = resolveLibraryImageAbs(rel);
  if (!abs) return false;
  try {
    await fs.unlink(abs);
    return true;
  } catch {
    return false;
  }
}

export async function deleteLibraryImagesMany(rels: string[]): Promise<string[]> {
  const deleted: string[] = [];
  for (const rel of [...new Set(rels)]) {
    if (!validateLibraryImageRel(rel)) continue;
    if (await deleteLibraryImageByRel(rel)) deleted.push(rel);
  }
  return deleted;
}

/**
 * Within `rels`, detect identical images by SHA-256 of file bytes.
 * Keeps the newest (mtime) copy per hash; deletes older duplicates.
 */
export async function dedupeLibraryImages(rels: string[]): Promise<{
  deleted: string[];
  duplicateGroups: number;
}> {
  const unique = [...new Set(rels)].filter(validateLibraryImageRel);
  const rows: { rel: string; hash: string; mtimeMs: number }[] = [];

  for (const rel of unique) {
    const bytes = await readLibraryImageBytes(rel);
    if (!bytes) continue;
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    const mtimeMs = await getLibraryImageMtimeMs(rel);
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
      if (await deleteLibraryImageByRel(d.rel)) deleted.push(d.rel);
    }
  }

  return { deleted, duplicateGroups };
}
