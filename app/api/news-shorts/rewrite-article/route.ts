import { NextResponse } from "next/server";
import { decodeHtmlEntities } from "@/app/lib/html-entities";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { buildFfmpegPlan, makeSlideCopy, type ParsedNewsShortArticle } from "@/app/lib/news-shorts-parser";
import {
  NEWS_SHORT_DEFAULT_STYLE,
  type NewsShortSlide,
  type NewsShortTemplateData,
} from "@/app/features/news-shorts/types";
import type { NewsShortParseRequest } from "@/app/features/news-shorts/types";

type Body = {
  // Source/template context
  sourceType: NewsShortParseRequest["sourceType"];
  sourceUrl: string;
  author: string;
  publishDate: string;
  heroImage: string;
  articleImages: string[];
  tags: string[];

  // Current parsed article
  title: string;
  strapline: string;
  articleBody: string[];
  keyQuotes: string[];

  // Preserve current editor overrides/style.
  slides?: NewsShortSlide[];
  style?: NewsShortTemplateData["style"];

  generateThreeVersions?: boolean;
  customPrompt?: string;
};

const DEFAULT_CUSTOM_PROMPT = `Rewrite this article for a sports news short.
Constraints:
- Use British English.
- Keep facts, names, numbers, clubs, and timelines consistent with the original input.
- Do not invent new details or new sources.
- Keep the tone journalistic and suitable for a spoken voiceover.
- Choose a body paragraph count that matches the user's brief: fewer paragraphs for punchy clips, more for explainers (each paragraph becomes one on-screen "beat" plus fixed intro/outro slides).

Output should be tighter, punchier, and more suitable for the short format.`;

/** Optional distribution context for Meta / short-form video — appended to every rewrite so prompts stay aligned with real delivery. */
const PLATFORM_SHORT_VIDEO_GUIDANCE = `
Platform tips (guidance; pick what fits the brand):
- Reels often perform well for discovery; aim for enough runtime that the story can breathe (many teams target 15–45s+ depending on beats), and keep content original/not recycled from other pages where platform rules require uniqueness for monetisation.
- Long, useful primary text and a thoughtful first comment can help surfacing; follow-up comments later can re-surface the post.
- Text-on-background (TOBI) and edited graphics can outperform plain stills; avoid implying facts that are not in the article.
- Link-in-first-comment is common; vary placement so every post does not look identical.
- Check monetisation dashboards regularly for bonus programmes.`;

function safeString(v: unknown): string {
  return typeof v === "string" ? decodeHtmlEntities(v.trim()) : "";
}

function clampParagraphs(ps: unknown): string[] {
  if (!Array.isArray(ps)) return [];
  return ps
    .map((p) => safeString(p))
    .filter(Boolean)
    .slice(0, 10);
}

function clampQuotes(qs: unknown): string[] {
  if (!Array.isArray(qs)) return [];
  const out = qs
    .map((q) => safeString(q))
    .filter(Boolean)
    .slice(0, 3);
  return out;
}

/** Detects phrases like "5 beats" / "4 slides" in the user's prompt to steer paragraph count. */
function inferParagraphCountHint(customPrompt: string): string | null {
  const m = customPrompt.match(/\b(\d{1,2})\s*(?:slides?|beats?|points?|paragraphs?|cards?|screens?)\b/i);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  const clamped = Math.min(10, Math.max(2, n));
  return `The user's prompt hints at about ${clamped} on-screen content beats — return roughly ${clamped} body paragraphs (each becomes one content slide between intro and outro), unless the source material cannot support that many distinct points.`;
}

