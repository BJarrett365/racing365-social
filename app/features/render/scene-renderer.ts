import fs from "fs/promises";
import path from "path";
import type { Browser } from "puppeteer";
import { renderHtmlTemplate } from "./html-templates";
import { normalizeContentIdForFilename } from "@/app/lib/editor-upload";
import { outputImagesDir } from "@/app/lib/paths";
import { loadPuppeteer, resolvePuppeteerLaunchOptions } from "@/app/lib/puppeteer-launch";

export interface RenderSceneInput {
  contentId: string;
  sceneId: string;
  templateId: string;
  data: Record<string, unknown>;
  /** Write `{sceneId}-{fileSuffix}.png` instead of `{sceneId}.png` */
  fileSuffix?: string;
}

export type RenderSceneToPngOptions = {
  /**
   * When set, this browser is reused and **not** closed after the render (batch scene pipelines).
   * Each render still uses a fresh page and closes it when done.
   */
  browser?: Browser;
};

/** Launch one browser, run `fn`, then close (shared pattern for multi-scene API routes). */
export async function withSharedPuppeteerBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch(await resolvePuppeteerLaunchOptions());
  try {
    return await fn(browser);
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function renderSceneToPng(
  input: RenderSceneInput,
  options?: RenderSceneToPngOptions,
): Promise<string> {
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

  const reuseBrowser = options?.browser;
  const puppeteer = await loadPuppeteer();
  const browser = reuseBrowser ?? (await puppeteer.launch(await resolvePuppeteerLaunchOptions()));
  const ownBrowser = !reuseBrowser;
  try {
    const page = await browser.newPage();
    try {
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
        await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 12_000 });
        await page
          .evaluate(() =>
            Promise.race([
              Promise.all(
              Array.from(document.images)
                .filter((img) => !img.complete)
                .map(
                  (img) =>
                    new Promise<void>((resolve) => {
                      const done = () => resolve();
                      img.addEventListener("load", done, { once: true });
                      img.addEventListener("error", done, { once: true });
                    }),
                ),
              ),
              new Promise<void>((resolve) => setTimeout(resolve, 3_000)),
            ]),
          )
          .catch(() => {});
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
      await page.close().catch(() => {});
    }
  } finally {
    if (ownBrowser) await browser.close().catch(() => {});
  }

  return outPath;
}

export async function renderManyScenes(
  contentId: string,
  scenes: { id: string; templateId: string; data: Record<string, unknown> }[],
): Promise<string[]> {
  const canonical = normalizeContentIdForFilename(contentId);
  return withSharedPuppeteerBrowser(async (browser) => {
    const paths: string[] = [];
    for (const s of scenes) {
      paths.push(
        await renderSceneToPng(
          {
            contentId,
            sceneId: s.id,
            templateId: s.templateId,
            data: { ...s.data, contentId: canonical },
          },
          { browser },
        ),
      );
    }
    return paths;
  });
}
