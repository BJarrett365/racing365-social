import { NextResponse } from "next/server";
import { renderSceneToPng, withSharedPuppeteerBrowser } from "@/app/features/render/scene-renderer";
import type { NewsShortTemplateData } from "@/app/features/news-shorts/types";
import { mergeNewsShortStyleForBrand } from "@/app/features/news-shorts/news-shorts-brand-templates";
import { newsShortSceneDataForSlide } from "@/app/lib/news-shorts-slide-render-data";

type Body = {
  contentId?: string;
  template: NewsShortTemplateData;
};

function toContentId(input?: string): string {
  const raw = (input ?? "").trim();
  if (raw) return raw.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80) || `news-${Date.now()}`;
  return `news-${Date.now()}`;
}

function toTemplateId(type: string): string {
  if (type === "intro") return "news-short-intro";
  if (type === "outro") return "news-short-outro";
  return "news-short-content";
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

    const contentId = toContentId(body.contentId);
    const scenes = template.slides.map((slide, i) => ({
      id: slide.id || `slide-${i + 1}`,
      templateId: toTemplateId(slide.type),
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

    return NextResponse.json({
      ok: true,
      contentId,
      images,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