export async function POST(req: Request) {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) {
    return NextResponse.json({ error: "OpenAI API key is not configured." }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Missing request body." }, { status: 400 });
  }

  const title = safeString(body.title);
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const generateThreeVersions = Boolean(body.generateThreeVersions);
  const customPrompt = safeString(body.customPrompt) || DEFAULT_CUSTOM_PROMPT;

  const systemPrompt = `You are rewriting sports news article copy for a video shorts template.
Critical rules:
- Output ONLY valid JSON matching the provided schema.
- Never invent facts, names, dates, statistics, odds, locations, or quotes beyond what is in the provided article text.
- Keep meaning faithful; you may paraphrase and adjust wording for clarity.
- Use British English spelling.`;

  const inputText = {
    headline: safeString(body.title),
    strapline: safeString(body.strapline),
    keyQuotes: Array.isArray(body.keyQuotes) ? body.keyQuotes : [],
    bodyParagraphs: Array.isArray(body.articleBody) ? body.articleBody : [],
  };

  try {
    const schemaSingle = {
      name: "news_short_article_rewrite",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          strapline: { type: "string" },
          bodyParagraphs: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 10 },
          keyQuotes: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
        },
        required: ["title", "strapline", "bodyParagraphs", "keyQuotes"],
      },
      strict: true,
    } as const;

    const schemaTriple = {
      name: "news_short_article_rewrite_versions",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          versionA: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              strapline: { type: "string" },
              bodyParagraphs: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 10 },
              keyQuotes: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
            },
            required: ["title", "strapline", "bodyParagraphs", "keyQuotes"],
          },
          versionB: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              strapline: { type: "string" },
              bodyParagraphs: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 10 },
              keyQuotes: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
            },
            required: ["title", "strapline", "bodyParagraphs", "keyQuotes"],
          },
          versionC: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              strapline: { type: "string" },
              bodyParagraphs: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 10 },
              keyQuotes: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
            },
            required: ["title", "strapline", "bodyParagraphs", "keyQuotes"],
          },
        },
        required: ["versionA", "versionB", "versionC"],
      },
      strict: true,
    } as const;

    const paragraphHint = inferParagraphCountHint(customPrompt);
    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            customPrompt,
            "",
            PLATFORM_SHORT_VIDEO_GUIDANCE.trim(),
            "",
            "Original input (verbatim):",
            JSON.stringify(inputText, null, 2),
            "",
            "Rewrite requirements:",
            "- Paraphrase without losing meaning.",
            "- Keep strapline short and deck-like (1 sentence).",
            "- Return between 2 and 10 body paragraphs. Each paragraph will map to one content slide between intro and outro;",
            "  choose fewer paragraphs (2–4) for a punchy Reels-style hit, or more (5–10) when the user's brief asks for depth.",
            paragraphHint ? `- ${paragraphHint}` : "",
            "- Key quotes must be taken from or faithful to the supplied article text (no fabricated quotes).",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      cache: "no-store",
      response_format: {
        type: "json_schema",
        json_schema: generateThreeVersions ? schemaTriple : schemaSingle,
      },
    } as const;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: payload.model,
        temperature: payload.temperature,
        messages: payload.messages,
        response_format: payload.response_format,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as
      | { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
      | Record<string, unknown>;

    if (!res.ok) {
      const message =
        typeof data === "object" &&
        data &&
        "error" in data &&
        data.error &&
        typeof (data.error as { message?: string }).message === "string"
          ? (data.error as { message?: string }).message
          : `OpenAI request failed (${res.status})`;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const content = Array.isArray((data as { choices?: Array<{ message?: { content?: string } }> }).choices)
      ? (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content
      : "";

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "No response content from OpenAI." }, { status: 502 });
    }

    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "AI returned non-JSON output." }, { status: 502 });
    }

    const buildTemplateFromRewrite = (rewritten: {
      title: string;
      strapline: string;
      bodyParagraphs: string[];
      keyQuotes: string[];
    }): NewsShortTemplateData => {
      const article: ParsedNewsShortArticle = {
        sourceUrl: body.sourceUrl,
        title: safeString(rewritten.title),
        strapline: safeString(rewritten.strapline),
        author: safeString(body.author),
        publishDate: safeString(body.publishDate),
        heroImage: safeString(body.heroImage),
        articleImages: Array.isArray(body.articleImages) ? body.articleImages : [],
        tags: Array.isArray(body.tags) ? body.tags : [],
        bodyParagraphs: rewritten.bodyParagraphs,
        keyQuotes: rewritten.keyQuotes,
      };

      const baseSlides = makeSlideCopy(article);
      const mergedSlides = (Array.isArray(body.slides) ? baseSlides.map((s) => {
        const old = body.slides?.find((o) => o.id === s.id);
        if (!old) return s;
        return {
          ...s,
          // Keep user-controlled slide timing/animations/image overrides.
          durationSec: old.durationSec ?? s.durationSec,
          animationStyle: old.animationStyle ?? s.animationStyle,
          backgroundAnimation: old.backgroundAnimation ?? s.backgroundAnimation,
          backgroundZoom: old.backgroundZoom ?? s.backgroundZoom,
          imageUrl: old.imageUrl || s.imageUrl,
          label: old.label || s.label,
        };
      }) : baseSlides) as NewsShortSlide[];

      const template: NewsShortTemplateData = {
        sourceType: body.sourceType,
        sourceUrl: article.sourceUrl,
        title: article.title,
        strapline: article.strapline,
        author: article.author,
        publishDate: article.publishDate,
        heroImage: article.heroImage,
        articleImages: article.articleImages,
        tags: article.tags,
        articleBody: article.bodyParagraphs,
        keyQuotes: article.keyQuotes,
        slides: mergedSlides,
        style: body.style ?? { ...NEWS_SHORT_DEFAULT_STYLE },
        notes:
          "Auto-generated via AI article rewrite. Slide count follows body paragraphs (intro + one beat per paragraph + outro). Review before exporting.",
      };
      return template;
    };

    if (!generateThreeVersions) {
      const o = parsedRaw as Record<string, unknown>;
      const out = {
        title: safeString(o.title),
        strapline: safeString(o.strapline),
        bodyParagraphs: clampParagraphs(o.bodyParagraphs),
        keyQuotes: clampQuotes(o.keyQuotes),
      };
      const template = buildTemplateFromRewrite(out);
      return NextResponse.json({ ok: true, template, ffmpegPlan: buildFfmpegPlan(template) });
    }

    const versions = parsedRaw as Record<string, unknown>;
    const vA = versions.versionA as Record<string, unknown>;
    const vB = versions.versionB as Record<string, unknown>;
    const vC = versions.versionC as Record<string, unknown>;

    const tA = buildTemplateFromRewrite({
      title: safeString(vA.title),
      strapline: safeString(vA.strapline),
      bodyParagraphs: clampParagraphs(vA.bodyParagraphs),
      keyQuotes: clampQuotes(vA.keyQuotes),
    });
    const tB = buildTemplateFromRewrite({
      title: safeString(vB.title),
      strapline: safeString(vB.strapline),
      bodyParagraphs: clampParagraphs(vB.bodyParagraphs),
      keyQuotes: clampQuotes(vB.keyQuotes),
    });
    const tC = buildTemplateFromRewrite({
      title: safeString(vC.title),
      strapline: safeString(vC.strapline),
      bodyParagraphs: clampParagraphs(vC.bodyParagraphs),
      keyQuotes: clampQuotes(vC.keyQuotes),
    });

    return NextResponse.json({
      ok: true,
      versions: {
        versionA: { template: tA, ffmpegPlan: buildFfmpegPlan(tA) },
        versionB: { template: tB, ffmpegPlan: buildFfmpegPlan(tB) },
        versionC: { template: tC, ffmpegPlan: buildFfmpegPlan(tC) },
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI rewrite failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

