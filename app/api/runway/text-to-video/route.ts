import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { RUNWAY_API_BASE, RUNWAY_API_VERSION } from "@/app/lib/runway-api-constants";

type Body = {
  promptText: string;
  /** gen4.5: 2–10; default 8 */
  duration?: number;
  model?: "gen4.5";
};

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

  const promptText = typeof body.promptText === "string" ? body.promptText.trim() : "";
  if (!promptText || promptText.length > 1000) {
    return NextResponse.json({ error: "promptText is required (max 1000 characters)." }, { status: 400 });
  }

  const duration = Math.round(Number(body.duration ?? 8));
  if (!Number.isFinite(duration) || duration < 2 || duration > 10) {
    return NextResponse.json({ error: "duration must be an integer from 2 to 10." }, { status: 400 });
  }

  const model = body.model ?? "gen4.5";

  try {
    const res = await fetch(`${RUNWAY_API_BASE}/v1/text_to_video`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": RUNWAY_API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
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
