import { getStore } from "@netlify/blobs";
import { hasNetlifyBlobExecutionContext, isNetlifyHostedLambdaRuntime } from "@/app/lib/netlify-hosted-runtime";

/**
 * Persist JSON / library assets via Netlify Blobs on hosted SSR, not only when `NETLIFY=true`
 * (mostly build-only) but also Lambda + `SITE_ID`, or blobs context on global/env.
 */
export function shouldUseNetlifyBlobStore(): boolean {
  return hasNetlifyBlobExecutionContext() || isNetlifyHostedLambdaRuntime();
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
  if (!shouldUseNetlifyBlobStore()) return;
  try {
    await getStore(storeName).setJSON(key, data);
  } catch (error) {
    console.error("[netlify-blob-json] write failed", {
      storeName,
      key,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
