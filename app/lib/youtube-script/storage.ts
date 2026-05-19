import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";
import { projectRoot } from "@/app/lib/paths";
import { shouldUseNetlifyBlobStore } from "@/app/lib/netlify-blob-json";
import type { YouTubeScriptImport } from "@/app/lib/youtube-script/types";

const LOCAL_DIR = path.join(projectRoot(), "data", "local");
const LOCAL_FILE = path.join(LOCAL_DIR, "youtube-script-imports.json");
const BLOB_STORE_NAME = "plexa-youtube-script-imports";
const BLOB_STORE_KEY = "imports.json";

async function readImports(): Promise<YouTubeScriptImport[]> {
  if (shouldUseNetlifyBlobStore()) {
    try {
      const rows = (await getStore(BLOB_STORE_NAME).get(BLOB_STORE_KEY, { type: "json" })) as YouTubeScriptImport[] | null;
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  try {
    const raw = fs.readFileSync(LOCAL_FILE, "utf-8");
    const rows = JSON.parse(raw) as YouTubeScriptImport[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function writeImports(rows: YouTubeScriptImport[]): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await getStore(BLOB_STORE_NAME).setJSON(BLOB_STORE_KEY, rows);
    return;
  }

  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(rows, null, 2), "utf-8");
}

export async function saveYouTubeScriptImport(
  input: Omit<YouTubeScriptImport, "id" | "createdAt" | "updatedAt"> & Partial<Pick<YouTubeScriptImport, "id">>,
): Promise<YouTubeScriptImport> {
  const rows = await readImports();
  const now = new Date().toISOString();
  const existing = input.id ? rows.find((row) => row.id === input.id) : undefined;
  const next: YouTubeScriptImport = {
    ...input,
    id: existing?.id ?? input.id ?? `yt-script-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const merged = existing ? rows.map((row) => (row.id === existing.id ? next : row)) : [next, ...rows];
  await writeImports(merged);
  return next;
}

export async function listYouTubeScriptImports(): Promise<YouTubeScriptImport[]> {
  return readImports();
}

export async function deleteYouTubeScriptImports(importIds: string[]): Promise<{ deletedIds: string[] }> {
  const ids = new Set(importIds.map((id) => id.trim()).filter(Boolean));
  if (ids.size === 0) return { deletedIds: [] };
  const rows = await readImports();
  const deletedIds = rows.filter((row) => ids.has(row.id)).map((row) => row.id);
  await writeImports(rows.filter((row) => !ids.has(row.id)));
  return { deletedIds };
}
