import path from "path";
import { getStore } from "@netlify/blobs";
import { shouldUseNetlifyBlobStore } from "@/app/lib/netlify-blob-json";

const BLOB_STORE_NAME = "plexa-library-assets";
const LIBRARY_IMAGE_PREFIX = "images/library/";

export type LibraryBlobAsset = {
  rel: string;
  bytes: Buffer;
  contentType: string;
};

export type LibraryBlobAssetListItem = {
  rel: string;
  mtimeMs: number;
};

function normaliseRel(rel: string): string | null {
  const cleaned = rel.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("..") || path.isAbsolute(cleaned)) return null;
  if (!cleaned.startsWith(LIBRARY_IMAGE_PREFIX)) return null;
  return cleaned;
}

function bufferToArrayBuffer(bytes: Buffer): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function isLibraryBlobAssetRel(rel: string): boolean {
  return normaliseRel(rel) !== null;
}

export async function writeLibraryBlobAsset(rel: string, bytes: Buffer, contentType: string): Promise<void> {
  if (!shouldUseNetlifyBlobStore()) return;
  const key = normaliseRel(rel);
  if (!key) return;
  await getStore(BLOB_STORE_NAME).set(key, bufferToArrayBuffer(bytes), {
    metadata: {
      contentType: contentType || "application/octet-stream",
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function readLibraryBlobAsset(rel: string): Promise<LibraryBlobAsset | null> {
  if (!shouldUseNetlifyBlobStore()) return null;
  const key = normaliseRel(rel);
  if (!key) return null;
  try {
    const result = await getStore(BLOB_STORE_NAME).getWithMetadata(key, { type: "arrayBuffer" });
    if (!result) return null;
    return {
      rel: key,
      bytes: Buffer.from(result.data),
      contentType:
        typeof result.metadata?.contentType === "string"
          ? result.metadata.contentType
          : "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function deleteLibraryBlobAsset(rel: string): Promise<boolean> {
  if (!shouldUseNetlifyBlobStore()) return false;
  const key = normaliseRel(rel);
  if (!key) return false;
  try {
    await getStore(BLOB_STORE_NAME).delete(key);
    return true;
  } catch {
    return false;
  }
}

export async function getLibraryBlobAssetMtimeMs(rel: string): Promise<number> {
  if (!shouldUseNetlifyBlobStore()) return 0;
  const key = normaliseRel(rel);
  if (!key) return 0;
  try {
    const metadata = await getStore(BLOB_STORE_NAME).getMetadata(key);
    const updatedAt =
      typeof metadata?.metadata?.updatedAt === "string" ? Date.parse(metadata.metadata.updatedAt) : NaN;
    return Number.isFinite(updatedAt) ? updatedAt : 0;
  } catch {
    return 0;
  }
}

export async function listLibraryBlobAssetRels(): Promise<LibraryBlobAssetListItem[]> {
  if (!shouldUseNetlifyBlobStore()) return [];
  try {
    const store = getStore(BLOB_STORE_NAME);
    const out: LibraryBlobAssetListItem[] = [];
    for await (const page of store.list({ prefix: LIBRARY_IMAGE_PREFIX, paginate: true })) {
      for (const blob of page.blobs) {
        const key = normaliseRel(blob.key);
        if (!key) continue;
        const metadata = await store.getMetadata(key).catch(() => null);
        const updatedAt =
          typeof metadata?.metadata?.updatedAt === "string" ? metadata.metadata.updatedAt : "";
        out.push({ rel: key, mtimeMs: Date.parse(updatedAt) || 0 });
      }
    }
    return out;
  } catch {
    return [];
  }
}
