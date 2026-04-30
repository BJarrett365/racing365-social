import { getStore } from "@netlify/blobs";

export function shouldUseNetlifyBlobStore(): boolean {
  return process.env.NETLIFY === "true" || Boolean(process.env.NETLIFY_BLOBS_CONTEXT);
}

export async function readJsonBlob<T>(storeName: string, key: string): Promise<T | null> {
  if (!shouldUseNetlifyBlobStore()) return null;
  try {
    return (await getStore(storeName).get(key, { type: "json" })) as T | null;
  } catch {
    return null;
  }
}

export async function writeJsonBlob<T>(storeName: string, key: string, data: T): Promise<void> {
  await getStore(storeName).setJSON(key, data);
}
