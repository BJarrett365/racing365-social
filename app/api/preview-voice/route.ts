import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getAudioProvider } from "@/app/features/audio";
import { outputAudioDir } from "@/app/lib/paths";
import { VOICE_PREVIEW_MAX_CHARS } from "@/app/lib/voice-preview";
import type { VoiceGender } from "@/types";

type Body = {
  script?: string;
  voiceGender?: VoiceGender;
  voiceSpeed?: number;
  elevenlabsVoiceId?: string;
  contentId?: string;
};

function safeDeleteIfOutputAudio(filePath: string): Promise<void> {
  const resolved = path.resolve(filePath);
  const root = path.resolve(outputAudioDir());
  const under =
    resolved === root || resolved.startsWith(root + path.sep);
  if (!under) return Promise.resolve();
  return fs.unlink(resolved).catch(() => {});
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const script = String(body.script ?? "").trim();
    if (!script) {
      return NextResponse.json({ error: "script required for preview" }, { status: 400 });
    }

    const slug = String(body.contentId ?? "preview")
      .replace(/[^a-zA-Z0-9-_]/g, "")
      .slice(0, 48);
    const previewId = `pv-${slug || "x"}-${Date.now()}`;

    const gender: VoiceGender = body.voiceGender === "male" ? "male" : "female";
    const speedRaw = Number(body.voiceSpeed);
    const speed = Number.isFinite(speedRaw)
      ? Math.min(2, Math.max(0.5, speedRaw))
      : 1;

    const snippet = script.slice(0, VOICE_PREVIEW_MAX_CHARS);

    const audioPath = await (await getAudioProvider()).resolveVoiceTrack(snippet, previewId, {
      gender,
      speed,
      voiceId: body.elevenlabsVoiceId?.trim() || undefined,
    });

    const buf = await fs.readFile(audioPath);
    await safeDeleteIfOutputAudio(audioPath);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
