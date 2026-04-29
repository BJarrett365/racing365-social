import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { outputDir } from "@/app/lib/paths";

const ALLOWED = new Set([".mp3", ".wav", ".m4a", ".aac"]);
const MAX_MUSIC_BYTES = 80 * 1024 * 1024;

function extFor(file: File): string | null {
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (mime.includes("mpeg") || name.endsWith(".mp3")) return ".mp3";
  if (mime.includes("wav") || name.endsWith(".wav")) return ".wav";
  if (mime.includes("mp4") || name.endsWith(".m4a")) return ".m4a";
  if (mime.includes("aac") || name.endsWith(".aac")) return ".aac";
  return null;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const projectId = String(form.get("projectId") ?? "").trim();
    const music = form.get("music");
    const file = music instanceof File ? music : null;
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
    if (!file || file.size <= 0) return NextResponse.json({ error: "music file required" }, { status: 400 });
    if (file.size > MAX_MUSIC_BYTES) {
      return NextResponse.json({ error: "Music too large (max 80MB)" }, { status: 400 });
    }
    const ext = extFor(file);
    if (!ext || !ALLOWED.has(ext)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    const safeName = (file.name || "music")
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    const filename = `${safeName || "music"}-${Date.now()}${ext}`;
    const dir = path.join(outputDir(), "library", "music", "podcast-template");
    await fs.mkdir(dir, { recursive: true });
    const abs = path.join(dir, filename);
    await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()));
    const rel = path.join("library", "music", "podcast-template", filename).split(path.sep).join("/");
    return NextResponse.json({ musicRel: rel });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
