import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { readGuardRailsAsync, type GuardRailFormat } from "@/app/lib/guard-rails-store";
import { getBrandGuidelinesAppendixForFormat } from "@/app/lib/brand-guidelines-store";
import { resolveBuiltinPromptBody } from "@/app/lib/builtin-prompt-resolve";

type VoiceStyle = "Journalist" | "Punchy Tips" | "Calm / Studio" | "Fast Picks";
type DeliveryStyle = "Smooth" | "Balanced" | "Fast";
type ToneStyle = "Neutral" | "Confident" | "Urgent";

type Body = {
  format: string;
  customPrompt: string;
  voiceStyle: VoiceStyle;
  deliveryStyle: DeliveryStyle;
  tone: ToneStyle;
  optimiseForVoiceover: boolean;
  addEmphasis: boolean;
  generateThreeVersions?: boolean;
  journalistProfile?: {
    id?: string;
    name?: string;
    brand?: string;
    sports?: string[];
    styleNotes?: string;
    articleGuidelines?: string;
    exampleTitles?: string[];
  };
  fields: {
    intro?: string;
    "tip-1"?: string;
    "tip-2"?: string;
    "tip-3"?: string;
    outro?: string;
    caption?: string;
    voiceover_script?: string;
    /** TEAMtalk News — middle scene body (full template copy, not truncated subtitle) */
    detail_paragraph?: string;
  };
};

type AiPayload = {
  voiceover_script: string;
  short_caption: string;
  version_a: string;
  version_b: string;
  version_c: string;
};

const schema = {
  name: "racing_voiceover_improvement",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      voiceover_script: { type: "string" },
      short_caption: { type: "string" },
      version_a: { type: "string" },
      version_b: { type: "string" },
      version_c: { type: "string" },
    },
    required: ["voiceover_script", "short_caption", "version_a", "version_b", "version_c"],
  },
  strict: true,
} as const;

function safeString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseAiJson(raw: unknown): AiPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const payload: AiPayload = {
    voiceover_script: safeString(o.voiceover_script),
    short_caption: safeString(o.short_caption),
    version_a: safeString(o.version_a),
    version_b: safeString(o.version_b),
    version_c: safeString(o.version_c),
  };
  if (!payload.voiceover_script || !payload.short_caption) return null;
  if (!payload.version_a || !payload.version_b || !payload.version_c) return null;
  return payload;
}

function controlGuidance(body: Body): string[] {
  const voiceStyle: Record<VoiceStyle, string> = {
    Journalist: "Lead with the strongest verified fact, sound like an experienced sports journalist, and keep the wording broadcast-clean.",
    "Punchy Tips": "Tighter, sharper and more selection-led. Short sentences, clear picks, no unsupported betting claims.",
    "Calm / Studio": "Measured studio delivery. Smooth transitions, composed authority and no hype.",
    "Fast Picks": "High-tempo short-form style. Very concise lines, immediate value and clean scene-by-scene rhythm.",
  };
  const deliveryStyle: Record<DeliveryStyle, string> = {
    Smooth: "Use flowing sentences with natural breath points.",
    Balanced: "Mix short punchy lines with enough context for clarity.",
    Fast: "Use compact clauses and avoid long subordinate sentences.",
  };
  const tone: Record<ToneStyle, string> = {
    Neutral: "Factual and useful, with no extra opinion.",
    Confident: "Authoritative and decisive while staying source-grounded.",
    Urgent: "Immediate and energetic, but never sensational or misleading.",
  };
  return [
    `Voice style instruction: ${voiceStyle[body.voiceStyle]}`,
    `Delivery instruction: ${deliveryStyle[body.deliveryStyle]}`,
    `Tone instruction: ${tone[body.tone]}`,
    body.optimiseForVoiceover
      ? "Voiceover craft: write for spoken rhythm, breath, scene timing and clean pronunciation."
      : "Voiceover craft: prioritise accurate editorial copy.",
    body.addEmphasis
      ? "Emphasis: make the key pick, result, name or turning point land clearly without ALL CAPS noise."
      : "Emphasis: keep delivery even and restrained.",
  ];
}

