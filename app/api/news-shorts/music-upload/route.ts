import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { isSafeContentId, normalizeContentIdForFilename } from "@/app/lib/editor-upload";
import { outputDir } from "@/app/lib/paths";

const MAX_MUSIC_BYTES = 80 * 1024 * 1024;
const ALLOWED_EXTS = new Set([".mp3", ".wav", ".m4a", ".aac"]);

function extForMusic(file: File): string | null {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.includes("mpeg") || name.endsWith(".mp3")) return ".mp3";
  if (mime.includes("wav") || name.endsWith(".wav")) return ".wav";
  if (mime.includes("aac") || name.endsWith(".aac")) return ".aac";
  if (mime.includes("mp4") || name.endsWith(".m4a")) return ".m4a";
  return null;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const rawContentId = String(form.get("contentId") ?? "").trim();
    const saveToGlobal = String(form.get("saveToGlobal") ?? "").trim() === "1";
    const music = form.get("music");
    const file = music instanceof File && music.size > 0 ? music : null;
    if (!rawContentId) {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }
    const contentId = normalizeContentIdForFilename(rawContentId);
    if (!isSafeContentId(contentId)) {
      return NextResponse.json({ error: "Invalid contentId" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "music file is required" }, { status: 400 });
    }
    if (file.size > MAX_MUSIC_BYTES) {
      return NextResponse.json({ error: "Music file too large (max 80MB)" }, { status: 400 });
    }
    const ext = extForMusic(file);
    if (!ext || !ALLOWED_EXTS.has(ext)) {
      return NextResponse.json({ error: "Unsupported format. Use mp3/wav/m4a/aac." }, { status: 400 });
    }

    const ts = Date.now();
    const safeStem = (file.name || "custom-track")
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "custom-track";
    const filename = `${safeStem}-${ts}${ext}`;
    const uploadsDir = path.join(outputDir(), "uploads", contentId, "music");
    await fs.mkdir(uploadsDir, { recursive: true });
    const abs = path.join(uploadsDir, filename);
    await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()));
    const rel = path.join("uploads", contentId, "music", filename).split(path.sep).join("/");

    let libraryRel: string | undefined;
    if (saveToGlobal) {
      const libDir = path.join(outputDir(), "library", "music");
      await fs.mkdir(libDir, { recursive: true });
      const libName = `${contentId}-${ts}${ext}`;
      const libAbs = path.join(libDir, libName);
      await fs.copyFile(abs, libAbs);
      libraryRel = path.join("library", "music", libName).split(path.sep).join("/");
    }

    return NextResponse.json({
      ok: true,
      musicRel: rel,
      libraryRel,
      meta: {
        filename,
        format: ext.slice(1),
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

