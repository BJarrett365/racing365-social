import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { fetchYouTubeTranscriptForVideo } from "@/app/lib/youtube-script/fetch-transcript";
import { parseManualTranscript } from "@/app/lib/youtube-script/utils";

export const maxDuration = 900;

async function transcribeWithOpenAi(file: File, apiKey: string, model: string) {
  const upload = new FormData();
  upload.set("file", file, file.name || "youtube-source.mp4");
  upload.set("model", model);
  upload.set("response_format", "json");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upload,
  });
  if (!res.ok) return null;
  return (await res.json()) as { text?: string; language?: string };
}

export async function POST(req: Request) {
  try {
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Upload an audio or video file for transcription." }, { status: 400 });
      }
      const apiKey = await getServerSecretAsync("OPENAI_API_KEY");
      if (!apiKey) {
        return NextResponse.json(
          { error: "OpenAI API key is required for uploaded audio/video transcription." },
          { status: 400 },
        );
      }
      const preferredModel = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-transcribe";
      const data =
        (await transcribeWithOpenAi(file, apiKey, preferredModel)) ??
        (preferredModel === "whisper-1" ? null : await transcribeWithOpenAi(file, apiKey, "whisper-1"));
      if (!data) {
        return NextResponse.json({ error: "OpenAI transcription failed." }, { status: 502 });
      }
      const transcript = {
        ...parseManualTranscript(data.text ?? ""),
        source: "uploaded_transcription" as const,
        language: data.language,
      };
      return NextResponse.json({ transcript });
    }

    const body = (await req.json().catch(() => ({}))) as {
      videoId?: string;
      url?: string;
      manualTranscript?: string;
      source?: "youtube_api" | "manual_paste" | "uploaded_transcription";
    };

    if (body.manualTranscript?.trim()) {
      return NextResponse.json({ transcript: parseManualTranscript(body.manualTranscript) });
    }

    if (body.videoId?.trim()) {
      const result = await fetchYouTubeTranscriptForVideo(body.videoId.trim(), body.url?.trim());
      if (result.transcript) return NextResponse.json(result);

      return NextResponse.json(
        {
          transcript: null,
          fallbackRequired: true,
          reason: result.reason,
          message: result.message,
          details: result.details,
        },
        { status: 202 },
      );
    }

    return NextResponse.json(
      {
        transcript: null,
        fallbackRequired: true,
        message:
          "Captions were not imported automatically. Use YouTube OAuth/Captions API for owned channels, paste the transcript manually, or upload audio/video for transcription.",
      },
      { status: 202 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Transcript import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
