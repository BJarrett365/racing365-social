import { NextResponse } from "next/server";
import { resolveBuiltinPromptBody } from "@/app/lib/builtin-prompt-resolve";
import { getServerSecret } from "@/app/lib/server-secrets";
import { IMPROVE_SCRIPT_SYSTEM_PROMPT } from "@/app/lib/prompts-catalog";

type TonePreset = "Journalist" | "Punchy" | "Formal" | "Fast Tips";
type LengthPreset = "Short" | "Medium" | "Long";

type Body = {
  format: string;
  customPrompt: string;
  tone: TonePreset;
  length: LengthPreset;
  optimiseRhythm: boolean;
  socialFriendlyCaption: boolean;
  fields: {
    intro?: string;
    "tip-1"?: string;
    "tip-2"?: string;
    "tip-3"?: string;
    outro?: string;
    caption?: string;
    voiceover_script?: string;
  };
};

type AiPayload = {
  voiceover_script: string;
  short_caption: string;
  optional_alt_intro?: string;
  optional_alt_outro?: string;
};

const schema = {
  name: "shorts_script_improvement",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      voiceover_script: { type: "string" },
      short_caption: { type: "string" },
      optional_alt_intro: { type: ["string", "null"] },
      optional_alt_outro: { type: ["string", "null"] },
    },
    required: [
      "voiceover_script",
      "short_caption",
      "optional_alt_intro",
      "optional_alt_outro",
    ],
  },
  strict: true,
} as const;

function safeString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseAiJson(raw: unknown): AiPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const voiceover = safeString(o.voiceover_script);
  const caption = safeString(o.short_caption);
  if (!voiceover || !caption) return null;
  const altIntro = safeString(o.optional_alt_intro);
  const altOutro = safeString(o.optional_alt_outro);
  return {
    voiceover_script: voiceover,
    short_caption: caption,
    ...(altIntro ? { optional_alt_intro: altIntro } : {}),
    ...(altOutro ? { optional_alt_outro: altOutro } : {}),
  };
}

function promptFrom(body: Body): string {
  const f = body.fields;
  const lenGuide =
    body.length === "Short"
      ? "Aim for about 35-55 words total."
      : body.length === "Long"
        ? "Aim for about 90-130 words total."
        : "Aim for about 60-85 words total.";
  const style =
    body.tone === "Journalist"
      ? "Write like an experienced British racing journalist."
      : body.tone === "Punchy"
        ? "Write with energetic, punchy sports-bulletin pacing."
        : body.tone === "Formal"
          ? "Write in formal broadcast style."
          : "Write crisp, fast-tips style with quick transitions.";
  const rhythm = body.optimiseRhythm
    ? "Optimise sentence rhythm for spoken voiceover: varied sentence lengths, clean cadence, natural pauses."
    : "Keep readable for voiceover without over-formatting.";
  const socialCaption = body.socialFriendlyCaption
    ? "Make the short_caption social-friendly and hook-led while staying factual."
    : "Keep short_caption factual and concise.";

  return [
    "You are improving a sports video script for PLEXA Shorts.",
    "Critical constraints:",
    "- Use British English spelling and phrasing.",
    "- Do not invent facts, names, positions, odds, times, or outcomes.",
    "- Only use details present in the provided input fields.",
    "- Keep output sounding human and journalistic, never robotic.",
    style,
    lenGuide,
    rhythm,
    socialCaption,
    "",
    "Input fields (verbatim data):",
    `format: ${body.format}`,
    `intro: ${f.intro ?? ""}`,
    `tip-1: ${f["tip-1"] ?? ""}`,
    `tip-2: ${f["tip-2"] ?? ""}`,
    `tip-3: ${f["tip-3"] ?? ""}`,
    `outro: ${f.outro ?? ""}`,
    `caption: ${f.caption ?? ""}`,
    `voiceover_script: ${f.voiceover_script ?? ""}`,
    "",
    "Return valid JSON only using keys:",
    "- voiceover_script",
    "- short_caption",
    "- optional_alt_intro (optional)",
    "- optional_alt_outro (optional)",
    "",
    "Journalist editable instruction:",
    body.customPrompt?.trim() || "(none)",
  ].join("\n");
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

  if (!body || typeof body !== "object" || !body.fields) {
    return NextResponse.json({ error: "Missing required fields payload." }, { status: 400 });
  }

  let systemPrompt = await resolveBuiltinPromptBody("builtin-api-improve-script-system");
  if (!systemPrompt.trim()) systemPrompt = IMPROVE_SCRIPT_SYSTEM_PROMPT;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: promptFrom(body),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: schema,
        },
      }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as
      | {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string };
        }
      | Record<string, unknown>;

    if (!res.ok) {
      const message =
        typeof data === "object" &&
        data &&
        "error" in data &&
        data.error &&
        typeof data.error === "object" &&
        "message" in data.error &&
        typeof data.error.message === "string"
          ? data.error.message
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

    const parsed = parseAiJson(parsedRaw);
    if (!parsed) {
      return NextResponse.json({ error: "AI JSON did not match required shape." }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI improvement request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
