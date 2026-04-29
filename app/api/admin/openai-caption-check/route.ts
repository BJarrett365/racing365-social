import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecret } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  openaiApiKey?: string;
  prompt?: string;
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

  const userPrompt =
    body.prompt?.trim() ||
    "Write one punchy social caption for F1 race results in under 20 words.";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 80,
        messages: [
          {
            role: "system",
            content:
              "You are writing concise social media captions for sports video templates.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as
      | {
          choices?: { message?: { content?: string } }[];
          error?: { message?: string };
        }
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

    const caption = Array.isArray((data as { choices?: { message?: { content?: string } }[] }).choices)
      ? (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content?.trim()
      : "";

    if (!caption) {
      return NextResponse.json(
        { ok: false, error: "No caption text returned from OpenAI." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, caption, model: "gpt-4o-mini" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenAI request failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
