import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { outputDir } from "@/app/lib/paths";

export type LibraryImageItem = {
  relPath: string;
  label: string;
};

const MAX_ITEMS = 80;

export async function GET() {
  try {
    const root = outputDir();
    const libraryRoot = path.join(root, "images", "library");
    const items: LibraryImageItem[] = [];

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
        } else if (/\.(png|jpe?g|webp|gif)$/i.test(e.name)) {
          const relPath = path.relative(root, full).split(path.sep).join("/");
          items.push({
            relPath,
            label: relPath.split("/").slice(-2).join("/"),
          });
        }
      }
    }

    await walk(libraryRoot);

    items.sort((a, b) => a.relPath.localeCompare(b.relPath));
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Library read failed";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
