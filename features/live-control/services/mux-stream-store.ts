import fs from "fs";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
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
const BLOB_STORE_NAME = "plexa-live-control";
const BLOB_STORE_KEY = "mux-provider-streams.json";

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

async function readStoreAsync(): Promise<MuxProviderStoreV1> {
  if (shouldUseNetlifyBlobStore()) {
    const data = await readJsonBlob<MuxProviderStoreV1>(BLOB_STORE_NAME, BLOB_STORE_KEY);
    return data?.streams && typeof data.streams === "object" ? data : emptyStore();
  }

  return readStore();
}

function writeStore(store: MuxProviderStoreV1): void {
  ensureDir();
  fs.writeFileSync(MUX_PROVIDER_STREAMS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function writeStoreAsync(store: MuxProviderStoreV1): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_STORE_KEY, store);
    return;
  }

  writeStore(store);
}

function nowIso(): string {
  return new Date().toISOString();
}

export function getMuxStreamRecord(muxLiveStreamId: string): StoredMuxStream | null {
  return readStore().streams[muxLiveStreamId] ?? null;
}

export async function getMuxStreamRecordAsync(muxLiveStreamId: string): Promise<StoredMuxStream | null> {
  return (await readStoreAsync()).streams[muxLiveStreamId] ?? null;
}

export function listMuxStreamRecords(): StoredMuxStream[] {
  const s = readStore();
  return Object.values(s.streams).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listMuxStreamRecordsAsync(): Promise<StoredMuxStream[]> {
  const s = await readStoreAsync();
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

export async function upsertMuxStreamFromLiveDataAsync(data: MuxLiveStreamData): Promise<StoredMuxStream> {
  const snap = muxLiveDataToSnapshot(data);
  const ts = nowIso();
  const store = await readStoreAsync();
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
  await writeStoreAsync(store);
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

export async function patchMuxStreamRecordFromWebhookAsync(
  muxLiveStreamId: string,
  patch: { status?: string },
): Promise<StoredMuxStream | null> {
  const store = await readStoreAsync();
  const cur = store.streams[muxLiveStreamId];
  if (!cur) return null;
  const next: StoredMuxStream = {
    ...cur,
    status: patch.status ?? cur.status,
    updatedAt: nowIso(),
  };
  store.streams[muxLiveStreamId] = next;
  await writeStoreAsync(store);
  return next;
}
