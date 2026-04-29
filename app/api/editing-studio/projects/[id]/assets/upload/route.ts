import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { outputDir } from "@/app/lib/paths";
import { newEditingStudioId } from "@/features/editing-studio/lib/new-id";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";
import type { EditingAsset } from "@/features/editing-studio/types/domain";

const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".bin";
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
      return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
    }
    const mime = f.type || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
    }

    const buf = Buffer.from(await f.arrayBuffer());
    const base = path.join("editing-studio", projectId);
    const dir = path.join(outputDir(), base);
    await fs.mkdir(dir, { recursive: true });

    const id = newEditingStudioId("img");
    const ext = extForMime(mime);
    const relPath = `${base}/${id}${ext}`.split(path.sep).join("/");
    const full = path.join(outputDir(), relPath);
    await fs.writeFile(full, buf);

    const ts = nowIso();
    const asset: EditingAsset = {
      id: newEditingStudioId("ast"),
      kind: "image",
      label: f.name.replace(/\.[^/.]+$/, "") || "Uploaded image",
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
