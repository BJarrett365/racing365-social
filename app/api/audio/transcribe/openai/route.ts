import { NextResponse } from "next/server";
import { normaliseOpenAiTranscriptionLanguage, transcribeWithOpenAi } from "@/app/lib/audio-studio-ai";
import { audioStudioId, ensureAudioProject, updateAudioStudioStore, type TranscriptSpeaker } from "@/app/lib/audio-studio-store";
import { audioFileFromForm, jsonError, saveAudioFileFromForm } from "../../_shared";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const project = await ensureAudioProject(String(form.get("projectId") ?? ""));
    const file = await audioFileFromForm(form);
    const savedFile = await saveAudioFileFromForm(form, "upload");
    const language = normaliseOpenAiTranscriptionLanguage(String(form.get("language") ?? "")) || undefined;
    const result = await transcribeWithOpenAi(file, language);
    const transcriptId = audioStudioId("aud_tx");
    const speaker: TranscriptSpeaker = {
      id: audioStudioId("aud_spk"),
      transcriptId,
      label: "Speaker 1",
      displayName: "Speaker 1",
    };
    const now = new Date().toISOString();
    const transcript = {
      id: transcriptId,
      projectId: project.id,
      audioFileId: savedFile.id,
      provider: "openai" as const,
      text: result.text,
      language: result.language || language,
      segments: result.segments.map((segment) => ({ ...segment, speakerId: speaker.id })),
      speakers: [speaker],
      createdAt: now,
      updatedAt: now,
    };

    await updateAudioStudioStore((store) => {
      store.transcripts.unshift(transcript);
    });

    return NextResponse.json({ transcript });
  } catch (error) {
    return jsonError(error, "OpenAI transcription failed");
  }
}
