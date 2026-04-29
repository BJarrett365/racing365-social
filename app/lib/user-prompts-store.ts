import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const REL = "data/local/user-prompts.json";

export type UserPromptEntry = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type UserPromptsFile = {
  prompts: UserPromptEntry[];
};

const emptyFile = (): UserPromptsFile => ({ prompts: [] });

export async function readUserPromptsFile(): Promise<UserPromptsFile> {
  const full = path.join(process.cwd(), REL);
  try {
    const raw = await fs.readFile(full, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyFile();
    const p = parsed as Record<string, unknown>;
    if (!Array.isArray(p.prompts)) return emptyFile();
    const prompts: UserPromptEntry[] = [];
    for (const item of p.prompts) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id.trim() : "";
      const title = typeof o.title === "string" ? o.title.trim() : "";
      const body = typeof o.body === "string" ? o.body : "";
      const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
      const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : createdAt;
      if (id && title) prompts.push({ id, title, body, createdAt, updatedAt });
    }
    return { prompts };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return emptyFile();
    throw e;
  }
}

async function writeUserPromptsFile(data: UserPromptsFile): Promise<void> {
  const full = path.join(process.cwd(), REL);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function newUserPromptId(): string {
  return `up-${randomUUID()}`;
}

export async function addUserPrompt(title: string, body: string): Promise<UserPromptEntry> {
  const cur = await readUserPromptsFile();
  const now = new Date().toISOString();
  const entry: UserPromptEntry = {
    id: newUserPromptId(),
    title: title.trim(),
    body,
    createdAt: now,
    updatedAt: now,
  };
  cur.prompts.unshift(entry);
  await writeUserPromptsFile(cur);
  return entry;
}

export async function updateUserPrompt(
  id: string,
  title: string,
  body: string,
): Promise<UserPromptEntry | null> {
  const t = title.trim();
  if (!t) return null;
  const cur = await readUserPromptsFile();
  const idx = cur.prompts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const prev = cur.prompts[idx];
  const next: UserPromptEntry = {
    ...prev,
    title: t,
    body,
    updatedAt: now,
  };
  cur.prompts[idx] = next;
  await writeUserPromptsFile(cur);
  return next;
}

export async function deleteUserPrompt(id: string): Promise<boolean> {
  const cur = await readUserPromptsFile();
  const next = cur.prompts.filter((p) => p.id !== id);
  if (next.length === cur.prompts.length) return false;
  await writeUserPromptsFile({ prompts: next });
  return true;
}
