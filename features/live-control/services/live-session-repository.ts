import fs from "fs";
import { LIVE_SESSIONS_FILE, LIVE_CONTROL_DATA_DIR } from "@/features/live-control/lib/constants";
import type { LiveControlStoreV1, PlexaLiveSession } from "@/features/live-control/types/live-session";

function ensureDir() {
  fs.mkdirSync(LIVE_CONTROL_DATA_DIR, { recursive: true });
}

function emptyStore(): LiveControlStoreV1 {
  return { version: 1, sessions: {} };
}

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

function writeStore(store: LiveControlStoreV1): void {
  ensureDir();
  fs.writeFileSync(LIVE_SESSIONS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function listSessions(): PlexaLiveSession[] {
  const s = readLiveControlStore();
  return Object.values(s.sessions).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getSession(id: string): PlexaLiveSession | null {
  const s = readLiveControlStore();
  return s.sessions[id] ?? null;
}

export function findSessionByMuxLiveStreamId(muxLiveStreamId: string): PlexaLiveSession | null {
  const s = readLiveControlStore();
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

export function deleteSession(id: string): boolean {
  const store = readLiveControlStore();
  if (!store.sessions[id]) return false;
  delete store.sessions[id];
  writeStore(store);
  return true;
}
