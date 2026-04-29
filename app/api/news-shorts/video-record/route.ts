import { NextResponse } from "next/server";
import {
  deleteCameraVideoRecordingsForContentId,
  isSafeContentId,
  normalizeContentIdForFilename,
  saveCameraVideoRecording,
} from "@/app/lib/editor-upload";
import { upsertLibraryMetadata } from "@/app/lib/library-metadata";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const contentId = String(form.get("contentId") ?? "").trim();
    const authorName = String(form.get("authorName") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const video = form.get("video");
    const file = video instanceof File && video.size > 0 ? video : null;
    if (!contentId) {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "video file is required" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await saveCameraVideoRecording(contentId, buf, file.type || "video/webm");
    const id = normalizeContentIdForFilename(contentId);
    if (isSafeContentId(id)) {
      await upsertLibraryMetadata(id, {
        keywords: [
          "camera recording",
          "video",
          "backdrop",
          "news shorts",
          ...(authorName ? [authorName, `camera by ${authorName}`, `video by ${authorName}`] : []),
        ],
      });
    }
    return NextResponse.json({
      ...result,
      videoRecordingRel: result.backgroundVideoRel,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const contentId = String(searchParams.get("contentId") ?? "").trim();
  if (!contentId || !isSafeContentId(contentId)) {
    return NextResponse.json({ error: "contentId is required" }, { status: 400 });
  }
  await deleteCameraVideoRecordingsForContentId(contentId);
  return NextResponse.json({ ok: true });
}
