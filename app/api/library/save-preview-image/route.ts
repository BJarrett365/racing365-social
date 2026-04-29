import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { normalizeContentIdForFilename } from "@/app/lib/editor-upload";
import { libraryBackgroundImagesDir, outputDir } from "@/app/lib/paths";
import { upsertLibraryMetadata } from "@/app/lib/library-metadata";

type Body = {
  contentId: string;
  sourceRel: string;
  sceneId?: string;
  title?: string;
};

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const contentId = normalizeContentIdForFilename(body.contentId);
    const sourceRel = String(body.sourceRel ?? "").trim().split(path.sep).join("/");
    if (!contentId || !sourceRel || sourceRel.includes("..")) {
      return NextResponse.json({ error: "Invalid preview image" }, { status: 400 });
    }

    const ext = path.extname(sourceRel).toLowerCase();
    if (!IMAGE_EXT.has(ext)) {
      return NextResponse.json({ error: "Preview image must be PNG, JPG, or WebP" }, { status: 400 });
    }

    const root = path.normalize(outputDir());
    const sourceAbs = path.normalize(path.join(root, ...sourceRel.split("/")));
    if (!sourceAbs.startsWith(root + path.sep)) {
      return NextResponse.json({ error: "Invalid preview image path" }, { status: 400 });
    }
    await fs.access(sourceAbs);

    const dir = libraryBackgroundImagesDir(contentId);
    await fs.mkdir(dir, { recursive: true });
    const scenePart = normalizeContentIdForFilename(body.sceneId || "preview");
    const filename = `preview-${scenePart}-${Date.now()}${ext === ".jpeg" ? ".jpg" : ext}`;
    const destAbs = path.join(dir, filename);
    await fs.copyFile(sourceAbs, destAbs);

    const rel = path.relative(root, destAbs).split(path.sep).join("/");
    await upsertLibraryMetadata(contentId, {
      title: body.title || "Saved preview image",
      keywords: ["preview image", "saved from editor", contentId, scenePart],
    });

    return NextResponse.json({ rel });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save preview image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
