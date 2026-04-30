import fs from "fs";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import { LIVE_SESSIONS_FILE, LIVE_CONTROL_DATA_DIR } from "@/features/live-control/lib/constants";
import type { LiveControlStoreV1, PlexaLiveSession } from "@/features/live-control/types/live-session";

function ensureDir() {
  fs.mkdirSync(LIVE_CONTROL_DATA_DIR, { recursive: true });
}

function emptyStore(): LiveControlStoreV1 {
  return { version: 1, sessions: {} };
}

const BLOB_STORE_NAME = "plexa-live-control";
const BLOB_STORE_KEY = "live-control-sessions.json";

export function readLiveControlStore(): LiveControlStoreV1 {
  try {
    const raw = fs.readFileSync(LIVE_SESSIONS_FILE, "utf-8");
    const j = JSON.parse(raw) as LiveControlStoreV1;
    if (!j.sessions || typeof j.sessions !== "object") return emptyStore();
    return j;
  } catch {
    return emptyStore();
  }
}

export async function readLiveControlStoreAsync(): Promise<LiveControlStoreV1> {
  if (shouldUseNetlifyBlobStore()) {
    const data = await readJsonBlob<LiveControlStoreV1>(BLOB_STORE_NAME, BLOB_STORE_KEY);
    return data?.sessions && typeof data.sessions === "object" ? data : emptyStore();
  }

  return readLiveControlStore();
}

function writeStore(store: LiveControlStoreV1): void {
  ensureDir();
  fs.writeFileSync(LIVE_SESSIONS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function writeStoreAsync(store: LiveControlStoreV1): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_STORE_KEY, store);
    return;
  }

  writeStore(store);
}

export function listSessions(): PlexaLiveSession[] {
  const s = readLiveControlStore();
  return Object.values(s.sessions).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listSessionsAsync(): Promise<PlexaLiveSession[]> {
  const s = await readLiveControlStoreAsync();
  return Object.values(s.sessions).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getSession(id: string): PlexaLiveSession | null {
  const s = readLiveControlStore();
  return s.sessions[id] ?? null;
}

export async function getSessionAsync(id: string): Promise<PlexaLiveSession | null> {
  const s = await readLiveControlStoreAsync();
  return s.sessions[id] ?? null;
}

export function findSessionByMuxLiveStreamId(muxLiveStreamId: string): PlexaLiveSession | null {
  const s = readLiveControlStore();
  for (const row of Object.values(s.sessions)) {
    if (row.muxLiveStreamId === muxLiveStreamId) return row;
  }
  return null;
}

export async function findSessionByMuxLiveStreamIdAsync(muxLiveStreamId: string): Promise<PlexaLiveSession | null> {
  const s = await readLiveControlStoreAsync();
  for (const row of Object.values(s.sessions)) {
    if (row.muxLiveStreamId === muxLiveStreamId) return row;
  }
  return null;
}

export function upsertSession(row: PlexaLiveSession): void {
  const store = readLiveControlStore();
  store.sessions[row.id] = row;
  writeStore(store);
}

export async function upsertSessionAsync(row: PlexaLiveSession): Promise<void> {
  const store = await readLiveControlStoreAsync();
  store.sessions[row.id] = row;
  await writeStoreAsync(store);
}

export function deleteSession(id: string): boolean {
  const store = readLiveControlStore();
  if (!store.sessions[id]) return false;
  delete store.sessions[id];
  writeStore(store);
  return true;
}

export async function deleteSessionAsync(id: string): Promise<boolean> {
  const store = await readLiveControlStoreAsync();
  if (!store.sessions[id]) return false;
  delete store.sessions[id];
  await writeStoreAsync(store);
  return true;
}
