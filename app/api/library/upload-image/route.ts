import { NextResponse } from "next/server";
import { saveToolsAssetLibraryUploadBytesToLibrary } from "@/app/lib/language-studio/library-images";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const raw = form.get("file") ?? form.get("image");
  if (!(raw instanceof File) || raw.size === 0) {
    return NextResponse.json({ error: "Image file is required (field name: file)." }, { status: 400 });
  }
  if (raw.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image is too large. Use an optimised image under 6MB." }, { status: 400 });
  }

  const mime = raw.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime && !ALLOWED_TYPES.has(mime)) {
    return NextResponse.json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim();

  try {
    const bytes = Buffer.from(await raw.arrayBuffer());
    const { imageLibraryRel, imageUrl } = await saveToolsAssetLibraryUploadBytesToLibrary(
      bytes,
      mime || raw.type,
      req,
      title ? { note: title } : undefined,
    );
    return NextResponse.json({ ok: true, imageLibraryRel, imageUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