async function buildPrompt(body: Body, brandGuidelinesAppendix: string | undefined, apiDefaultPrompt: string): Promise<string> {
  const f = body.fields;
  const custom = body.customPrompt?.trim() || apiDefaultPrompt;
  const profile = body.journalistProfile;
  const railsByFormat = (await readGuardRailsAsync()).rails;
  const formatKey = body.format as GuardRailFormat;
  const guardRails = railsByFormat[formatKey]?.trim();
  const bg = brandGuidelinesAppendix?.trim();
  return [
    custom,
    "",
    ...(bg
      ? [
          "Brand guidelines (follow for tone, voice, and on-brand claims; do not invent facts beyond inputs):",
          bg,
          "",
        ]
      : []),
    ...(guardRails ? ["Guard rails:", guardRails, ""] : []),
    "",
    "Editorial controls:",
    `voice_style: ${body.voiceStyle}`,
    `delivery_style: ${body.deliveryStyle}`,
    `tone: ${body.tone}`,
    `optimise_for_voiceover: ${body.optimiseForVoiceover ? "true" : "false"}`,
    `add_emphasis: ${body.addEmphasis ? "true" : "false"}`,
    `generate_three_versions: ${body.generateThreeVersions ? "true" : "false"}`,
    "",
    "Dropdown interpretation:",
    ...controlGuidance(body),
    "",
    ...(profile?.name || profile?.styleNotes
      ? [
          "Selected creator profile learning:",
          `name: ${profile.name ?? ""}`,
          `brand: ${profile.brand ?? ""}`,
          `sports: ${Array.isArray(profile.sports) ? profile.sports.join(", ") : ""}`,
          `style_notes: ${profile.styleNotes ?? ""}`,
          `article_guidelines: ${profile.articleGuidelines ?? ""}`,
          `example_titles: ${Array.isArray(profile.exampleTitles) ? profile.exampleTitles.slice(0, 6).join(" | ") : ""}`,
          "Use this as a style guide only. Do not copy phrases or invent facts from examples.",
          "",
        ]
      : []),
    "",
    "Input fields:",
    `format: ${body.format}`,
    `intro: ${f.intro ?? ""}`,
    `tip-1: ${f["tip-1"] ?? ""}`,
    `tip-2: ${f["tip-2"] ?? ""}`,
    `tip-3: ${f["tip-3"] ?? ""}`,
    `outro: ${f.outro ?? ""}`,
    `caption: ${f.caption ?? ""}`,
    `voiceover_script: ${f.voiceover_script ?? ""}`,
    ...(f.detail_paragraph?.trim()
      ? [
          "",
          "TEAMtalk News — middle scene detail paragraph (primary source for the story body; review and reflect this fully in the voiceover):",
          f.detail_paragraph.trim(),
        ]
      : []),
    "",
    "Return JSON only with keys:",
    "voiceover_script, short_caption, version_a, version_b, version_c",
    "Where:",
    "- version_a is safest journalist default",
    "- version_b is punchier and tighter",
    "- version_c is fastest and most short-form friendly",
    "Never invent race facts or odds that are not in input.",
  ].join("\n");
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
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !body.fields) {
    return NextResponse.json({ error: "Missing required race input fields." }, { status: 400 });
  }

  try {
    const apiDefaultPrompt = await resolveBuiltinPromptBody("builtin-api-racing-voiceover");
    const brandAppendix = await getBrandGuidelinesAppendixForFormat(body.format);
    const systemRole =
      body.format === "teamtalk-news"
        ? "You are a UK sports news script editor (TEAMtalk-style football transfer and club news). Base the voiceover on the headline fields and especially the detail paragraph when provided. Keep scripts factual, natural, spoken, and concise — do not invent quotes or sources beyond the copy supplied."
        : "You are a UK racing journalist script editor. Keep scripts factual, natural, spoken, and concise.";
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
            content: systemRole,
          },
          { role: "user", content: await buildPrompt(body, brandAppendix, apiDefaultPrompt) },
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
          : "AI service could not process this script right now.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const content = Array.isArray((data as { choices?: Array<{ message?: { content?: string } }> }).choices)
      ? (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content
      : "";
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "AI did not return script content." }, { status: 502 });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON." }, { status: 502 });
    }

    const parsed = parseAiJson(parsedJson);
    if (!parsed) {
      return NextResponse.json({ error: "AI output did not match required fields." }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "Could not write script at the moment. Please try again." },
      { status: 500 },
    );
  }
}
