import fs from "fs/promises";
import { NextResponse } from "next/server";
import { renderSceneToPng, withSharedPuppeteerBrowser } from "@/app/features/render/scene-renderer";
import { normalizeVoiceProviderPreference, resolveVoiceTrackWithFallback } from "@/app/features/audio";
import { buildShortVideo } from "@/app/features/video/video-builder";
import { assertVoiceRecordingRel, normalizeContentIdForFilename } from "@/app/lib/editor-upload";
import { buildVideoSlug } from "@/app/lib/seo-slug";
import { outputDir } from "@/app/lib/paths";
import type { VoiceGender } from "@/types";
import type { NewsShortTemplateData } from "@/app/features/news-shorts/types";
import path from "path";
import { mergeNewsShortStyleForBrand } from "@/app/features/news-shorts/news-shorts-brand-templates";
import {
  normalizeCreativeVideoFormat,
  videoDimensionsForCreativeFormat,
} from "@/app/features/news-shorts/creative-video-format";
import { newsShortSceneDataForSlide } from "@/app/lib/news-shorts-slide-render-data";

type Body = {
  contentId?: string;
  template: NewsShortTemplateData;
  additionalKeywords?: string[];
  voiceGender?: VoiceGender;
  voiceSpeed?: number;
  elevenlabsVoiceId?: string;
  voiceProviderPreference?: string;
  voiceRecordingRel?: string;
  burnSubtitles?: boolean;
};

function toTemplateId(type: string): string {
  if (type === "intro") return "news-short-intro";
  if (type === "outro") return "news-short-outro";
  return "news-short-content";
}

function deriveSearchKeywords(template: NewsShortTemplateData, extras: string[] = []): string[] {
  const pool = [
    template.title,
    template.author,
    template.sourceUrl,
    ...(template.tags ?? []),
    ...extras,
    ...template.slides.flatMap((s) => s.highlightWords ?? []),
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of pool) {
    const keyword = (raw ?? "").trim().replace(/\s+/g, " ");
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(keyword);
  }
  return out.slice(0, 30);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const raw = body?.template;
    if (!raw || !Array.isArray(raw.slides) || raw.slides.length === 0) {
      return NextResponse.json({ error: "template with slides is required" }, { status: 400 });
    }
    const template: NewsShortTemplateData = {
      ...raw,
      style: mergeNewsShortStyleForBrand(raw.brandTemplateId, raw.style),
    };

    const contentId = normalizeContentIdForFilename(body.contentId ?? "");
    const scenes = template.slides.map((slide, i) => ({
      id: slide.id || `slide-${i + 1}`,
      templateId: toTemplateId(slide.type),
      durationSec: Math.max(3, Math.min(8, Number(slide.durationSec || 5))),
      caption: slide.headline || slide.subline || `Slide ${i + 1}`,
      data: newsShortSceneDataForSlide(template, slide, i, {
        heroImageForScene: slide.imageUrl || template.heroImage,
      }),
    }));

    const images: { sceneId: string; path: string }[] = [];
    await withSharedPuppeteerBrowser(async (browser) => {
      for (const scene of scenes) {
        const imagePath = await renderSceneToPng(
          {
            contentId,
            sceneId: scene.id,
            templateId: scene.templateId,
            data: scene.data,
          },
          { browser },
        );
        images.push({ sceneId: scene.id, path: imagePath });
      }
    });

    const scriptFromSlides = template.slides.map((s) => [s.headline, s.subline].filter(Boolean).join(". ")).join(". ");
    const script = scriptFromSlides.replace(/\s+/g, " ").trim();
    const gender: VoiceGender = body.voiceGender === "male" ? "male" : "female";
    const speedRaw = Number(body.voiceSpeed);
    const speed = Number.isFinite(speedRaw) ? Math.max(0.5, Math.min(2, speedRaw)) : 1;

    let audioPath: string;
    const recRel = body.voiceRecordingRel?.trim();
    if (recRel) {
      const norm = assertVoiceRecordingRel(recRel, contentId);
      audioPath = path.join(outputDir(), ...norm.split("/"));
      await fs.access(audioPath);
    } else {
      const audio = await resolveVoiceTrackWithFallback(script, contentId, {
        gender,
        speed,
        voiceId: body.elevenlabsVoiceId?.trim() || undefined,
        providerPreference: normalizeVoiceProviderPreference(body.voiceProviderPreference),
      });
      audioPath = audio.audioPath;
    }

    const seoTitle = (template.title || "PlanetF1 News Short").slice(0, 300);
    const seoSlug = buildVideoSlug(seoTitle, contentId);
    const searchKeywords = deriveSearchKeywords(template, Array.isArray(body.additionalKeywords) ? body.additionalKeywords : []);
    const outputDims = videoDimensionsForCreativeFormat(normalizeCreativeVideoFormat(template.creativeVideoFormat));

    const build = await buildShortVideo({
      contentId,
      format: "news-shorts",
      outputWidth: outputDims.width,
      outputHeight: outputDims.height,
      scenes: scenes.map((scene, idx) => ({
        imagePath: images[idx]!.path,
        durationSec: scene.durationSec,
        caption: scene.caption,
      })),
      audioPath,
      burnSubtitles: body.burnSubtitles ?? true,
      seoTitle,
      seoSlug,
      searchKeywords,
    });

    return NextResponse.json({
      ok: true,
      contentId,
      images,
      audioPath,
      videoPath: build.videoPath,
      videoRel: path.relative(outputDir(), build.videoPath).split(path.sep).join("/"),
      srtPath: build.srtPath,
      concatPath: build.concatPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
