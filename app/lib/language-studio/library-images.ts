import fs from "fs/promises";
import path from "path";
import { normalizeContentIdForFilename } from "@/app/lib/editor-upload";
import { readLibraryBlobAsset, writeLibraryBlobAsset } from "@/app/lib/library-blob-assets";
import { shouldUseNetlifyBlobStore } from "@/app/lib/netlify-blob-json";
import { libraryBackgroundImagesDir, outputDir } from "@/app/lib/paths";
import { upsertLibraryMetadata } from "@/app/lib/library-metadata";
import { LANGUAGE_LABELS, type LanguageArticle, type LanguageTranslation } from "@/app/lib/language-studio/types";

const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MAX_LANGUAGE_IMAGE_BYTES = 12 * 1024 * 1024;

function extensionFor(url: string, contentType: string): string {
  const fromType = IMAGE_EXT_BY_TYPE[contentType.split(";")[0]?.trim().toLowerCase() ?? ""];
  if (fromType) return fromType;
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return ext === ".jpeg" ? ".jpg" : ext;
  } catch {
    /* ignore bad URL */
  }
  return ".jpg";
}

function contentTypeForExtension(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function fileSafeSlug(input: string): string {
  return normalizeContentIdForFilename(input.toLowerCase().replace(/\s+/g, "-")) || `article-${Date.now()}`;
}

export async function saveLanguageArticleImageToLibrary(article: LanguageArticle): Promise<string | undefined> {
  if (article.imageLibraryRel?.trim()) return article.imageLibraryRel;
  const imageUrl = article.imageUrl?.trim();
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return article.imageLibraryRel;

  const res = await fetch(imageUrl, {
    cache: "no-store",
    headers: { "user-agent": "PlanetSportStudio Language Studio/1.0", accept: "image/*,*/*" },
  });
  if (!res.ok) return article.imageLibraryRel;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType && !contentType.toLowerCase().startsWith("image/")) return article.imageLibraryRel;

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_LANGUAGE_IMAGE_BYTES) return article.imageLibraryRel;

  const contentId = normalizeContentIdForFilename(`language-${article.sourceBrand}-${article.importId}`);
  const dir = libraryBackgroundImagesDir(contentId);
  const ext = extensionFor(imageUrl, contentType);
  const filename = `${fileSafeSlug(article.title).slice(0, 56)}-${article.id.slice(-6)}${ext}`;
  const abs = path.join(dir, filename);
  const rel = path.relative(outputDir(), abs).split(path.sep).join("/");
  if (shouldUseNetlifyBlobStore()) {
    await writeLibraryBlobAsset(rel, bytes, contentType || contentTypeForExtension(ext));
  } else {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(abs, bytes);
  }

  await upsertLibraryMetadata(contentId, {
    title: `Language Studio images — ${article.sourceBrand}`,
    sourceUrl: article.sourceUrl || article.canonicalUrl || imageUrl,
    keywords: [
      "language studio",
      "article image",
      article.sourceBrand,
      article.title,
      ...(article.tags ?? []),
    ],
  });

  return rel;
}

export async function saveLanguageArticleImagesToLibrary(articles: LanguageArticle[]): Promise<LanguageArticle[]> {
  const out: LanguageArticle[] = [];
  const savedByImageUrl = new Map<string, string>();
  for (const article of articles) {
    const imageUrl = article.imageUrl?.trim();
    const reusedRel = imageUrl ? savedByImageUrl.get(imageUrl) : undefined;
    const imageLibraryRel = reusedRel ?? await saveLanguageArticleImageToLibrary(article).catch(() => article.imageLibraryRel);
    if (imageUrl && imageLibraryRel) savedByImageUrl.set(imageUrl, imageLibraryRel);
    out.push({
      ...article,
      imageLibraryRel,
      updatedAt: imageLibraryRel ? new Date().toISOString() : article.updatedAt,
    });
  }
  return out;
}

export async function copyLanguageArticleImageForExport(
  article: LanguageArticle,
  translation: LanguageTranslation,
): Promise<string | undefined> {
  const sourceRel = article.imageLibraryRel?.trim();
  if (!sourceRel || sourceRel.includes("..")) return undefined;

  const root = outputDir();
  const sourceAbs = path.normalize(path.join(root, ...sourceRel.split("/")));
  const normalizedRoot = path.normalize(root);
  if (!sourceAbs.startsWith(normalizedRoot + path.sep)) return undefined;

  let sourceBytes: Buffer | null = null;
  try {
    sourceBytes = await fs.readFile(sourceAbs);
  } catch {
    const blobAsset = await readLibraryBlobAsset(sourceRel);
    sourceBytes = blobAsset?.bytes ?? null;
  }
  if (!sourceBytes) return undefined;

  const contentId = normalizeContentIdForFilename(
    `language-${article.sourceBrand}-${translation.targetLanguage}`,
  );
  const dir = libraryBackgroundImagesDir(contentId);
  const ext = path.extname(sourceAbs).toLowerCase() || ".jpg";
  const slug = fileSafeSlug(translation.slug || translation.title || article.title).slice(0, 70);
  const filename = `${slug}-${translation.targetLanguage}-${translation.id.slice(-6)}${ext}`;
  const destAbs = path.join(dir, filename);
  const rel = path.relative(root, destAbs).split(path.sep).join("/");
  if (shouldUseNetlifyBlobStore()) {
    await writeLibraryBlobAsset(rel, sourceBytes, contentTypeForExtension(ext));
  } else {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(destAbs, sourceBytes);
  }

  await upsertLibraryMetadata(contentId, {
    title: `Language Studio images — ${LANGUAGE_LABELS[translation.targetLanguage]}`,
    sourceUrl: article.sourceUrl || article.canonicalUrl || article.imageUrl,
    keywords: [
      "language studio",
      "article image",
      "translated image",
      `language:${translation.targetLanguage}`,
      LANGUAGE_LABELS[translation.targetLanguage],
      article.sourceBrand,
      translation.title,
      ...(translation.tags ?? []),
    ],
  });

  return rel;
}
