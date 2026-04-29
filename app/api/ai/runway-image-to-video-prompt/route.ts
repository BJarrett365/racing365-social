import { NextResponse } from "next/server";
import { getServerSecret } from "@/app/lib/server-secrets";
import type { RunwayBgBrand } from "@/app/lib/runway-background-prompt-types";
import { getBrandGuidelinesAppendixForRunwayBrand } from "@/app/lib/brand-guidelines-store";
import { resolveBuiltinPromptBody } from "@/app/lib/builtin-prompt-resolve";

type SlideIn = {
  id?: string;
  type?: string;
  label: string;
  headline: string;
  subline: string;
};

type Body = {
  brand: RunwayBgBrand;
  title: string;
  strapline?: string;
  sourceUrl?: string;
  tags?: string[];
  slides: SlideIn[];
  /** Optional excerpt from parsed article body */
  articleBodySample?: string;
  /**
   * When `slides` is empty (e.g. blank racecard), provide short structured context instead.
   */
  editorMotionContext?: string;
  /**
   * Optional editor-authored “master” brief (e.g. RUNWAY background template).
   * OpenAI uses it to shape the short motion_prompt sent to Runway.
   */
  motionPromptBuilderInstruction?: string;
};

const BRANDS: RunwayBgBrand[] = ["Racing365", "TEAMtalk", "PlanetF1"];

function isBrand(v: unknown): v is RunwayBgBrand {
  return typeof v === "string" && (BRANDS as string[]).includes(v);
}

const schema = {
  name: "runway_image_to_video_motion",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      motion_prompt: { type: "string" },
      duration: { type: "number" },
    },
    required: ["motion_prompt", "duration"],
  },
  strict: true,
} as const;

function parsePayload(raw: unknown): { motion_prompt: string; duration: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const motion_prompt = typeof o.motion_prompt === "string" ? o.motion_prompt.trim() : "";
  const duration = typeof o.duration === "number" ? o.duration : NaN;
  if (!motion_prompt || !Number.isFinite(duration)) return null;
  const d = Math.round(duration);
  if (d < 2 || d > 10) return null;
  return { motion_prompt: motion_prompt.slice(0, 1200), duration: d };
}

export async function POST(request: Request) {
  const key = getServerSecret("OPENAI_API_KEY");
  if (!key) {
    return NextResponse.json({ error: "OpenAI API key is not configured." }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isBrand(body.brand)) {
    return NextResponse.json({ error: "brand must be Racing365, TEAMtalk, or PlanetF1." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required (use template title or parse an article first)." }, { status: 400 });
  }

  const slides = Array.isArray(body.slides) ? body.slides : [];
  const editorMotionContext =
    typeof body.editorMotionContext === "string" ? body.editorMotionContext.trim().slice(0, 8000) : "";
  if (slides.length === 0 && !editorMotionContext) {
    return NextResponse.json(
      { error: "slides array is required, or provide editorMotionContext when there are no slides." },
      { status: 400 },
    );
  }

  const strapline = typeof body.strapline === "string" ? body.strapline.trim() : "";
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
  const tags = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === "string" && t.trim()) : [];
  const articleBodySample =
    typeof body.articleBodySample === "string" ? body.articleBodySample.trim().slice(0, 1200) : "";

  const motionPromptBuilderInstruction =
    typeof body.motionPromptBuilderInstruction === "string"
      ? body.motionPromptBuilderInstruction.trim().slice(0, 12000)
      : "";

  const brandAppendix = await getBrandGuidelinesAppendixForRunwayBrand(body.brand);

  const slidesBlock = slides.map((s, i) => ({
    index: i + 1,
    id: typeof s.id === "string" ? s.id : "",
    type: typeof s.type === "string" ? s.type : "",
    label: typeof s.label === "string" ? s.label : "",
    headline: typeof s.headline === "string" ? s.headline : "",
    subline: typeof s.subline === "string" ? s.subline : "",
  }));

  const systemPrompt = await resolveBuiltinPromptBody("builtin-api-runway-image-to-video");

  const userPrompt = [
    slides.length
      ? "Generate motion prompt + duration for Runway image-to-video from this template / slide editor data."
      : "Generate motion prompt + duration for Runway image-to-video from this template context (no slide rows — use editor_motion_context and title).",
    "",
    "Reminders (Runway Image to Video): the uploaded still sets composition and style; motion_prompt must describe motion, camera work, and temporal change only. Use slides/title (or editor context) for story tone, not to redescribe the entire frame.",
    "",
    `brand: ${body.brand}`,
    `title: ${title}`,
    strapline ? `strapline: ${strapline}` : "",
    sourceUrl ? `source_url: ${sourceUrl}` : "",
    tags.length ? `tags: ${tags.join(", ")}` : "",
    "",
    ...(slides.length
      ? ["slides (from slide editor):", JSON.stringify(slidesBlock, null, 2), ""]
      : ["editor_motion_context:", editorMotionContext, ""]),
    articleBodySample ? ["article_body_sample (optional context):", articleBodySample, ""].join("\n") : "",
    ...(brandAppendix
      ? [
          "Brand guidelines (motion/visual tone only; no on-screen text in Runway output):",
          brandAppendix,
          "",
        ]
      : []),
    ...(motionPromptBuilderInstruction
      ? [
          "--- Editor motion rules (apply when composing motion_prompt; synthesize into a concise Runway-ready description, do not dump this list verbatim) ---",
          motionPromptBuilderInstruction,
          "",
        ]
      : []),
    "Return JSON only with keys motion_prompt and duration.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.55,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: schema,
        },
      }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as
      | { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
      | Record<string, unknown>;

    if (!res.ok) {
      const msg =
        typeof data === "object" &&
        data &&
        "error" in data &&
        data.error &&
        typeof data.error === "object" &&
        "message" in data.error &&
        typeof (data.error as { message?: string }).message === "string"
          ? (data.error as { message: string }).message
          : "AI could not generate the motion prompt.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const content = Array.isArray((data as { choices?: Array<{ message?: { content?: string } }> }).choices)
      ? (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content
      : "";
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "AI did not return content." }, { status: 502 });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON." }, { status: 502 });
    }

    const parsed = parsePayload(parsedJson);
    if (!parsed) {
      return NextResponse.json({ error: "AI output failed validation." }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Prompt generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
