import { NextResponse } from "next/server";
import { getServerSecret } from "@/app/lib/server-secrets";
import { RUNWAY_API_BASE, RUNWAY_API_VERSION } from "@/app/lib/runway-api-constants";
import {
  RUNWAY_T2I_DEFAULT_TURBO_REFERENCE_URI,
  RUNWAY_T2I_PROMPT_MAX,
  isAllowedRunwayT2iRatio,
} from "@/app/lib/runway-text-to-image-constants";

type Body = {
  promptText: string;
  model?: "gen4_image_turbo" | "gen4_image";
  /** e.g. 1080:1920 — must be a Gen-4 supported ratio */
  ratio?: string;
};

export async function POST(request: Request) {
  const key = getServerSecret("RUNWAYML_API_SECRET");
  if (!key) {
    return NextResponse.json(
      { error: "Runway API secret not configured (RUNWAYML_API_SECRET or admin settings)." },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const promptText = typeof body.promptText === "string" ? body.promptText.trim() : "";
  if (!promptText || promptText.length > RUNWAY_T2I_PROMPT_MAX) {
    return NextResponse.json(
      { error: `promptText is required (max ${RUNWAY_T2I_PROMPT_MAX} characters).` },
      { status: 400 },
    );
  }

  const model = body.model ?? "gen4_image_turbo";
  const ratioRaw = typeof body.ratio === "string" ? body.ratio.trim() : "1080:1920";
  if (!isAllowedRunwayT2iRatio(ratioRaw)) {
    return NextResponse.json(
      {
        error: `ratio must be one of: 1080:1920, 720:1280, 1920:1080, 1280:720.`,
      },
      { status: 400 },
    );
  }

  try {
    const payload: Record<string, unknown> =
      model === "gen4_image_turbo"
        ? {
            model: "gen4_image_turbo",
            promptText,
            ratio: ratioRaw,
            referenceImages: [{ uri: RUNWAY_T2I_DEFAULT_TURBO_REFERENCE_URI }],
          }
        : {
            model: "gen4_image",
            promptText,
            ratio: ratioRaw,
          };

    const res = await fetch(`${RUNWAY_API_BASE}/v1/text_to_image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": RUNWAY_API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const msg = typeof data.error === "string" ? data.error : `Runway error (${res.status})`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const id = typeof data.id === "string" ? data.id : "";
    if (!id) {
      return NextResponse.json({ error: "Runway did not return a task id." }, { status: 502 });
    }

    return NextResponse.json({ taskId: id, model, ratio: ratioRaw });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Runway request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
