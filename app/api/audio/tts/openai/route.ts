import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { jsonError, normaliseGeneratedAudioTool, normaliseSpeed, saveGeneratedAudio } from "../../_shared";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      projectId?: string;
      text?: string;
      voice?: string;
      speed?: number;
      language?: string;
      tone?: string;
      sourceTool?: string;
    };
    const text = String(body.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
    const key = await getServerSecretAsync("OPENAI_API_KEY");
    if (!key) return NextResponse.json({ error: "OPENAI_API_KEY is required" }, { status: 503 });

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: String(body.voice || "nova").trim(),
        input: text.slice(0, 4096),
        response_format: "mp3",
        speed: normaliseSpeed(body.speed),
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OpenAI TTS failed (${res.status}): ${error.slice(0, 500)}`);
    }

    const audio = await saveGeneratedAudio({
      projectId: body.projectId,
      provider: "openai",
      sourceTool: normaliseGeneratedAudioTool(body.sourceTool),
      voiceId: body.voice,
      sourceText: text,
      bytes: Buffer.from(await res.arrayBuffer()),
      mimeType: "audio/mpeg",
    });

    return NextResponse.json({ audio });
  } catch (error) {
    return jsonError(error, "OpenAI TTS failed");
  }
}
