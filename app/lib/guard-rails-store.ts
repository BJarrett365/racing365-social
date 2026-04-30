import fs from "fs";
import path from "path";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import { projectRoot } from "@/app/lib/paths";

export type GuardRailFormat =
  | "next-off"
  | "fast-results"
  | "racecard"
  | "teamtalk-news"
  | "f1-grid"
  | "f1-results";

export type GuardRailsFile = {
  rails: Record<GuardRailFormat, string>;
  updatedAt?: string;
};

const LOCAL_DIR = path.join(projectRoot(), "data", "local");
const FILE = path.join(LOCAL_DIR, "guard-rails.json");
const BLOB_STORE_NAME = "plexa-guard-rails";
const BLOB_STORE_KEY = "guard-rails.json";

const DEFAULT_RAILS: Record<GuardRailFormat, string> = {
  "next-off":
    "Keep tips factual and concise. Do not invent race data. Keep spoken pacing natural and suitable for short-form narration.",
  "fast-results":
    "Prioritise winner and placings clearly. Keep timing and outcome details factual. Use concise spoken phrasing for social video.",
  racecard:
    "Summarise picks and market movement without adding unsupported claims. Keep language compliant and neutral for betting content.",
  "teamtalk-news":
    "Use transfer-news tone while avoiding unverified claims. Keep language punchy, factual, and broadcast-friendly.",
  "f1-grid":
    "Present qualifying grid in clear order with no fabricated timings. Keep lines short and easy to voice.",
  "f1-results":
    "Report finishing order and key outcomes accurately. Keep commentary concise, neutral, and spoken-word friendly.",
};

function ensureDir() {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

export function readGuardRails(): GuardRailsFile {
  try {
    const raw = fs.readFileSync(FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<GuardRailsFile>;
    const rails = { ...DEFAULT_RAILS, ...(parsed.rails ?? {}) } as Record<GuardRailFormat, string>;
    return { rails, updatedAt: parsed.updatedAt };
  } catch {
    return { rails: { ...DEFAULT_RAILS } };
  }
}

export async function readGuardRailsAsync(): Promise<GuardRailsFile> {
  if (shouldUseNetlifyBlobStore()) {
    const parsed = await readJsonBlob<Partial<GuardRailsFile>>(BLOB_STORE_NAME, BLOB_STORE_KEY);
    const rails = { ...DEFAULT_RAILS, ...(parsed?.rails ?? {}) } as Record<GuardRailFormat, string>;
    return { rails, updatedAt: parsed?.updatedAt };
  }

  return readGuardRails();
}

export function writeGuardRails(rails: Record<GuardRailFormat, string>): GuardRailsFile {
  ensureDir();
  const payload: GuardRailsFile = { rails, updatedAt: new Date().toISOString() };
  fs.writeFileSync(FILE, JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

export async function writeGuardRailsAsync(rails: Record<GuardRailFormat, string>): Promise<GuardRailsFile> {
  if (shouldUseNetlifyBlobStore()) {
    const payload: GuardRailsFile = { rails, updatedAt: new Date().toISOString() };
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_STORE_KEY, payload);
    return payload;
  }

  return writeGuardRails(rails);
}

export function mergeGuardRails(partial: Partial<Record<GuardRailFormat, string>>): GuardRailsFile {
  const cur = readGuardRails();
  const next: Record<GuardRailFormat, string> = { ...cur.rails };
  for (const [k, v] of Object.entries(partial)) {
    if (typeof v !== "string") continue;
    next[k as GuardRailFormat] = v.trim();
  }
  return writeGuardRails(next);
}

export async function mergeGuardRailsAsync(partial: Partial<Record<GuardRailFormat, string>>): Promise<GuardRailsFile> {
  const cur = await readGuardRailsAsync();
  const next: Record<GuardRailFormat, string> = { ...cur.rails };
  for (const [k, v] of Object.entries(partial)) {
    if (typeof v !== "string") continue;
    next[k as GuardRailFormat] = v.trim();
  }
  return writeGuardRailsAsync(next);
}
