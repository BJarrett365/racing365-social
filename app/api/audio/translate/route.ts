import { NextResponse } from "next/server";
import { translateAudioTranscript } from "@/app/lib/audio-studio-ai";
import { audioStudioId, ensureAudioProject, updateAudioStudioStore } from "@/app/lib/audio-studio-store";
import { jsonError } from "../_shared";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      projectId?: string;
      transcript?: string;
      transcriptId?: string;
      language?: string;
      previewOnly?: boolean;
    };
    const transcript = String(body.transcript ?? "").trim();
    const language = String(body.language ?? "").trim();
    if (!transcript || !language) {
      return NextResponse.json({ error: "transcript and language are required" }, { status: 400 });
    }

    const translatedText = await translateAudioTranscript(transcript, language);
    if (body.previewOnly) {
      return NextResponse.json({ translatedText });
    }

    const project = await ensureAudioProject(body.projectId);
    const languageVersion = {
      id: audioStudioId("aud_lang"),
      projectId: project.id,
      sourceTranscriptId: body.transcriptId,
      language,
      translatedText,
      createdAt: new Date().toISOString(),
    };

    await updateAudioStudioStore((store) => {
      store.languageVersions.unshift(languageVersion);
    });

    return NextResponse.json({ languageVersion, translatedText });
  } catch (error) {
    return jsonError(error, "Audio translation failed");
  }
}
