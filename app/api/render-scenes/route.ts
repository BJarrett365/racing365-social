import { NextResponse } from "next/server";
import { renderSceneToPng, withSharedPuppeteerBrowser } from "@/app/features/render/scene-renderer";
import { coalesceGlobalBackgroundImageRel } from "@/app/lib/background-image-rel";
import {
  assertCrossContentBackdropRel,
  normalizeContentIdForFilename,
  resolveEditorBackdropDataUrl,
} from "@/app/lib/editor-upload";
import { outputDir } from "@/app/lib/paths";
import { shouldUseNetlifyBlobStore } from "@/app/lib/netlify-blob-json";
import type { SceneSpec } from "@/types";
import fs from "fs/promises";
import path from "path";
import { writeLibraryBlobAsset } from "@/app/lib/library-blob-assets";
import {
  resolveF1TemplateDataForRender,
  resolvePublicImageDataUrl,
} from "@/app/lib/f1-driver-images";

type Body = {
  contentId: string;
  scenes: SceneSpec[];
  /** Output dimensions for scene PNG render (defaults to 1080x1920). */
  width?: number;
  height?: number;
  /** From editor upload — full-bleed backdrop (preferred over video frame) */
  backgroundImageRel?: string | null;
  /** Optional per-scene background images */
  backgroundImageRelBySceneId?: Record<string, string> | null;
  /** PNG frame grab from uploaded video (ignored when backgroundVideoRel is set) */
  backgroundVideoFrameRel?: string | null;
  /** Motion background — scenes render with alpha; FFmpeg composites under template */
  backgroundVideoRel?: string | null;
  /** When motion backdrop is active — uniform black wash (0–0.85, default ~0.3) */
  motionBackdropOpaqueOpacity?: number;
  /** When motion backdrop is active — readability gradient strength (0.25–1.6, default ~0.45) */
  motionBackdropDimStrength?: number;
  /** Client compositor PNG (data URL) — drawn between backdrop dim and template (all scenes if no per-scene map) */
  editorCompositorImageUrl?: string | null;
  /** Per-scene compositor PNGs — overrides `editorCompositorImageUrl` for matching `sceneId` */
  editorCompositorBySceneId?: Record<string, string> | null;
  /** Retina export for editor save (2 recommended). Default 1 for video pipeline. */
  pixelRatio?: number;
  /** News Shorts: hide headline/subline on PNGs when burning styled ASS in FFmpeg. */
  editorSubtitleOverlayOnly?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.contentId || !body?.scenes?.length) {
      return NextResponse.json({ error: "contentId and scenes required" }, { status: 400 });
    }

    const canonicalContentId = normalizeContentIdForFilename(String(body.contentId).trim());

    const videoRel = body.backgroundVideoRel?.trim();
    const motionBackdropExtra: Record<string, unknown> =
      videoRel &&
      (body.motionBackdropOpaqueOpacity !== undefined || body.motionBackdropDimStrength !== undefined)
        ? {
            ...(body.motionBackdropOpaqueOpacity !== undefined
              ? { motionBackdropOpaqueOpacity: body.motionBackdropOpaqueOpacity }
              : {}),
            ...(body.motionBackdropDimStrength !== undefined
              ? { motionBackdropDimStrength: body.motionBackdropDimStrength }
              : {}),
          }
        : {};
    let backdropFields: Record<string, unknown> = {};
    const backdropBySceneDataUrl: Record<string, string> = {};

    if (videoRel) {
      try {
        assertCrossContentBackdropRel(videoRel);
      } catch {
        return NextResponse.json({ error: "Invalid background video path" }, { status: 400 });
      }
      backdropFields = { editorTransparentBackground: true };
    } else {
      let backdropDataUrl: string | undefined;
      try {
        const coalescedRel = coalesceGlobalBackgroundImageRel(
          body.backgroundImageRel,
          body.backgroundImageRelBySceneId,
        );
        backdropDataUrl = await resolveEditorBackdropDataUrl(
          canonicalContentId,
          coalescedRel,
          body.backgroundVideoFrameRel,
        );
      } catch {
        return NextResponse.json({ error: "Invalid background asset path" }, { status: 400 });
      }
      if (backdropDataUrl) {
        backdropFields = { editorBackgroundImageUrl: backdropDataUrl };
      }
      const byScene = body.backgroundImageRelBySceneId;
      if (byScene && typeof byScene === "object") {
        for (const [sceneId, rel] of Object.entries(byScene)) {
          if (!sceneId || typeof rel !== "string") continue;
          const u = await resolveEditorBackdropDataUrl(canonicalContentId, rel, null);
          if (u) backdropBySceneDataUrl[sceneId] = u;
        }
      }
    }

    const legacyComp = body.editorCompositorImageUrl?.trim();
    const byScene = body.editorCompositorBySceneId;
    const hasPerScene =
      byScene &&
      typeof byScene === "object" &&
      Object.keys(byScene).some((k) => typeof byScene[k] === "string" && byScene[k]!.startsWith("data:image/"));

    const pixelRatio =
      typeof body.pixelRatio === "number" && body.pixelRatio >= 1 ? Math.min(3, body.pixelRatio) : 1;

    return await withSharedPuppeteerBrowser(async (browser) => {
    const outDir = outputDir();
    const outputs: {
      sceneId: string;
      path: string;
      rel: string;
      underlayPath?: string;
      underlayRel?: string;
      diskRel?: string;
      diskUnderlayRel?: string;
    }[] = [];
    for (const s of body.scenes) {
      const sceneComp =
        hasPerScene && typeof byScene![s.id] === "string" && byScene![s.id]!.startsWith("data:image/")
          ? byScene![s.id]!.trim()
          : typeof legacyComp === "string" && legacyComp.startsWith("data:image/")
            ? legacyComp
            : undefined;
      const sceneBg = backdropBySceneDataUrl[s.id];
      const sceneBackdropUnderlay = {
        ...backdropFields,
        ...(sceneBg ? { editorBackgroundImageUrl: sceneBg } : {}),
      };
      const sceneBackdrop = {
        ...sceneBackdropUnderlay,
        ...(sceneComp !== undefined ? { editorCompositorImageUrl: sceneComp } : {}),
      };

      let sceneData: Record<string, unknown> = { ...s.data };
      if (s.templateId.startsWith("f1-grid") || s.templateId.startsWith("f1-results")) {
        sceneData = await resolveF1TemplateDataForRender(sceneData);
      }
      const resolvedPlayerImageUrl = await resolvePublicImageDataUrl(sceneData.playerImageUrl);
      const resolvedLeftClubLogoUrl = await resolvePublicImageDataUrl(sceneData.leftClubLogoUrl);
      const resolvedRightClubLogoUrl = await resolvePublicImageDataUrl(sceneData.rightClubLogoUrl);
      const resolvedHeroImageUrl = await resolvePublicImageDataUrl(sceneData.heroImage);
      const merged = {
        ...sceneData,
        ...(typeof body.width === "number" ? { width: body.width } : {}),
        ...(typeof body.height === "number" ? { height: body.height } : {}),
        ...motionBackdropExtra,
        ...(resolvedPlayerImageUrl ? { playerImageUrl: resolvedPlayerImageUrl } : {}),
        ...(resolvedLeftClubLogoUrl ? { leftClubLogoUrl: resolvedLeftClubLogoUrl } : {}),
        ...(resolvedRightClubLogoUrl ? { rightClubLogoUrl: resolvedRightClubLogoUrl } : {}),
        ...(resolvedHeroImageUrl ? { heroImage: resolvedHeroImageUrl } : {}),
      };

      const imagePath = await renderSceneToPng(
        {
          contentId: canonicalContentId,
          sceneId: s.id,
          templateId: s.templateId,
          data: {
            ...merged,
            ...sceneBackdrop,
            ...(body.editorSubtitleOverlayOnly ? { editorSubtitleOverlayOnly: true } : {}),
          },
        },
        { browser, deviceScaleFactor: pixelRatio },
      );

      let underlayPath: string;
      if (sceneComp !== undefined) {
        underlayPath = await renderSceneToPng(
          {
            contentId: canonicalContentId,
            sceneId: s.id,
            templateId: s.templateId,
            data: {
              ...merged,
              ...sceneBackdropUnderlay,
              ...(body.editorSubtitleOverlayOnly ? { editorSubtitleOverlayOnly: true } : {}),
            },
            fileSuffix: "underlay",
          },
          { browser, deviceScaleFactor: pixelRatio },
        );
      } else {
        underlayPath = imagePath;
      }

      const diskRel = path.relative(outDir, imagePath).split(path.sep).join("/");
      const diskUnderlayRel = path.relative(outDir, underlayPath).split(path.sep).join("/");
      const safeSceneId = normalizeContentIdForFilename(String(s.id || "scene"));
      const rel = `images/library/${canonicalContentId}/render-${safeSceneId}.png`;
      const underlayRel = sceneComp !== undefined
        ? `images/library/${canonicalContentId}/render-${safeSceneId}-underlay.png`
        : rel;

      async function publishRenderedPng(sourceAbs: string, publishRel: string) {
        const destAbs = path.join(outDir, ...publishRel.split("/"));
        await fs.mkdir(path.dirname(destAbs), { recursive: true });
        await fs.copyFile(sourceAbs, destAbs);
        if (shouldUseNetlifyBlobStore()) {
          await writeLibraryBlobAsset(publishRel, await fs.readFile(destAbs), "image/png");
        }
      }

      await publishRenderedPng(imagePath, rel);
      if (underlayPath !== imagePath) {
        await publishRenderedPng(underlayPath, underlayRel);
      }

      outputs.push({ sceneId: s.id, path: imagePath, rel, underlayPath, underlayRel, diskRel, diskUnderlayRel });
    }

    return NextResponse.json({ contentId: canonicalContentId, images: outputs });
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
