import { NextResponse } from "next/server";
import { saveEditorUploads } from "@/app/lib/editor-upload";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const contentId = String(form.get("contentId") ?? "").trim();
    const sceneId = String(form.get("sceneId") ?? "").trim() || null;
    if (!contentId) {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }
    const image = form.get("backgroundImage");
    const video = form.get("backgroundVideo");
    const imgFile = image instanceof File && image.size > 0 ? image : null;
    const vidFile = video instanceof File && video.size > 0 ? video : null;

    if (!imgFile && !vidFile) {
      return NextResponse.json(
        { error: "Provide backgroundImage and/or backgroundVideo" },
        { status: 400 },
      );
    }

    const result = await saveEditorUploads(contentId, imgFile, vidFile, sceneId);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
