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

function warnBlobIssue(operation: string, rel: string | null, error: unknown) {
  console.warn("[library-blob-assets]", operation, {
    rel,
    message: error instanceof Error ? error.message : String(error),
  });
}

function blobListMtimeMs(blob: unknown): number {
  if (!blob || typeof blob !== "object") return 0;
  const uploadedAt = (blob as { uploadedAt?: unknown }).uploadedAt;
  if (typeof uploadedAt === "string") {
    const parsed = Date.parse(uploadedAt);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (uploadedAt instanceof Date) return uploadedAt.getTime();
  return 0;
}

export function isLibraryBlobAssetRel(rel: string): boolean {
  return normaliseRel(rel) !== null;
}

export async function writeLibraryBlobAsset(rel: string, bytes: Buffer, contentType: string): Promise<void> {
  if (!shouldUseNetlifyBlobStore()) return;
  const key = normaliseRel(rel);
  if (!key) return;
  try {
    await getStore(BLOB_STORE_NAME).set(key, bufferToArrayBuffer(bytes), {
      metadata: {
        contentType: contentType || "application/octet-stream",
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    warnBlobIssue("write failed", key, error);
    throw error;
  }
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
  } catch (error) {
    warnBlobIssue("read failed", key, error);
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
  } catch (error) {
    warnBlobIssue("delete failed", key, error);
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
  } catch (error) {
    warnBlobIssue("metadata failed", key, error);
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
        out.push({ rel: key, mtimeMs: blobListMtimeMs(blob) });
      }
    }
    return out;
  } catch (error) {
    warnBlobIssue("list failed", LIBRARY_IMAGE_PREFIX, error);
    return [];
  }
}

export async function getLibraryBlobAssetDiagnostics(): Promise<{
  enabled: boolean;
  store: string;
  prefix: string;
  count?: number;
  error?: string;
}> {
  const enabled = shouldUseNetlifyBlobStore();
  if (!enabled) return { enabled, store: BLOB_STORE_NAME, prefix: LIBRARY_IMAGE_PREFIX, count: 0 };
  try {
    const items = await listLibraryBlobAssetRels();
    return { enabled, store: BLOB_STORE_NAME, prefix: LIBRARY_IMAGE_PREFIX, count: items.length };
  } catch (error) {
    return {
      enabled,
      store: BLOB_STORE_NAME,
      prefix: LIBRARY_IMAGE_PREFIX,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
