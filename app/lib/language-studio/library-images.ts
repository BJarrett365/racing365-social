import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { normalizeContentIdForFilename } from "@/app/lib/editor-upload";
import { absoluteUrlWithAppBasePath } from "@/app/lib/app-base-path";
import { readLibraryBlobAsset, writeLibraryBlobAsset } from "@/app/lib/library-blob-assets";
import { shouldUseNetlifyBlobStore } from "@/app/lib/netlify-blob-json";
import { libraryBackgroundImagesDir, outputDir } from "@/app/lib/paths";
import { upsertLibraryMetadata } from "@/app/lib/library-metadata";
import { compactLibraryImageKeywords } from "@/app/lib/language-studio/f365-text-to-image-prompts";
import { LANGUAGE_LABELS, type LanguageArticle, type LanguageTranslation } from "@/app/lib/language-studio/types";

const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MAX_LANGUAGE_IMAGE_BYTES = 12 * 1024 * 1024;

const OPENAI_T2I_LIBRARY_METADATA_ID = "openai-text-to-image";
const HIGGSFIELD_EDIT_LIBRARY_METADATA_ID = "higgsfield-image-edit";
const LANGUAGE_STUDIO_MANUAL_UPLOAD_METADATA_ID = "language-studio-upload";
const LANGUAGE_STUDIO_SOCIAL_MEDIA_METADATA_ID = "language-studio-social";

const MAX_SOCIAL_VIDEO_BYTES = 95 * 1024 * 1024;

const VIDEO_EXT_BY_TYPE: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

function videoContentTypeForExtension(ext: string): string {
  if (ext === ".webm") return "video/webm";
  if (ext === ".mov") return "video/quicktime";
  return "video/mp4";
}

/**
 * Save raw bytes from OpenAI Images API under `images/library/openai-t2i/` and register for the Media Library.
 * Returns stable relative path plus same-origin URL served via `/api/file`.
 */
export async function saveOpenAiTextToImageBytesToLibrary(
  bytes: Buffer,
  contentTypeHeader: string | undefined,
  request: Request,
): Promise<{ imageLibraryRel: string; imageUrl: string }> {
  if (!bytes.length || bytes.length > MAX_LANGUAGE_IMAGE_BYTES) {
    throw new Error("Image data empty or too large.");
  }
  const ct = contentTypeHeader?.split(";")[0]?.trim().toLowerCase() ?? "image/png";
  const ext = IMAGE_EXT_BY_TYPE[ct] ?? ".png";
  const mime = contentTypeForExtension(ext);
  const rel = `images/library/openai-t2i/${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  if (shouldUseNetlifyBlobStore()) {
    await writeLibraryBlobAsset(rel, bytes, mime);
  } else {
    const full = path.resolve(outputDir(), rel);
    const rootNorm = path.normalize(outputDir() + path.sep);
    if (!full.startsWith(rootNorm)) throw new Error("Invalid library path.");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, bytes);
  }
  await upsertLibraryMetadata(OPENAI_T2I_LIBRARY_METADATA_ID, {
    title: "OpenAI text-to-image",
    keywords: ["openai", "text-to-image", "images-api", "library"],
  });
  const imageUrl = absoluteUrlWithAppBasePath(request, `/api/file?rel=${encodeURIComponent(rel)}`);
  return { imageLibraryRel: rel, imageUrl };
}

/**
 * Save a user-uploaded file from Language Studio under `images/library/language-studio-upload/`.
 */
export async function saveLanguageStudioManualUploadBytesToLibrary(
  bytes: Buffer,
  contentTypeHeader: string | undefined,
  request: Request,
): Promise<{ imageLibraryRel: string; imageUrl: string }> {
  if (!bytes.length || bytes.length > MAX_LANGUAGE_IMAGE_BYTES) {
    throw new Error("Image data empty or too large.");
  }
  const ct = contentTypeHeader?.split(";")[0]?.trim().toLowerCase() ?? "image/png";
  const ext = IMAGE_EXT_BY_TYPE[ct] ?? ".png";
  const mime = contentTypeForExtension(ext);
  const rel = `images/library/language-studio-upload/${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  if (shouldUseNetlifyBlobStore()) {
    await writeLibraryBlobAsset(rel, bytes, mime);
  } else {
    const full = path.resolve(outputDir(), rel);
    const rootNorm = path.normalize(outputDir() + path.sep);
    if (!full.startsWith(rootNorm)) throw new Error("Invalid library path.");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, bytes);
  }
  await upsertLibraryMetadata(LANGUAGE_STUDIO_MANUAL_UPLOAD_METADATA_ID, {
    title: "Language Studio uploads",
    keywords: ["language-studio", "upload", "manual", "library"],
  });
  const imageUrl = absoluteUrlWithAppBasePath(request, `/api/file?rel=${encodeURIComponent(rel)}`);
  return { imageLibraryRel: rel, imageUrl };
}

/**
 * Social card image uploads — stored under `images/library/language-studio-social/image/`.
 */
