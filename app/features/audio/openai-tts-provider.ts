import fs from "fs/promises";
import path from "path";
import { outputAudioDir } from "@/app/lib/paths";
import { getServerSecret, getStoredVoiceOption } from "@/app/lib/server-secrets";
import type { AudioProvider, VoiceTrackOptions } from "./types";

/** OpenAI Text-to-Speech — natural voices, no separate ElevenLabs account */
export class OpenAiTtsAudioProvider implements AudioProvider {
  async resolveVoiceTrack(
    script: string,
    contentId: string,
    options?: VoiceTrackOptions,
  ): Promise<string> {
    const key = getServerSecret("OPENAI_API_KEY");
    if (!key) {
      throw new Error("OPENAI_API_KEY is required for OpenAI TTS");
    }

    const stored = getStoredVoiceOption("OPENAI_TTS_VOICE", "openaiTtsVoice");
    let voice: string;
    if (options?.gender === "male") {
      voice = process.env.OPENAI_TTS_VOICE_MALE?.trim() || "onyx";
    } else if (options?.gender === "female") {
      voice = process.env.OPENAI_TTS_VOICE_FEMALE?.trim() || "nova";
    } else {
      voice = stored || "nova";
    }
    const model = getStoredVoiceOption("OPENAI_TTS_MODEL", "openaiTtsModel") || "tts-1";
    const text = script.trim().slice(0, 4096);
    const speed = Math.min(4, Math.max(0.25, options?.speed ?? 1));

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        input: text || " ",
        response_format: "mp3",
        speed,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI TTS failed (${res.status}): ${err.slice(0, 500)}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const dir = outputAudioDir();
    await fs.mkdir(dir, { recursive: true });
    const out = path.join(dir, `${contentId}-openai-tts.mp3`);
    await fs.writeFile(out, buf);
    return out;
  }
}
