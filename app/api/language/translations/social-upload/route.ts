import { NextResponse } from "next/server";
import {
  saveLanguageStudioSocialImageBytesToLibrary,
  saveLanguageStudioSocialVideoBytesToLibrary,
} from "@/app/lib/language-studio/library-images";
import { readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";
import { LANGUAGE_SOCIAL_PLATFORM_ORDER, type LanguageSocialPlatform, type LanguageSocialPost } from "@/app/lib/language-studio/types";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function isSocialPlatform(value: string): value is LanguageSocialPlatform {
  return LANGUAGE_SOCIAL_PLATFORM_ORDER.includes(value as LanguageSocialPlatform);
}

function socialPostsWithPlatformDefaults(translationPosts: LanguageSocialPost[] | undefined): LanguageSocialPost[] {
  const byPlatform = new Map((translationPosts ?? []).map((p) => [p.platform, p]));
  return LANGUAGE_SOCIAL_PLATFORM_ORDER.map((platform) => {
    const existing = byPlatform.get(platform);
    return (
      existing ?? {
        platform,
        text: "",
        headline: "",
        hashtags: [],
        callToAction: "",
      }
    );
  });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const translationId = String(form.get("translationId") ?? "").trim();
  const platformRaw = String(form.get("platform") ?? "").trim();
  const kind = String(form.get("kind") ?? "").trim() === "video" ? "video" : "image";

  if (!translationId) {
    return NextResponse.json({ error: "translationId is required." }, { status: 400 });
  }
  if (!isSocialPlatform(platformRaw)) {
    return NextResponse.json({ error: "Invalid or missing platform." }, { status: 400 });
  }
  const platform = platformRaw;

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }

  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (kind === "image") {
    if (mime && !ALLOWED_IMAGE_TYPES.has(mime)) {
      return NextResponse.json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." }, { status: 400 });
    }
  } else if (mime && !ALLOWED_VIDEO_TYPES.has(mime)) {
    return NextResponse.json({ error: "Unsupported video type. Use MP4, WebM, or MOV." }, { status: 400 });
  }

  const data = await readLanguageStudioData();
  const translation = data.translations[translationId];
  if (!translation) {
    return NextResponse.json({ error: "Translation not found." }, { status: 404 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const posts = socialPostsWithPlatformDefaults(translation.socialPosts);
    const idx = posts.findIndex((p) => p.platform === platform);
    const current = posts[idx];

    let patch: Partial<LanguageSocialPost>;
    if (kind === "image") {
      const { imageLibraryRel, imageUrl } = await saveLanguageStudioSocialImageBytesToLibrary(bytes, mime || file.type, req);
      patch = {
        imageLibraryRel,
        imageUrl,
      };
    } else {
      const { videoLibraryRel, videoUrl } = await saveLanguageStudioSocialVideoBytesToLibrary(bytes, mime || file.type, req);
      patch = {
        videoLibraryRel,
        videoUrl,
        videoLayout: current.videoLayout ?? (platform === "tiktok" || platform === "youtube" ? "shorts" : "landscape"),
      };
    }

    posts[idx] = { ...current, ...patch };
    const now = new Date().toISOString();
    const next = {
      ...translation,
      socialPosts: posts,
      updatedAt: now,
    };
    data.translations[next.id] = next;
    await writeLanguageStudioData(data);
    return NextResponse.json({ success: true, translation: next });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