export async function saveLanguageStudioSocialImageBytesToLibrary(
  bytes: Buffer,
  contentTypeHeader: string | undefined,
  request: Request,
): Promise<{ imageLibraryRel: string; imageUrl: string }> {
  if (!bytes.length || bytes.length > MAX_LANGUAGE_IMAGE_BYTES) {
    throw new Error("Image data empty or too large.");
  }
  const ct = contentTypeHeader?.split(";")[0]?.trim().toLowerCase() ?? "image/png";
  const ext = IMAGE_EXT_BY_TYPE[ct] ?? ".png";
  const mime = contentTypeForExtension(ext);
  const rel = `images/library/language-studio-social/image/${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  if (shouldUseNetlifyBlobStore()) {
    await writeLibraryBlobAsset(rel, bytes, mime);
  } else {
    const full = path.resolve(outputDir(), rel);
    const rootNorm = path.normalize(outputDir() + path.sep);
    if (!full.startsWith(rootNorm)) throw new Error("Invalid library path.");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, bytes);
  }
  await upsertLibraryMetadata(LANGUAGE_STUDIO_SOCIAL_MEDIA_METADATA_ID, {
    title: "Language Studio social media",
    keywords: ["language-studio", "social", "image", "video", "library"],
  });
  const imageUrl = absoluteUrlWithAppBasePath(request, `/api/file?rel=${encodeURIComponent(rel)}`);
  return { imageLibraryRel: rel, imageUrl };
}

/**
 * Social card video uploads — stored under `images/library/language-studio-social/video/`.
 */
export async function saveLanguageStudioSocialVideoBytesToLibrary(
  bytes: Buffer,
  contentTypeHeader: string | undefined,
  request: Request,
): Promise<{ videoLibraryRel: string; videoUrl: string }> {
  if (!bytes.length || bytes.length > MAX_SOCIAL_VIDEO_BYTES) {
    throw new Error("Video data empty or too large.");
  }
  const ct = contentTypeHeader?.split(";")[0]?.trim().toLowerCase() ?? "video/mp4";
  const ext = VIDEO_EXT_BY_TYPE[ct] ?? ".mp4";
  const mime = videoContentTypeForExtension(ext);
  const rel = `images/library/language-studio-social/video/${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  if (shouldUseNetlifyBlobStore()) {
    await writeLibraryBlobAsset(rel, bytes, mime);
  } else {
    const full = path.resolve(outputDir(), rel);
    const rootNorm = path.normalize(outputDir() + path.sep);
    if (!full.startsWith(rootNorm)) throw new Error("Invalid library path.");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, bytes);
  }
  await upsertLibraryMetadata(LANGUAGE_STUDIO_SOCIAL_MEDIA_METADATA_ID, {
    title: "Language Studio social media",
    keywords: ["language-studio", "social", "image", "video", "library"],
  });
  const videoUrl = absoluteUrlWithAppBasePath(request, `/api/file?rel=${encodeURIComponent(rel)}`);
  return { videoLibraryRel: rel, videoUrl };
}

/**
 * Same-origin URL for Higgsfield (and similar APIs) to fetch a source image via HTTPS GET.
 * Writes under `images/library/higgsfield-edit/incoming/`.
 */
export async function saveHiggsfieldSourceImageBytesForPublicUrl(
  bytes: Buffer,
  contentTypeHeader: string | undefined,
  request: Request,
): Promise<{ imageLibraryRel: string; imageUrl: string }> {
  if (!bytes.length || bytes.length > MAX_LANGUAGE_IMAGE_BYTES) {
    throw new Error("Image data empty or too large.");
  }
  const ct = contentTypeHeader?.split(";")[0]?.trim().toLowerCase() ?? "image/png";
  const ext = IMAGE_EXT_BY_TYPE[ct] ?? ".png";
  const mime = contentTypeForExtension(ext);
  const rel = `images/library/higgsfield-edit/incoming/${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  if (shouldUseNetlifyBlobStore()) {
    await writeLibraryBlobAsset(rel, bytes, mime);
  } else {
    const full = path.resolve(outputDir(), rel);
    const rootNorm = path.normalize(outputDir() + path.sep);
    if (!full.startsWith(rootNorm)) throw new Error("Invalid library path.");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, bytes);
  }
  const imageUrl = absoluteUrlWithAppBasePath(request, `/api/file?rel=${encodeURIComponent(rel)}`);
  return { imageLibraryRel: rel, imageUrl };
}

/**
 * Persist an edited image returned from Higgsfield under `images/library/higgsfield-edit/` for the Media Library.
 */
export async function saveHiggsfieldEditImageBytesToLibrary(
  bytes: Buffer,
  contentTypeHeader: string | undefined,
  request: Request,
): Promise<{ imageLibraryRel: string; imageUrl: string }> {
  if (!bytes.length || bytes.length > MAX_LANGUAGE_IMAGE_BYTES) {
    throw new Error("Image data empty or too large.");
  }
  const ct = contentTypeHeader?.split(";")[0]?.trim().toLowerCase() ?? "image/png";
  const ext = IMAGE_EXT_BY_TYPE[ct] ?? ".png";
  const mime = contentTypeForExtension(ext);
  const rel = `images/library/higgsfield-edit/${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  if (shouldUseNetlifyBlobStore()) {
    await writeLibraryBlobAsset(rel, bytes, mime);
  } else {
    const full = path.resolve(outputDir(), rel);
    const rootNorm = path.normalize(outputDir() + path.sep);
    if (!full.startsWith(rootNorm)) throw new Error("Invalid library path.");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, bytes);
  }
  await upsertLibraryMetadata(HIGGSFIELD_EDIT_LIBRARY_METADATA_ID, {
    title: "Higgsfield image edit",
    keywords: ["higgsfield", "image-edit", "library"],
  });
  const imageUrl = absoluteUrlWithAppBasePath(request, `/api/file?rel=${encodeURIComponent(rel)}`);
  return { imageLibraryRel: rel, imageUrl };
}

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
    keywords: compactLibraryImageKeywords({
      title: article.title,
      body: article.body,
      standfirst: article.standfirst,
      category: article.category,
      tags: article.tags,
    }),
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
    keywords: compactLibraryImageKeywords(
      {
        title: translation.title,
        body: translation.body,
        standfirst: translation.standfirst,
        category: article.category,
        tags: translation.tags,
      },
      { appendToEvent: LANGUAGE_LABELS[translation.targetLanguage] },
    ),
  });

  return rel;
}
