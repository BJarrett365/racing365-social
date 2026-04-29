import { NextResponse } from "next/server";
import {
  deleteVoiceRecordingsForContentId,
  isSafeContentId,
  normalizeContentIdForFilename,
  saveVoiceRecording,
} from "@/app/lib/editor-upload";
import { upsertLibraryMetadata } from "@/app/lib/library-metadata";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const contentId = String(form.get("contentId") ?? "").trim();
    const authorName = String(form.get("authorName") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const audio = form.get("audio");
    const file = audio instanceof File && audio.size > 0 ? audio : null;
    if (!contentId) {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "audio file is required" }, { status: 400 });
    }
    const result = await saveVoiceRecording(contentId, file);
    const id = normalizeContentIdForFilename(contentId);
    if (isSafeContentId(id)) {
      await upsertLibraryMetadata(id, {
        keywords: [
          "voice recording",
          "voice",
          "audio",
          "news shorts",
          ...(authorName ? [authorName, `voice by ${authorName}`] : []),
        ],
      });
    }
    return NextResponse.json(result);
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
  await deleteVoiceRecordingsForContentId(contentId);
  return NextResponse.json({ ok: true });
}
