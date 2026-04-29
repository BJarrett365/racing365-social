import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { outputDir } from "@/app/lib/paths";

export type LibraryVideoItem = {
  relPath: string;
  label: string;
};

const MAX_ITEMS = 40;

export async function GET() {
  try {
    const root = outputDir();
    const videoRoot = path.join(root, "video");
    const items: LibraryVideoItem[] = [];

    async function walk(dir: string): Promise<void> {
      if (items.length >= MAX_ITEMS) return;
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (items.length >= MAX_ITEMS) break;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          await walk(full);
        } else if (/\.(mp4|webm|mov)$/i.test(e.name)) {
          const relPath = path.relative(root, full).split(path.sep).join("/");
          items.push({
            relPath,
            label: relPath.split("/").slice(-2).join("/"),
          });
        }
      }
    }

    await walk(videoRoot);
    items.sort((a, b) => a.relPath.localeCompare(b.relPath));
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Library read failed";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
