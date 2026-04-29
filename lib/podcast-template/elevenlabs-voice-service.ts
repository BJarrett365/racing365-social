import { getServerSecret } from "@/app/lib/server-secrets";
import type { ElevenLabsVoiceOption } from "@/types/podcast-template";

type ApiVoice = {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  preview_url?: string;
  description?: string;
  category?: string;
};

export class ElevenLabsVoiceService {
  async listVoices(): Promise<ElevenLabsVoiceOption[]> {
    const key = getServerSecret("ELEVENLABS_API_KEY");
    if (!key) return [];
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": key },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`ElevenLabs voices failed (${res.status})`);
    const data = (await res.json()) as { voices?: ApiVoice[] };
    const voices = (Array.isArray(data.voices) ? data.voices : []).filter((v) => v.voice_id && v.name);
    return voices
      .map((v) => ({
        voiceId: v.voice_id,
        name: v.name,
        labels: v.labels,
        previewUrl: v.preview_url,
        description: v.description,
        category: v.category,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
