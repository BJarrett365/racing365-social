import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { jsonError, saveAudioFileFromForm, saveGeneratedAudio } from "../../_shared";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const key = await getServerSecretAsync("ELEVENLABS_API_KEY");
    if (!key) return NextResponse.json({ error: "ELEVENLABS_API_KEY is required" }, { status: 503 });
    const original = await saveAudioFileFromForm(form, "upload");
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

    const body = new FormData();
    body.set("audio", file);

    const res = await fetch("https://api.elevenlabs.io/v1/audio-isolation", {
      method: "POST",
      headers: { "xi-api-key": key, Accept: "audio/mpeg" },
      body,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`ElevenLabs voice isolation failed (${res.status}): ${error.slice(0, 500)}`);
    }

    const audio = await saveGeneratedAudio({
      projectId: original.projectId,
      provider: "elevenlabs",
      sourceTool: "voice-isolator",
      sourceText: `Voice isolation for ${original.originalName}`,
      bytes: Buffer.from(await res.arrayBuffer()),
      mimeType: "audio/mpeg",
    });

    return NextResponse.json({ original, audio });
  } catch (error) {
    return jsonError(error, "ElevenLabs voice isolation failed");
  }
}
