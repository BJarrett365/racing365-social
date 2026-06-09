import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/guards";
import { getServerSecretAsync } from "@/app/lib/server-secrets";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const key = await getServerSecretAsync("OPENAI_API_KEY");
    if (!key) return NextResponse.json({ error: "OpenAI API key is not configured." }, { status: 503 });
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) return NextResponse.json({ error: "audio file is required." }, { status: 400 });
    const openAiForm = new FormData();
    openAiForm.set("file", file, file.name || "gateway-audio.webm");
    openAiForm.set("model", "whisper-1");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: openAiForm,
    });
    const json = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(json.error?.message || `OpenAI transcription failed (${res.status}).`);
    return NextResponse.json({ text: json.text ?? "" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
