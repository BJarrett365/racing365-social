import fs from "fs/promises";
import path from "path";
import { renderHtmlTemplate } from "./html-templates";
import { normalizeContentIdForFilename } from "@/app/lib/editor-upload";
import { outputImagesDir } from "@/app/lib/paths";
import { getPuppeteerLaunchOptions, loadPuppeteer } from "@/app/lib/puppeteer-launch";

export interface RenderSceneInput {
  contentId: string;
  sceneId: string;
  templateId: string;
  data: Record<string, unknown>;
  /** Write `{sceneId}-{fileSuffix}.png` instead of `{sceneId}.png` */
  fileSuffix?: string;
}

export async function renderSceneToPng(input: RenderSceneInput): Promise<string> {
  /** Must match `toContentId` / `normalizeContentIdForFilename` in news-shorts build so PNG paths align with FFmpeg. */
  const canonicalContentId = normalizeContentIdForFilename(input.contentId);
  /** Single-frame PNG must show final text state (CSS keyframe animations start at opacity 0). */
  const html = renderHtmlTemplate(input.templateId, {
    ...input.data,
    contentId: canonicalContentId,
    r365StaticPng: true,
  });
  const w = Number(input.data.width ?? 1080);
  const h = Number(input.data.height ?? 1920);

  const dir = path.join(outputImagesDir(), canonicalContentId);
  await fs.mkdir(dir, { recursive: true });
  const baseName = input.fileSuffix ? `${input.sceneId}-${input.fileSuffix}` : input.sceneId;
  const outPath = path.join(dir, `${baseName}.png`);

  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch(getPuppeteerLaunchOptions());
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(45_000);
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    const omitBackground = Boolean(input.data.editorTransparentBackground);
    const cdp = omitBackground ? await page.createCDPSession() : undefined;
    try {
      if (cdp) {
        await cdp.send("Emulation.setDefaultBackgroundColorOverride", {
          color: { r: 0, g: 0, b: 0, a: 0 },
        });
      }
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.screenshot({ path: outPath, type: "png", omitBackground });
    } finally {
      if (cdp) {
        try {
          await cdp.send("Emulation.setDefaultBackgroundColorOverride", {});
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    await browser.close();
  }

  return outPath;
}

export async function renderManyScenes(
  contentId: string,
  scenes: { id: string; templateId: string; data: Record<string, unknown> }[],
): Promise<string[]> {
  const canonical = normalizeContentIdForFilename(contentId);
  const paths: string[] = [];
  for (const s of scenes) {
    paths.push(
      await renderSceneToPng({
        contentId,
        sceneId: s.id,
        templateId: s.templateId,
        data: { ...s.data, contentId: canonical },
      }),
    );
  }
  return paths;
}
