import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { assetsManifestPath, outputDir, outputVideoDir, outputImagesDir } from "@/app/lib/paths";
import { scanBackdropVideoRels } from "@/app/lib/scan-backdrop-videos";

export async function GET() {
  try {
    let manifest: unknown[] = [];
    try {
      const raw = await fs.readFile(assetsManifestPath(), "utf-8");
      manifest = JSON.parse(raw) as unknown[];
      manifest.sort((a, b) => {
        const ac = typeof a === "object" && a && "createdAt" in a ? Date.parse(String(a.createdAt)) : 0;
        const bc = typeof b === "object" && b && "createdAt" in b ? Date.parse(String(b.createdAt)) : 0;
        return bc - ac;
      });
    } catch {
      manifest = [];
    }

    const videos: { rel: string; mtimeMs: number }[] = [];
    try {
      const dir = outputVideoDir();
      const files = await fs.readdir(dir);
      for (const f of files) {
        if (!f.endsWith(".mp4")) continue;
        const st = await fs.stat(path.join(dir, f));
        videos.push({ rel: path.join("video", f), mtimeMs: st.mtimeMs });
      }
    } catch {
      /* empty */
    }

    const backdropVideos = await scanBackdropVideoRels();

    const imageFolders: string[] = [];
    try {
      const dir = outputImagesDir();
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) imageFolders.push(path.join("images", e.name));
      }
    } catch {
      /* empty */
    }

    return NextResponse.json({
      manifest,
      videos: videos.sort((a, b) => b.mtimeMs - a.mtimeMs || a.rel.localeCompare(b.rel)).map((item) => item.rel),
      backdropVideos,
      imageFolders,
      outputRoot: outputDir(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
