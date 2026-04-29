import type { VoiceGender } from "@/types";

export interface VoiceTrackOptions {
  gender?: VoiceGender;
  /** 0.5–2 typical; providers clamp as needed */
  speed?: number;
  /** Provider-specific explicit voice id (e.g. ElevenLabs voice_id) */
  voiceId?: string;
}

export interface AudioProvider {
  /** Resolved path to an MP3 (or WAV) file on disk for FFmpeg */
  resolveVoiceTrack(
    script: string,
    contentId: string,
    options?: VoiceTrackOptions,
  ): Promise<string>;
}
