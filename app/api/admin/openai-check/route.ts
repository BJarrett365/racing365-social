import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecret } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  openaiApiKey?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const key = body.openaiApiKey?.trim() || getServerSecret("OPENAI_API_KEY");
  if (!key) {
    return NextResponse.json(
      { error: "No OpenAI API key provided (or stored in admin settings)." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as
      | { data?: unknown[]; error?: { message?: string } }
      | Record<string, unknown>;

    if (!res.ok) {
      const message =
        typeof data === "object" &&
        data &&
        "error" in data &&
        typeof data.error === "object" &&
        data.error &&
        "message" in data.error &&
        typeof data.error.message === "string"
          ? data.error.message
          : `OpenAI API error (${res.status})`;
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

    const modelCount = Array.isArray((data as { data?: unknown[] }).data)
      ? (data as { data?: unknown[] }).data!.length
      : 0;
    return NextResponse.json({ ok: true, modelCount });
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenAI request failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
