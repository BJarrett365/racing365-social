import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecretAsync } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  livepeerApiKey?: string;
};

function readLivepeerError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.error === "string") return o.error;
    if (typeof o.message === "string") return o.message;
  }
  return `Livepeer Studio API error (${status})`;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const key = body.livepeerApiKey?.trim() || await getServerSecretAsync("LIVEPEER_API_KEY");
  if (!key) {
    return NextResponse.json(
      { error: "Livepeer API key required (LIVEPEER_API_KEY env or admin form)." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch("https://livepeer.studio/api/stream?limit=1", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: readLivepeerError(data, res.status) },
        { status: res.status === 401 || res.status === 403 ? 400 : 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Livepeer Studio API accepted the API key.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Livepeer request failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
