import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { absoluteUrlWithAppBasePath } from "@/app/lib/app-base-path";
import { readLibraryBlobAsset } from "@/app/lib/library-blob-assets";
import { saveLanguageArticleImageToLibrary } from "@/app/lib/language-studio/library-images";
import { readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";
import { shouldUseNetlifyBlobStore } from "@/app/lib/netlify-blob-json";
import { outputDir } from "@/app/lib/paths";

type Body = {
  articleId?: string;
  action?: "delete" | "change" | "attach_library";
  imageUrl?: string;
  /**
   * Library-relative path (images/library/…). With action `change`, if set together with imageUrl and the file exists,
   * assigns both fields without re-downloading. With `attach_library`, selects an existing library asset.
   */
  imageLibraryRel?: string;
};

function normaliseRel(rel: string): string {
  return rel.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

function isAllowedLibraryRel(rel: string): boolean {
  const n = normaliseRel(rel);
  if (!n || n.includes("..") || path.isAbsolute(n)) return false;
  return n.startsWith("images/library/") || n.startsWith("library/");
}

async function libraryRelExists(rel: string): Promise<boolean> {
  const n = normaliseRel(rel);
  if (!isAllowedLibraryRel(n)) return false;
  if (shouldUseNetlifyBlobStore() && n.startsWith("images/library/")) {
    const blob = await readLibraryBlobAsset(n);
    if (blob) return true;
  }
  const root = outputDir();
  const full = path.resolve(root, n);
  const rootNorm = path.normalize(root + path.sep);
  if (!(full === path.normalize(root) || full.startsWith(rootNorm))) return false;
  try {
    await fs.access(full);
    return true;
  } catch {
    return false;
  }
}

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
    const libraryRelIn = body.imageLibraryRel?.trim();

    if (libraryRelIn) {
      const rel = normaliseRel(libraryRelIn);
      if (!isAllowedLibraryRel(rel)) {
        return NextResponse.json(
          { error: "imageLibraryRel must start with images/library/ or library/ and must not contain parent-folder segments." },
          { status: 400 },
        );
      }
      const exists = await libraryRelExists(rel);
      if (!exists) {
        return NextResponse.json(
          { error: "No file found at imageLibraryRel. Generate the image again or pick a path from Media Library." },
          { status: 404 },
        );
      }
      if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
        return NextResponse.json(
          {
            error:
              "When imageLibraryRel is set, imageUrl must be the matching http(s) URL (use the /api/file URL returned by text-to-image).",
          },
          { status: 400 },
        );
      }
      article.imageLibraryRel = rel;
      article.imageUrl = imageUrl;
      article.updatedAt = now;
      data.articles[article.id] = article;
      await writeLanguageStudioData(data);
      return NextResponse.json({ success: true, article });
    }

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

  if (body.action === "attach_library") {
    const relRaw = body.imageLibraryRel?.trim();
    if (!relRaw) {
      return NextResponse.json({ error: "imageLibraryRel is required (e.g. images/library/...)." }, { status: 400 });
    }
    const rel = normaliseRel(relRaw);
    if (!isAllowedLibraryRel(rel)) {
      return NextResponse.json(
        { error: "Path must start with images/library/ or library/ and must not contain parent-folder segments." },
        { status: 400 },
      );
    }
    const ok = await libraryRelExists(rel);
    if (!ok) {
      return NextResponse.json(
        { error: "No file found at that library path. Copy the path from Media Library (images/library/…)." },
        { status: 404 },
      );
    }
    article.imageLibraryRel = rel;
    article.imageUrl = absoluteUrlWithAppBasePath(req, `/api/file?rel=${encodeURIComponent(rel)}`);
    article.updatedAt = now;
    data.articles[article.id] = article;
    await writeLanguageStudioData(data);
    return NextResponse.json({ success: true, article });
  }

  return NextResponse.json({ error: "Unsupported image action." }, { status: 400 });
}
