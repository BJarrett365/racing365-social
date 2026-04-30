import fs from "fs/promises";
import path from "path";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";

const REL = "data/local/builtin-prompt-overrides.json";
const BLOB_STORE_NAME = "plexa-prompts";
const BLOB_STORE_KEY = "builtin-prompt-overrides.json";

export type BuiltinPromptOverrideEntry = {
  body: string;
  updatedAt: string;
};

export type BuiltinPromptOverridesFile = {
  /** Keyed by builtin id, e.g. `builtin-editor-voiceover`. */
  overrides: Record<string, BuiltinPromptOverrideEntry>;
};

const emptyFile = (): BuiltinPromptOverridesFile => ({ overrides: {} });

export async function readBuiltinPromptOverridesFile(): Promise<BuiltinPromptOverridesFile> {
  if (shouldUseNetlifyBlobStore()) {
    const data = await readJsonBlob<unknown>(BLOB_STORE_NAME, BLOB_STORE_KEY);
    return parseBuiltinPromptOverrides(data);
  }

  const full = path.join(process.cwd(), REL);
  try {
    const raw = await fs.readFile(full, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parseBuiltinPromptOverrides(parsed);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return emptyFile();
    throw e;
  }
}

function parseBuiltinPromptOverrides(parsed: unknown): BuiltinPromptOverridesFile {
  if (!parsed || typeof parsed !== "object") return emptyFile();
  const o = parsed as Record<string, unknown>;
  const rawOverrides = o.overrides;
  if (!rawOverrides || typeof rawOverrides !== "object") return emptyFile();
  const overrides: Record<string, BuiltinPromptOverrideEntry> = {};
  for (const [id, v] of Object.entries(rawOverrides)) {
    if (!id?.startsWith("builtin-")) continue;
    if (!v || typeof v !== "object") continue;
    const e = v as Record<string, unknown>;
    const body = typeof e.body === "string" ? e.body : "";
    const updatedAt = typeof e.updatedAt === "string" ? e.updatedAt : new Date().toISOString();
    overrides[id] = { body, updatedAt };
  }
  return { overrides };
}

async function writeBuiltinPromptOverridesFile(data: BuiltinPromptOverridesFile): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_STORE_KEY, data);
    return;
  }

  const full = path.join(process.cwd(), REL);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function setBuiltinPromptOverride(id: string, body: string): Promise<BuiltinPromptOverrideEntry> {
  if (!id.startsWith("builtin-")) throw new Error("Invalid builtin id.");
  const cur = await readBuiltinPromptOverridesFile();
  const now = new Date().toISOString();
  const entry: BuiltinPromptOverrideEntry = { body, updatedAt: now };
  cur.overrides[id] = entry;
  await writeBuiltinPromptOverridesFile(cur);
  return entry;
}

export async function deleteBuiltinPromptOverride(id: string): Promise<boolean> {
  if (!id.startsWith("builtin-")) return false;
  const cur = await readBuiltinPromptOverridesFile();
  if (!cur.overrides[id]) return false;
  delete cur.overrides[id];
  await writeBuiltinPromptOverridesFile(cur);
  return true;
}
