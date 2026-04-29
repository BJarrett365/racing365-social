import fs from "fs/promises";
import path from "path";
import { libraryMetadataPath } from "@/app/lib/paths";

export type LibraryAssetMetadata = {
  title?: string;
  sourceUrl?: string;
  keywords: string[];
  updatedAt: string;
};

export type LibraryMetadataIndex = Record<string, LibraryAssetMetadata>;

function sanitizeKeyword(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 80);
}

function uniqueKeywords(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const cleaned = sanitizeKeyword(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out.slice(0, 40);
}

function safeContentId(contentId: string): string {
  return contentId.trim().replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80);
}

export async function readLibraryMetadataIndex(): Promise<LibraryMetadataIndex> {
  try {
    const raw = await fs.readFile(libraryMetadataPath(), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as LibraryMetadataIndex;
  } catch {
    return {};
  }
}

export async function upsertLibraryMetadata(
  contentId: string,
  partial: {
    title?: string;
    sourceUrl?: string;
    keywords?: string[];
  },
): Promise<LibraryAssetMetadata | null> {
  const key = safeContentId(contentId);
  if (!key) return null;
  const index = await readLibraryMetadataIndex();
  const existing = index[key];
  const merged: LibraryAssetMetadata = {
    title: partial.title?.trim() || existing?.title,
    sourceUrl: partial.sourceUrl?.trim() || existing?.sourceUrl,
    keywords: uniqueKeywords([...(existing?.keywords ?? []), ...(partial.keywords ?? []), key]),
    updatedAt: new Date().toISOString(),
  };
  index[key] = merged;
  const filePath = libraryMetadataPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(index, null, 2), "utf-8");
  return merged;
}
