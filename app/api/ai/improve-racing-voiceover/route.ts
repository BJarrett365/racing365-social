import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { readGuardRailsAsync, type GuardRailFormat } from "@/app/lib/guard-rails-store";
import { getBrandGuidelinesAppendixForFormat } from "@/app/lib/brand-guidelines-store";
import { resolveBuiltinPromptBody } from "@/app/lib/builtin-prompt-resolve";
import {
  buildRacingVoiceoverUserPrompt,
  buildRacingVoiceoverSystemPrompt,
  racingVoiceoverTemperature,
  type RacingDeliveryStyle,
  type RacingToneStyle,
  type RacingVoiceoverImproveBody,
  type RacingVoiceStyle,
} from "@/app/lib/racing-voiceover-prompt";

type VoiceStyle = RacingVoiceStyle;
type DeliveryStyle = RacingDeliveryStyle;
type ToneStyle = RacingToneStyle;
type Body = RacingVoiceoverImproveBody;

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

async function buildPrompt(body: Body, brandGuidelinesAppendix: string | undefined, apiDefaultPrompt: string): Promise<string> {
  const railsByFormat = (await readGuardRailsAsync()).rails;
  const formatKey = body.format as GuardRailFormat;
  const guardRails = railsByFormat[formatKey]?.trim();
  return buildRacingVoiceoverUserPrompt(body, {
    apiDefaultPrompt,
    brandGuidelinesAppendix,
    guardRails,
  });
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
    const systemRole = buildRacingVoiceoverSystemPrompt(body.format, body);
    const temperature = racingVoiceoverTemperature(body);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature,
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
