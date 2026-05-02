import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { audioStudioId, updateAudioStudioStore } from "@/app/lib/audio-studio-store";
import { jsonError, saveAudioFileFromForm } from "../../_shared";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const permissionConfirmed = String(form.get("permissionConfirmed") ?? "") === "true";
    if (!permissionConfirmed) {
      return NextResponse.json({ error: "Voice cloning requires explicit permission confirmation." }, { status: 400 });
    }
    const key = await getServerSecretAsync("ELEVENLABS_API_KEY");
    if (!key) return NextResponse.json({ error: "ELEVENLABS_API_KEY is required" }, { status: 503 });

    const sample = await saveAudioFileFromForm(form, "recording");
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

    const voiceName = String(form.get("name") || `Plexa Voice ${new Date().toLocaleDateString("en-GB")}`).trim();
    const description = String(form.get("targetVoiceStyle") || "Created in Plexa Audio Studio").trim();
    const body = new FormData();
    body.set("name", voiceName);
    body.set("description", description);
    body.append("files", file);

    const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": key },
      body,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`ElevenLabs voice creation failed (${res.status}): ${error.slice(0, 500)}`);
    }

    const data = await res.json() as { voice_id?: string };
    const voice = {
      id: audioStudioId("aud_voice"),
      name: voiceName,
      provider: "elevenlabs" as const,
      voiceId: data.voice_id || "",
      permissionConfirmed,
      sampleFileIds: [sample.id],
      createdAt: new Date().toISOString(),
    };

    await updateAudioStudioStore((store) => {
      store.voices.unshift(voice);
    });

    return NextResponse.json({ file: sample, voice });
  } catch (error) {
    return jsonError(error, "ElevenLabs voice creation failed");
  }
}
