import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { RUNWAY_API_BASE, RUNWAY_API_VERSION } from "@/app/lib/runway-api-constants";

type Body = {
  /** Public HTTPS URL or `data:image/...;base64,...` */
  promptImage: string;
  promptText?: string;
  /** gen4.5: 2–10 */
  duration?: number;
  model?: "gen4.5";
};

const MAX_DATA_IMAGE_BYTES = 15 * 1024 * 1024;

function validatePromptImage(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: false, error: "promptImage is required." };
  if (t.startsWith("https://")) return { ok: true, value: t };
  if (t.startsWith("data:image/") && t.includes(";base64,")) {
    const idx = t.indexOf(";base64,");
    const b64 = t.slice(idx + ";base64,".length);
    let buf: Buffer;
    try {
      buf = Buffer.from(b64, "base64");
    } catch {
      return { ok: false, error: "Invalid base64 in data URI." };
    }
    if (buf.length > MAX_DATA_IMAGE_BYTES) {
      return { ok: false, error: `Image too large (max ${MAX_DATA_IMAGE_BYTES / (1024 * 1024)}MB).` };
    }
    return { ok: true, value: t };
  }
  return {
    ok: false,
    error: "promptImage must be a public https:// URL or a data:image/…;base64,… data URI.",
  };
}

export async function POST(request: Request) {
  const key = await getServerSecretAsync("RUNWAYML_API_SECRET");
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

  const imgRaw = typeof body.promptImage === "string" ? body.promptImage : "";
  const validated = validatePromptImage(imgRaw);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const promptText =
    typeof body.promptText === "string" && body.promptText.trim()
      ? body.promptText.trim().slice(0, 1000)
      : "Cinematic slow motion with subtle camera movement and natural lighting.";

  const duration = Math.round(Number(body.duration ?? 8));
  if (!Number.isFinite(duration) || duration < 2 || duration > 10) {
    return NextResponse.json({ error: "duration must be an integer from 2 to 10." }, { status: 400 });
  }

  const model = body.model ?? "gen4.5";

  try {
    const res = await fetch(`${RUNWAY_API_BASE}/v1/image_to_video`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": RUNWAY_API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        promptImage: validated.value,
        promptText,
        ratio: "720:1280",
        duration,
      }),
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

    return NextResponse.json({ taskId: id, duration, model });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Runway request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
