import { NextResponse } from "next/server";
import { saveLanguageArticleImageToLibrary } from "@/app/lib/language-studio/library-images";
import { readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";

type Body = {
  articleId?: string;
  action?: "delete" | "change";
  imageUrl?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const articleId = body.articleId?.trim();
  if (!articleId) return NextResponse.json({ error: "articleId is required." }, { status: 400 });

  const data = await readLanguageStudioData();
  const article = data.articles[articleId];
  if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });

  const now = new Date().toISOString();
  if (body.action === "delete") {
    article.imageUrl = undefined;
    article.imageLibraryRel = undefined;
    article.updatedAt = now;
    data.articles[article.id] = article;
    await writeLanguageStudioData(data);
    return NextResponse.json({ success: true, article });
  }

  if (body.action === "change") {
    const imageUrl = body.imageUrl?.trim();
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
      return NextResponse.json({ error: "Enter a valid http(s) image URL." }, { status: 400 });
    }
    article.imageUrl = imageUrl;
    article.imageLibraryRel = undefined;
    article.imageLibraryRel = await saveLanguageArticleImageToLibrary(article).catch(() => undefined);
    article.updatedAt = now;
    data.articles[article.id] = article;
    await writeLanguageStudioData(data);
    return NextResponse.json({ success: true, article });
  }

  return NextResponse.json({ error: "Unsupported image action." }, { status: 400 });
}
