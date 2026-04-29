import fs from "fs";
import type { MuxLiveStreamData } from "@/features/live-control/services/mux-live-api";
import { LIVE_CONTROL_DATA_DIR, MUX_PROVIDER_STREAMS_FILE } from "@/features/live-control/lib/constants";
import { muxLiveDataToSnapshot } from "@/features/live-control/services/mux-provider-service";

export type StoredMuxStream = {
  muxLiveStreamId: string;
  streamKey: string;
  playbackId: string | null;
  playbackUrl: string | null;
  rtmpIngestUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type MuxProviderStoreV1 = { version: 1; streams: Record<string, StoredMuxStream> };

function ensureDir() {
  fs.mkdirSync(LIVE_CONTROL_DATA_DIR, { recursive: true });
}

function emptyStore(): MuxProviderStoreV1 {
  return { version: 1, streams: {} };
}

function readStore(): MuxProviderStoreV1 {
  try {
    const raw = fs.readFileSync(MUX_PROVIDER_STREAMS_FILE, "utf-8");
    const j = JSON.parse(raw) as MuxProviderStoreV1;
    if (!j.streams || typeof j.streams !== "object") return emptyStore();
    return j;
  } catch {
    return emptyStore();
  }
}

function writeStore(store: MuxProviderStoreV1): void {
  ensureDir();
  fs.writeFileSync(MUX_PROVIDER_STREAMS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function nowIso(): string {
  return new Date().toISOString();
}

export function getMuxStreamRecord(muxLiveStreamId: string): StoredMuxStream | null {
  return readStore().streams[muxLiveStreamId] ?? null;
}

export function listMuxStreamRecords(): StoredMuxStream[] {
  const s = readStore();
  return Object.values(s.streams).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function upsertMuxStreamFromLiveData(data: MuxLiveStreamData): StoredMuxStream {
  const snap = muxLiveDataToSnapshot(data);
  const ts = nowIso();
  const store = readStore();
  const existing = store.streams[data.id];
  const row: StoredMuxStream = {
    muxLiveStreamId: data.id,
    streamKey: snap.streamKey,
    playbackId: snap.playbackId,
    playbackUrl: snap.playbackUrl,
    rtmpIngestUrl: snap.rtmpIngestUrl,
    status: snap.status,
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
  };
  store.streams[data.id] = row;
  writeStore(store);
  return row;
}

/** Webhook-driven status patch when we already have a stored stream. */
export function patchMuxStreamRecordFromWebhook(
  muxLiveStreamId: string,
  patch: { status?: string },
): StoredMuxStream | null {
  const cur = getMuxStreamRecord(muxLiveStreamId);
  if (!cur) return null;
  const ts = nowIso();
  const next: StoredMuxStream = {
    ...cur,
    status: patch.status ?? cur.status,
    updatedAt: ts,
  };
  const store = readStore();
  store.streams[muxLiveStreamId] = next;
  writeStore(store);
  return next;
}
