import fs from "fs";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import { RESTREAM_TOKENS_FILE, LIVE_CONTROL_DATA_DIR } from "@/features/live-control/lib/constants";

export type RestreamStoredTokens = {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when access token expires (best-effort). */
  accessExpiresAtMs?: number;
  updatedAt: string;
};
const BLOB_STORE_NAME = "plexa-live-control";
const BLOB_STORE_KEY = "restream-oauth-tokens.json";

function ensureDir() {
  fs.mkdirSync(LIVE_CONTROL_DATA_DIR, { recursive: true });
}

export function readRestreamTokens(): RestreamStoredTokens | null {
  try {
    const raw = fs.readFileSync(RESTREAM_TOKENS_FILE, "utf-8");
    const j = JSON.parse(raw) as RestreamStoredTokens;
    if (!j.accessToken || !j.refreshToken) return null;
    return j;
  } catch {
    return null;
  }
}

export async function readRestreamTokensAsync(): Promise<RestreamStoredTokens | null> {
  if (shouldUseNetlifyBlobStore()) {
    const j = await readJsonBlob<RestreamStoredTokens>(BLOB_STORE_NAME, BLOB_STORE_KEY);
    if (!j?.accessToken || !j.refreshToken) return null;
    return j;
  }

  return readRestreamTokens();
}

export function writeRestreamTokens(next: RestreamStoredTokens): void {
  ensureDir();
  fs.writeFileSync(RESTREAM_TOKENS_FILE, JSON.stringify(next, null, 2), "utf-8");
}

export async function writeRestreamTokensAsync(next: RestreamStoredTokens): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_STORE_KEY, next);
    return;
  }

  writeRestreamTokens(next);
}

export function clearRestreamTokens(): void {
  try {
    fs.unlinkSync(RESTREAM_TOKENS_FILE);
  } catch {
    /* noop */
  }
}
