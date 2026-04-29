import { NextResponse } from "next/server";
import { buildFfmpegPlan, buildNewsShortsTemplate } from "@/app/lib/news-shorts-parser";
import type { NewsShortParseRequest } from "@/app/features/news-shorts/types";
import { isSafeContentId, saveRunwayImageBufferToLibraryBackground } from "@/app/lib/editor-upload";
import { upsertLibraryMetadata } from "@/app/lib/library-metadata";

function isString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validateBody(raw: unknown): NewsShortParseRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  if (body.sourceType === "url" && isString(body.url)) {
    return {
      sourceType: "url",
      url: body.url.trim(),
      contentId: isString(body.contentId) ? body.contentId.trim() : undefined,
    };
  }
  if (body.sourceType === "rss" && isString(body.feedUrl)) {
    return {
      sourceType: "rss",
      feedUrl: body.feedUrl.trim(),
      itemUrl: isString(body.itemUrl) ? body.itemUrl.trim() : undefined,
      itemTitle: isString(body.itemTitle) ? body.itemTitle.trim() : undefined,
      itemRawXml: isString(body.itemRawXml) ? body.itemRawXml.trim() : undefined,
      contentId: isString(body.contentId) ? body.contentId.trim() : undefined,
    };
  }
  return null;
}

function deriveSearchKeywords(template: Awaited<ReturnType<typeof buildNewsShortsTemplate>>): string[] {
  const pool = [
    template.title,
    template.author,
    template.sourceUrl,
    ...(template.tags ?? []),
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
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  const input = validateBody(json);
  if (!input) {
    return NextResponse.json(
      { error: "Body must be { sourceType:'url', url } or { sourceType:'rss', feedUrl, ... }." },
      { status: 400 },
    );
  }

  try {
    const template = await buildNewsShortsTemplate(input);
    const ffmpegPlan = buildFfmpegPlan(template);
    let importedLibraryImageRel: string | undefined;
    const contentId = (input.contentId ?? "").trim();
    if (isSafeContentId(contentId) && /^https?:\/\//i.test(template.heroImage || "")) {
      try {
        const res = await fetch(template.heroImage, { cache: "no-store" });
        if (res.ok) {
          const bytes = Buffer.from(await res.arrayBuffer());
          const saved = await saveRunwayImageBufferToLibraryBackground(contentId, bytes, res.headers.get("content-type"));
          importedLibraryImageRel = saved.backgroundImageRel;
        }
      } catch {
        // Non-fatal: parsing should still succeed even if the source image cannot be imported.
      }
    }
    await upsertLibraryMetadata(contentId, {
      title: template.title,
      sourceUrl: template.sourceUrl,
      keywords: deriveSearchKeywords(template),
    });
    return NextResponse.json({ ok: true, template, ffmpegPlan, importedLibraryImageRel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse article.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
