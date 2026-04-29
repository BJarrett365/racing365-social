import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { outputDir } from "@/app/lib/paths";
import { newEditingStudioId } from "@/features/editing-studio/lib/new-id";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";
import type { EditingAsset } from "@/features/editing-studio/types/domain";

const MAX_BYTES = 80 * 1024 * 1024;

const ALLOWED_MIME = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/mpeg"]);

function extForMime(mime: string, filename: string): string {
  if (mime === "video/webm") return ".webm";
  if (mime === "video/quicktime") return ".mov";
  const lower = filename.toLowerCase();
  if (lower.endsWith(".mp4")) return ".mp4";
  if (lower.endsWith(".webm")) return ".webm";
  if (lower.endsWith(".mov")) return ".mov";
  return ".mp4";
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await ctx.params;
    const repo = getEditingStudioRepository();
    const project = await repo.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob) || typeof (file as File).name !== "string") {
      return NextResponse.json({ error: "Expected file field" }, { status: 400 });
    }
    const f = file as File;
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 80MB)" }, { status: 400 });
    }
    const mime = f.type || "";
    const extOk = /\.(mp4|webm|mov)$/i.test(f.name);
    if (!extOk && (!mime || !ALLOWED_MIME.has(mime))) {
      return NextResponse.json({ error: "Unsupported video type (use mp4, webm, or mov)" }, { status: 400 });
    }

    const buf = Buffer.from(await f.arrayBuffer());
    const base = path.join("editing-studio", projectId);
    const dir = path.join(outputDir(), base);
    await fs.mkdir(dir, { recursive: true });

    const id = newEditingStudioId("vid");
    const ext = extForMime(mime || "video/mp4", f.name);
    const relPath = `${base}/${id}${ext}`.split(path.sep).join("/");
    const full = path.join(outputDir(), relPath);
    await fs.writeFile(full, buf);

    const ts = nowIso();
    const asset: EditingAsset = {
      id: newEditingStudioId("ast"),
      kind: "video",
      label: f.name.replace(/\.[^/.]+$/, "") || "Uploaded video",
      relPath,
      mimeType: mime,
      byteSize: buf.length,
      createdAt: ts,
      updatedAt: ts,
      meta: { uploaded: true, originalRelPath: relPath },
    };

    return NextResponse.json({ asset, relPath });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
