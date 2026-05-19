import { NextResponse } from "next/server";
import { saveLanguageStudioManualUploadBytesToLibrary } from "@/app/lib/language-studio/library-images";
import { readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const articleId = String(form.get("articleId") ?? "").trim();
  if (!articleId) {
    return NextResponse.json({ error: "articleId is required." }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime && !ALLOWED_TYPES.has(mime)) {
    return NextResponse.json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." }, { status: 400 });
  }

  const data = await readLanguageStudioData();
  const article = data.articles[articleId];
  if (!article) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const { imageLibraryRel, imageUrl } = await saveLanguageStudioManualUploadBytesToLibrary(
      bytes,
      mime || file.type,
      req,
    );
    const now = new Date().toISOString();
    article.imageLibraryRel = imageLibraryRel;
    article.imageUrl = imageUrl;
    article.updatedAt = now;
    data.articles[article.id] = article;
    await writeLanguageStudioData(data);
    return NextResponse.json({ success: true, article });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
