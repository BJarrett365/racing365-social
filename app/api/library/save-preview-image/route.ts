import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { normalizeContentIdForFilename } from "@/app/lib/editor-upload";
import { writeLibraryBlobAsset } from "@/app/lib/library-blob-assets";
import { shouldUseNetlifyBlobStore } from "@/app/lib/netlify-blob-json";
import { libraryBackgroundImagesDir, outputDir } from "@/app/lib/paths";
import { upsertLibraryMetadata } from "@/app/lib/library-metadata";

type Body = {
  contentId: string;
  sourceRel: string;
  sceneId?: string;
  title?: string;
};

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function mimeForImageExtension(ext: string): string {
  const e = ext.toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  return "image/jpeg";
}

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

    const buf = await fs.readFile(sourceAbs);

    const dir = libraryBackgroundImagesDir(contentId);
    const scenePart = normalizeContentIdForFilename(body.sceneId || "preview");
    const filename = `preview-${scenePart}-${Date.now()}${ext === ".jpeg" ? ".jpg" : ext}`;
    const destAbs = path.join(dir, filename);
    const rel = path
      .join("images", "library", contentId, filename)
      .split(path.sep)
      .join("/");

    if (shouldUseNetlifyBlobStore()) {
      await writeLibraryBlobAsset(rel, buf, mimeForImageExtension(ext));
    } else {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(destAbs, buf);
    }

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
