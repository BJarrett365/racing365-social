import { NextResponse } from "next/server";
import { translateAudioTranscript } from "@/app/lib/audio-studio-ai";
import { audioStudioId, ensureAudioProject, updateAudioStudioStore } from "@/app/lib/audio-studio-store";
import { jsonError } from "../_shared";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      projectId?: string;
      transcript?: string;
      translatedText?: string;
      language?: string;
      provider?: "openai" | "elevenlabs";
      voice?: string;
      voiceId?: string;
      speed?: number;
    };
    const transcript = String(body.transcript ?? "").trim();
    const suppliedTranslatedText = String(body.translatedText ?? "").trim();
    const language = String(body.language ?? "").trim();
    if ((!transcript && !suppliedTranslatedText) || !language) {
      return NextResponse.json({ error: "transcript or translatedText and language are required" }, { status: 400 });
    }

    const project = await ensureAudioProject(body.projectId);
    const translatedText = suppliedTranslatedText || await translateAudioTranscript(transcript, language);
    const baseUrl = new URL(req.url);
    const isElevenLabs = body.provider === "elevenlabs";
    const ttsPath = isElevenLabs ? "/api/audio/tts/elevenlabs" : "/api/audio/tts/openai";
    const voicePayload = isElevenLabs
      ? { voiceId: normaliseElevenLabsVoiceId(body.voiceId || body.voice) }
      : { voice: body.voice };
    const ttsRes = await fetch(new URL(ttsPath, baseUrl.origin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({
        projectId: project.id,
        text: translatedText,
        sourceTool: "language",
        language,
        ...voicePayload,
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

function normaliseElevenLabsVoiceId(value?: string): string {
  const voiceId = String(value ?? "").trim();
  const openAiVoiceNames = new Set(["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"]);
  if (!voiceId || openAiVoiceNames.has(voiceId.toLowerCase())) return "admin-default";
  return voiceId;
}
