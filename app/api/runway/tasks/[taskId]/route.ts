import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { RUNWAY_API_BASE, RUNWAY_API_VERSION } from "@/app/lib/runway-api-constants";

export async function GET(_request: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const key = await getServerSecretAsync("RUNWAYML_API_SECRET");
  if (!key) {
    return NextResponse.json({ error: "Runway API secret not configured." }, { status: 400 });
  }

  const { taskId } = await ctx.params;
  const id = decodeURIComponent(taskId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing task id." }, { status: 400 });
  }

  try {
    const res = await fetch(`${RUNWAY_API_BASE}/v1/tasks/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": RUNWAY_API_VERSION,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const msg = typeof data.error === "string" ? data.error : `Runway error (${res.status})`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Runway request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
