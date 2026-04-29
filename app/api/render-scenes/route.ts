import { NextResponse } from "next/server";
import { renderSceneToPng } from "@/app/features/render/scene-renderer";
import { coalesceGlobalBackgroundImageRel } from "@/app/lib/background-image-rel";
import {
  assertCrossContentBackdropRel,
  normalizeContentIdForFilename,
  resolveEditorBackdropDataUrl,
} from "@/app/lib/editor-upload";
import { outputDir } from "@/app/lib/paths";
import type { SceneSpec } from "@/types";
import fs from "fs/promises";
import path from "path";

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
  /** News Shorts: hide headline/subline on PNGs when burning styled ASS in FFmpeg. */
  editorSubtitleOverlayOnly?: boolean;
};

async function resolveRenderableImageUrl(raw: unknown): Promise<string | undefined> {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (!v) return undefined;
  if (v.startsWith("data:image/")) return v;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (!v.startsWith("/")) return v;

  // `/...` in template data points to Next `public/` files, but Puppeteer `setContent`
  // has no site origin; convert local public assets to data URLs.
  const rel = v.replace(/^\/+/, "");
  const abs = path.join(process.cwd(), "public", rel);
  try {
    await fs.access(abs);
  } catch {
    return v;
  }
  const buf = await fs.readFile(abs);
  const ext = path.extname(abs).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : ext === ".svg"
            ? "image/svg+xml"
            : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

const F1_PLACEHOLDER_PUBLIC = "/grid/drivers/placeholder.svg";

async function resolveF1DriverRowImages(rows: unknown[]): Promise<unknown[]> {
  return Promise.all(
    rows.map(async (d) => {
      if (!d || typeof d !== "object") return d;
      const o = d as Record<string, unknown>;
      const raw = typeof o.image === "string" ? o.image.trim() : "";
      const path = raw || F1_PLACEHOLDER_PUBLIC;
      let img = await resolveRenderableImageUrl(path);
      if (typeof img !== "string" || !img.startsWith("data:")) {
        img = (await resolveRenderableImageUrl(F1_PLACEHOLDER_PUBLIC)) ?? "";
      }
      return img ? { ...o, image: img } : o;
    }),
  );
}

/** F1 grid / results: `img src="/grid/drivers/…"` — Puppeteer `setContent` has no origin; inline as data URLs. */
async function resolveF1TemplateDataForRender(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  let out: Record<string, unknown> = { ...data };
  const logoRaw = out.logoUrl;
  if (typeof logoRaw === "string" && logoRaw.trim().startsWith("/")) {
    const logo = await resolveRenderableImageUrl(logoRaw);
    if (typeof logo === "string" && logo.startsWith("data:")) {
      out = { ...out, logoUrl: logo };
    }
  }
  const gridDrivers = out.gridDrivers;
  if (Array.isArray(gridDrivers)) {
    out = { ...out, gridDrivers: await resolveF1DriverRowImages(gridDrivers) };
  }
  const resultDrivers = out.resultDrivers;
  if (Array.isArray(resultDrivers)) {
    out = { ...out, resultDrivers: await resolveF1DriverRowImages(resultDrivers) };
  }
  const fl = out.fastestLap;
  if (fl && typeof fl === "object") {
    const o = fl as Record<string, unknown>;
    const raw = typeof o.image === "string" ? o.image.trim() : "";
    const path = raw || F1_PLACEHOLDER_PUBLIC;
    let img = await resolveRenderableImageUrl(path);
    if (typeof img !== "string" || !img.startsWith("data:")) {
      img = (await resolveRenderableImageUrl(F1_PLACEHOLDER_PUBLIC)) ?? "";
    }
    out = { ...out, fastestLap: img ? { ...o, image: img } : o };
  }
  return out;
}

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

    const outDir = outputDir();
    const outputs: { sceneId: string; path: string; rel: string; underlayPath?: string; underlayRel?: string }[] = [];
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
      const resolvedPlayerImageUrl = await resolveRenderableImageUrl(sceneData.playerImageUrl);
      const resolvedLeftClubLogoUrl = await resolveRenderableImageUrl(sceneData.leftClubLogoUrl);
      const resolvedRightClubLogoUrl = await resolveRenderableImageUrl(sceneData.rightClubLogoUrl);
      const resolvedHeroImageUrl = await resolveRenderableImageUrl(sceneData.heroImage);
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

      const imagePath = await renderSceneToPng({
        contentId: canonicalContentId,
        sceneId: s.id,
        templateId: s.templateId,
        data: {
          ...merged,
          ...sceneBackdrop,
          ...(body.editorSubtitleOverlayOnly ? { editorSubtitleOverlayOnly: true } : {}),
        },
      });

      let underlayPath: string;
      if (sceneComp !== undefined) {
        underlayPath = await renderSceneToPng({
          contentId: canonicalContentId,
          sceneId: s.id,
          templateId: s.templateId,
          data: {
            ...merged,
            ...sceneBackdropUnderlay,
            ...(body.editorSubtitleOverlayOnly ? { editorSubtitleOverlayOnly: true } : {}),
          },
          fileSuffix: "underlay",
        });
      } else {
        underlayPath = imagePath;
      }

      const rel = path.relative(outDir, imagePath).split(path.sep).join("/");
      const underlayRel = path.relative(outDir, underlayPath).split(path.sep).join("/");

      outputs.push({ sceneId: s.id, path: imagePath, rel, underlayPath, underlayRel });
    }

    return NextResponse.json({ contentId: canonicalContentId, images: outputs });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
