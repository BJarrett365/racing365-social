import { NextResponse } from "next/server";
import { getServerSecretAsync, getStoredVoiceOptionAsync } from "@/app/lib/server-secrets";
import { jsonError, normaliseGeneratedAudioTool, saveGeneratedAudio } from "../../_shared";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      projectId?: string;
      text?: string;
      voice?: string;
      voiceId?: string;
      tone?: string;
      language?: string;
      modelId?: string;
      outputFormat?: string;
      stability?: number;
      similarity?: number;
      styleExaggeration?: number;
      speakerBoost?: boolean;
      sourceTool?: string;
    };
    const text = String(body.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
    const key = await getServerSecretAsync("ELEVENLABS_API_KEY");
    if (!key) return NextResponse.json({ error: "ELEVENLABS_API_KEY is required" }, { status: 503 });

    const storedVoice = await getStoredVoiceOptionAsync("ELEVENLABS_VOICE_ID", "elevenlabsVoiceId");
    const requestedVoice = String(body.voiceId || body.voice || "").trim();
    const voiceId = requestedVoice && requestedVoice !== "admin-default"
      ? requestedVoice
      : String(storedVoice || "21m00Tcm4TlvDq8ikWAM").trim();
    const modelId = String(body.modelId || await getStoredVoiceOptionAsync("ELEVENLABS_MODEL", "elevenlabsModel") || "eleven_multilingual_v2").trim();
    const outputFormat = String(body.outputFormat || "mp3_44100_128").trim();

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${encodeURIComponent(outputFormat)}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: modelId,
        voice_settings: {
          stability: normaliseUnit(body.stability, 0.5),
          similarity_boost: normaliseUnit(body.similarity, 0.75),
          style: normaliseUnit(body.styleExaggeration, 0),
          use_speaker_boost: body.speakerBoost !== false,
        },
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`ElevenLabs TTS failed (${res.status}): ${error.slice(0, 500)}`);
    }

    const audio = await saveGeneratedAudio({
      projectId: body.projectId,
      provider: "elevenlabs",
      sourceTool: normaliseGeneratedAudioTool(body.sourceTool),
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

function normaliseUnit(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback;
}
