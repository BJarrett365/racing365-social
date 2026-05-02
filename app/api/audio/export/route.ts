import { NextResponse } from "next/server";
import { generateArticleOrSocialFromTranscript } from "@/app/lib/audio-studio-ai";
import { jsonError } from "../_shared";

type ExportFormat = "txt" | "docx" | "srt" | "vtt" | "article" | "podcast-script" | "captions" | "social-posts";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      transcript?: string;
      format?: ExportFormat;
      projectId?: string;
    };
    const transcript = String(body.transcript ?? "").trim();
    const format = String(body.format ?? "txt") as ExportFormat;
    if (!transcript) return NextResponse.json({ error: "transcript is required" }, { status: 400 });

    if (["article", "podcast-script", "captions", "social-posts"].includes(format)) {
      const output = await generateArticleOrSocialFromTranscript(transcript, format as "article" | "podcast-script" | "captions" | "social-posts");
      return NextResponse.json({ output });
    }

    const exportPayload = buildExport(transcript, format);
    return NextResponse.json({ export: exportPayload });
  } catch (error) {
    return jsonError(error, "Audio export failed");
  }
}

function buildExport(transcript: string, format: ExportFormat) {
  const filename = `audio-transcript.${format}`;
  if (format === "srt") {
    return {
      filename,
      mimeType: "application/x-subrip;charset=utf-8",
      content: toSrt(transcript),
    };
  }
  if (format === "vtt") {
    return {
      filename,
      mimeType: "text/vtt;charset=utf-8",
      content: `WEBVTT\n\n${toSrt(transcript).replace(/,/g, ".")}`,
    };
  }
  if (format === "docx") {
    return {
      filename,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: transcript,
    };
  }
  return {
    filename,
    mimeType: "text/plain;charset=utf-8",
    content: transcript,
  };
}

function toSrt(transcript: string): string {
  const lines = transcript.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines.map((line, index) => {
    const start = index * 5;
    const end = start + 5;
    return `${index + 1}\n${timecode(start)} --> ${timecode(end)}\n${line.replace(/^\[[^\]]+\]\s*/, "")}\n`;
  }).join("\n");
}

function timecode(seconds: number): string {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s},000`;
}
