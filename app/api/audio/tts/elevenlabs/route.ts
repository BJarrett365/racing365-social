import { NextResponse } from "next/server";
import { getServerSecretAsync, getStoredVoiceOptionAsync } from "@/app/lib/server-secrets";
import { jsonError, saveGeneratedAudio } from "../../_shared";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      projectId?: string;
      text?: string;
      voice?: string;
      voiceId?: string;
      tone?: string;
      language?: string;
    };
    const text = String(body.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
    const key = await getServerSecretAsync("ELEVENLABS_API_KEY");
    if (!key) return NextResponse.json({ error: "ELEVENLABS_API_KEY is required" }, { status: 503 });

    const storedVoice = await getStoredVoiceOptionAsync("ELEVENLABS_VOICE_ID", "elevenlabsVoiceId");
    const voiceId = String(body.voiceId || body.voice || storedVoice || "21m00Tcm4TlvDq8ikWAM").trim();
    const modelId = await getStoredVoiceOptionAsync("ELEVENLABS_MODEL", "elevenlabsModel") || "eleven_multilingual_v2";
    const input = [body.tone, body.language ? `Language: ${body.language}` : "", text].filter(Boolean).join("\n\n");

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: input.slice(0, 5000),
        model_id: modelId,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`ElevenLabs TTS failed (${res.status}): ${error.slice(0, 500)}`);
    }

    const audio = await saveGeneratedAudio({
      projectId: body.projectId,
      provider: "elevenlabs",
      voiceId,
      sourceText: text,
      bytes: Buffer.from(await res.arrayBuffer()),
      mimeType: "audio/mpeg",
    });

    return NextResponse.json({ audio });
  } catch (error) {
    return jsonError(error, "ElevenLabs TTS failed");
  }
}
