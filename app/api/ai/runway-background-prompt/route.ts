import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import type {
  RunwayBackgroundPromptResult,
  RunwayBgBrand,
  RunwayBgSettings,
  RunwaySubtitleCue,
} from "@/app/lib/runway-background-prompt-types";
import { getBrandGuidelinesAppendixForRunwayBrand } from "@/app/lib/brand-guidelines-store";
import { resolveBuiltinPromptBody } from "@/app/lib/builtin-prompt-resolve";

type Body = {
  brand: RunwayBgBrand;
  scene: string;
  mood: string;
};

const schema = {
  name: "runway_background_prompt",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      runway_prompt: { type: "string" },
      settings: {
        type: "object",
        additionalProperties: false,
        properties: {
          duration: { type: "number" },
          aspect_ratio: { type: "string" },
          resolution: { type: "string" },
          camera_motion: { type: "string" },
          loop: { type: "boolean" },
          style: { type: "string" },
          quality: { type: "string" },
        },
        required: ["duration", "aspect_ratio", "resolution", "camera_motion", "loop", "style", "quality"],
      },
      filename: { type: "string" },
      subtitles: {
        type: "array",
        minItems: 3,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            start: { type: "number" },
            end: { type: "number" },
            text: { type: "string" },
          },
          required: ["start", "end", "text"],
        },
      },
    },
    required: ["runway_prompt", "settings", "filename", "subtitles"],
  },
  strict: true,
} as const;

const BRANDS: RunwayBgBrand[] = ["Racing365", "TEAMtalk", "PlanetF1"];

function isBrand(v: unknown): v is RunwayBgBrand {
  return typeof v === "string" && (BRANDS as string[]).includes(v);
}

function sanitizeFilename(name: string, brand: RunwayBgBrand): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!base.endsWith(".mp4")) return `${base || `${brand.toLowerCase()}_bg`}_v1.mp4`;
  return base;
}

function buildFormatted(r: RunwayBackgroundPromptResult): string {
  const s = r.settings;
  const settingsBlock = [
    "{",
    `  "duration": ${s.duration},`,
    `  "aspect_ratio": "${s.aspect_ratio}",`,
    `  "resolution": "${s.resolution}",`,
    `  "camera_motion": "${s.camera_motion}",`,
    `  "loop": ${s.loop},`,
    `  "style": "${s.style}",`,
    `  "quality": "${s.quality}"`,
    "}",
  ].join("\n");
  const subs = JSON.stringify(r.subtitles, null, 2);
  return [
    "RUNWAY PROMPT:",
    r.runway_prompt.trim(),
    "",
    "SETTINGS:",
    settingsBlock,
    "",
    "FILENAME:",
    r.filename.trim(),
    "",
    "SCENE SUBTITLES & TIMING:",
    subs,
  ].join("\n");
}

function parsePayload(raw: unknown): RunwayBackgroundPromptResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const runway_prompt = typeof o.runway_prompt === "string" ? o.runway_prompt.trim() : "";
  const filename = typeof o.filename === "string" ? o.filename.trim() : "";
  const settingsIn = o.settings;
  if (!runway_prompt || !filename || !settingsIn || typeof settingsIn !== "object") return null;
  const st = settingsIn as Record<string, unknown>;
  const duration = typeof st.duration === "number" ? st.duration : NaN;
  if (
    !Number.isFinite(duration) ||
    duration < 7 ||
    duration > 9 ||
    typeof st.aspect_ratio !== "string" ||
    typeof st.resolution !== "string" ||
    typeof st.camera_motion !== "string" ||
    typeof st.loop !== "boolean" ||
    typeof st.style !== "string" ||
    typeof st.quality !== "string"
  ) {
    return null;
  }
  const subsIn = o.subtitles;
  if (!Array.isArray(subsIn) || subsIn.length < 3 || subsIn.length > 4) return null;
  const subtitles: RunwaySubtitleCue[] = [];
  for (const item of subsIn) {
    if (!item || typeof item !== "object") return null;
    const c = item as Record<string, unknown>;
    const start = typeof c.start === "number" ? c.start : NaN;
    const end = typeof c.end === "number" ? c.end : NaN;
    const text = typeof c.text === "string" ? c.text.trim() : "";
    if (!Number.isFinite(start) || !Number.isFinite(end) || !text) return null;
    subtitles.push({ start, end, text });
  }
  const last = subtitles[subtitles.length - 1];
  if (!last || Math.abs(last.end - duration) > 0.25) {
    return null;
  }
  const settings: RunwayBgSettings = {
    duration,
    aspect_ratio: st.aspect_ratio,
    resolution: st.resolution,
    camera_motion: st.camera_motion,
    loop: st.loop,
    style: st.style,
    quality: st.quality,
  };
  return {
    runway_prompt,
    settings,
    filename,
    subtitles,
    formatted: "",
  };
}

export async function POST(request: Request) {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
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

  const scene = typeof body.scene === "string" ? body.scene.trim() : "";
  const mood = typeof body.mood === "string" ? body.mood.trim() : "";
  if (!scene || !mood) {
    return NextResponse.json({ error: "scene and mood are required." }, { status: 400 });
  }
  if (!isBrand(body.brand)) {
    return NextResponse.json({ error: "brand must be Racing365, TEAMtalk, or PlanetF1." }, { status: 400 });
  }

  const brandAppendix = await getBrandGuidelinesAppendixForRunwayBrand(body.brand);
  const systemPrompt = await resolveBuiltinPromptBody("builtin-api-runway-background");

  const userPrompt = [
    "Generate one Runway background package.",
    "",
    `brand: ${body.brand}`,
    `scene: ${scene}`,
    `mood: ${mood}`,
    "",
    ...(brandAppendix
      ? [
          "Brand guidelines (respect visual/motion tone; no on-screen logos/text in Runway frame):",
          brandAppendix,
          "",
        ]
      : []),
    "Return JSON only matching the schema.",
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.65,
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
        typeof data.error.message === "string"
          ? data.error.message
          : "AI service could not generate this prompt.";
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
      return NextResponse.json(
        { error: "AI output failed validation (duration, subtitles, or settings)." },
        { status: 502 },
      );
    }

    parsed.filename = sanitizeFilename(parsed.filename, body.brand);
    parsed.formatted = buildFormatted(parsed);

    return NextResponse.json(parsed satisfies RunwayBackgroundPromptResult);
  } catch {
    return NextResponse.json({ error: "Could not generate prompt. Try again." }, { status: 500 });
  }
}
