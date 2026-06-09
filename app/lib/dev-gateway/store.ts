import "server-only";

import fs from "fs/promises";
import path from "path";
import { localJsonStorePath } from "@/app/lib/local-json-store-dir";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import type { ReleaseCheckResult } from "@/app/lib/dev-gateway/release-check";

type SavedReleaseRecordType = "release_note" | "qa_finding";
export type DevGatewayDevNote = {
  id: string;
  title: string;
  content: string;
  source: "dev_gateway";
  mode: string;
  createdBy: string;
  createdAt: string;
  linkedFiles: string[];
  status: "draft" | "approved" | "rejected";
};

export type DevGatewayRdEvidence = {
  id: string;
  title: string;
  content: string;
  source: "dev_gateway";
  mode: string;
  createdBy: string;
  createdAt: string;
  linkedFiles: string[];
};

export type SavedReleaseRecord = {
  id: string;
  type: SavedReleaseRecordType;
  title: string;
  input: string;
  result: ReleaseCheckResult;
  createdAt: string;
};

type DevGatewayStore = {
  records: SavedReleaseRecord[];
  devNotes: DevGatewayDevNote[];
  rdEvidence: DevGatewayRdEvidence[];
};

const BLOB_STORE_NAME = "plexa-dev-gateway";
const BLOB_KEY = "release-check-records.json";

function storeFile(): string {
  return localJsonStorePath("dev-gateway-release-checks.json");
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStore(value: unknown): DevGatewayStore {
  const row = value && typeof value === "object" ? (value as Partial<DevGatewayStore>) : {};
  return {
    records: Array.isArray(row.records) ? row.records : [],
    devNotes: Array.isArray(row.devNotes) ? row.devNotes : [],
    rdEvidence: Array.isArray(row.rdEvidence) ? row.rdEvidence : [],
  };
}

export async function readDevGatewayStore(): Promise<DevGatewayStore> {
  if (shouldUseNetlifyBlobStore()) {
    const data = await readJsonBlob<unknown>(BLOB_STORE_NAME, BLOB_KEY);
    return normalizeStore(data);
  }
  try {
    const raw = await fs.readFile(storeFile(), "utf8");
    return normalizeStore(JSON.parse(raw) as unknown);
  } catch {
    return { records: [], devNotes: [], rdEvidence: [] };
  }
}

export async function saveDevGatewayRdEvidence(params: {
  title?: string;
  content: string;
  mode: string;
  createdBy: string;
  linkedFiles?: string[];
}): Promise<DevGatewayRdEvidence> {
  const store = await readDevGatewayStore();
  const now = new Date().toISOString();
  const evidence: DevGatewayRdEvidence = {
    id: newId("rdevidence"),
    title: params.title?.trim() || `R&D evidence · ${now}`,
    content: params.content,
    source: "dev_gateway",
    mode: params.mode,
    createdBy: params.createdBy,
    createdAt: now,
    linkedFiles: params.linkedFiles ?? [],
  };
  store.rdEvidence = [evidence, ...store.rdEvidence].slice(0, 200);
  await writeDevGatewayStore(store);
  return evidence;
}

export async function saveDevGatewayDevNote(params: {
  title?: string;
  content: string;
  mode: string;
  createdBy: string;
  linkedFiles?: string[];
}): Promise<DevGatewayDevNote> {
  const store = await readDevGatewayStore();
  const now = new Date().toISOString();
  const note: DevGatewayDevNote = {
    id: newId("devnote"),
    title: params.title?.trim() || `Dev note · ${now}`,
    content: params.content,
    source: "dev_gateway",
    mode: params.mode,
    createdBy: params.createdBy,
    createdAt: now,
    linkedFiles: params.linkedFiles ?? [],
    status: "draft",
  };
  store.devNotes = [note, ...store.devNotes].slice(0, 200);
  await writeDevGatewayStore(store);
  return note;
}

async function writeDevGatewayStore(store: DevGatewayStore): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_KEY, store);
    return;
  }
  const file = storeFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function saveReleaseCheckRecord(params: {
  type: SavedReleaseRecordType;
  title?: string;
  input: string;
  result: ReleaseCheckResult;
}): Promise<SavedReleaseRecord> {
  const store = await readDevGatewayStore();
  const now = new Date().toISOString();
  const record: SavedReleaseRecord = {
    id: newId(params.type === "release_note" ? "relnote" : "qafinding"),
    type: params.type,
    title: params.title?.trim() || `${params.type === "release_note" ? "Release note" : "QA finding"} · ${now}`,
    input: params.input,
    result: params.result,
    createdAt: now,
  };
  store.records = [record, ...store.records].slice(0, 100);
  await writeDevGatewayStore(store);
  return record;
}
