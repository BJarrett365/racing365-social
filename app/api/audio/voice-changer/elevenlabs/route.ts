import { NextResponse } from "next/server";
import { getServerSecretAsync, getStoredVoiceOptionAsync } from "@/app/lib/server-secrets";
import { jsonError, saveAudioFileFromForm, saveGeneratedAudio } from "../../_shared";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const key = await getServerSecretAsync("ELEVENLABS_API_KEY");
    if (!key) return NextResponse.json({ error: "ELEVENLABS_API_KEY is required" }, { status: 503 });
    const original = await saveAudioFileFromForm(form, "upload");
    const file = form.get("file");
    const targetVoiceStyle = String(form.get("targetVoiceStyle") ?? "").trim();
    const storedVoice = await getStoredVoiceOptionAsync("ELEVENLABS_VOICE_ID", "elevenlabsVoiceId");
    const voiceId = String(form.get("voiceId") || storedVoice || "21m00Tcm4TlvDq8ikWAM").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const body = new FormData();
    body.set("audio", file);
    body.set("model_id", "eleven_multilingual_sts_v2");
    if (targetVoiceStyle) body.set("voice_settings", JSON.stringify({ style: targetVoiceStyle }));

    const res = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": key, Accept: "audio/mpeg" },
      body,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`ElevenLabs voice changer failed (${res.status}): ${error.slice(0, 500)}`);
    }

    const audio = await saveGeneratedAudio({
      projectId: original.projectId,
      provider: "elevenlabs",
      sourceTool: "voice-changer",
      voiceId,
      sourceText: targetVoiceStyle || original.originalName,
      bytes: Buffer.from(await res.arrayBuffer()),
      mimeType: "audio/mpeg",
    });

    return NextResponse.json({ original, audio });
  } catch (error) {
    return jsonError(error, "ElevenLabs voice changer failed");
  }
}
