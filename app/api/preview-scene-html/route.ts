import { NextResponse } from "next/server";
import { renderHtmlTemplate } from "@/app/features/render/html-templates";
import { resolveF1TemplateDataForRender } from "@/app/lib/f1-driver-images";
import type { SceneSpec } from "@/types";

type Body = {
  scene: SceneSpec;
  width?: number;
  height?: number;
  backgroundImageRel?: string | null;
  backgroundImageRelBySceneId?: Record<string, string> | null;
  backgroundVideoFrameRel?: string | null;
  backgroundVideoRel?: string | null;
};

function fileUrl(rel: string): string {
  return `/api/file?rel=${encodeURIComponent(rel)}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.scene?.templateId || !body.scene.id) {
      return NextResponse.json({ error: "scene is required" }, { status: 400 });
    }

    const sceneBgRel = body.backgroundImageRelBySceneId?.[body.scene.id]?.trim();
    const globalBgRel = body.backgroundImageRel?.trim();
    const videoPosterRel = body.backgroundVideoRel?.trim() ? body.backgroundVideoFrameRel?.trim() : "";
    const previewBgRel = sceneBgRel || globalBgRel || videoPosterRel;
    let sceneData: Record<string, unknown> = { ...body.scene.data };
    if (
      body.scene.templateId.startsWith("f1-grid") ||
      body.scene.templateId.startsWith("f1-results")
    ) {
      sceneData = await resolveF1TemplateDataForRender(sceneData);
    }
    const html = renderHtmlTemplate(body.scene.templateId, {
      ...sceneData,
      ...(typeof body.width === "number" ? { width: body.width } : {}),
      ...(typeof body.height === "number" ? { height: body.height } : {}),
      ...(previewBgRel ? { editorBackgroundImageUrl: fileUrl(previewBgRel) } : {}),
    });

    return NextResponse.json({ html });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
