import { NextResponse } from "next/server";
import { translateAudioTranscript } from "@/app/lib/audio-studio-ai";
import { audioStudioId, ensureAudioProject, updateAudioStudioStore } from "@/app/lib/audio-studio-store";
import { jsonError } from "../_shared";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      projectId?: string;
      transcript?: string;
      language?: string;
      provider?: "openai" | "elevenlabs";
      voice?: string;
      speed?: number;
    };
    const transcript = String(body.transcript ?? "").trim();
    const language = String(body.language ?? "").trim();
    if (!transcript || !language) {
      return NextResponse.json({ error: "transcript and language are required" }, { status: 400 });
    }

    const project = await ensureAudioProject(body.projectId);
    const translatedText = await translateAudioTranscript(transcript, language);
    const baseUrl = new URL(req.url);
    const ttsPath = body.provider === "elevenlabs" ? "/api/audio/tts/elevenlabs" : "/api/audio/tts/openai";
    const ttsRes = await fetch(new URL(ttsPath, baseUrl.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        text: translatedText,
        language,
        voice: body.voice,
        speed: body.speed,
      }),
    });
    const ttsData = await ttsRes.json();
    if (!ttsRes.ok) {
      throw new Error(typeof ttsData.error === "string" ? ttsData.error : "Language audio generation failed");
    }

    const languageVersion = {
      id: audioStudioId("aud_lang"),
      projectId: project.id,
      language,
      translatedText,
      generatedAudioId: ttsData.audio?.id,
      createdAt: new Date().toISOString(),
    };

    await updateAudioStudioStore((store) => {
      store.languageVersions.unshift(languageVersion);
    });

    return NextResponse.json({ translatedText, languageVersion, audio: ttsData.audio });
  } catch (error) {
    return jsonError(error, "Language audio generation failed");
  }
}
