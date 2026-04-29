import { getServerSecret } from "@/app/lib/server-secrets";
import { DummyAudioProvider } from "./dummy-audio-provider";
import { ElevenLabsAudioProvider } from "./elevenlabs-provider";
import { MacosSayAudioProvider } from "./macos-say-provider";
import { OpenAiTtsAudioProvider } from "./openai-tts-provider";
import type { AudioProvider } from "./types";

let audioSingleton: AudioProvider | null = null;

/**
 * Voice priority: ElevenLabs → OpenAI TTS → macOS `say` (Darwin) → dummy/silent.
 * Set USE_MACOS_SAY=0 to skip local `say` and use dummy when no cloud keys.
 */
function createDefaultAudioProvider(): AudioProvider {
  if (getServerSecret("ELEVENLABS_API_KEY")) {
    return new ElevenLabsAudioProvider();
  }
  if (getServerSecret("OPENAI_API_KEY")) {
    return new OpenAiTtsAudioProvider();
  }
  if (process.platform === "darwin" && process.env.USE_MACOS_SAY !== "0") {
    return new MacosSayAudioProvider();
  }
  return new DummyAudioProvider();
}

export function getAudioProvider(): AudioProvider {
  if (!audioSingleton) {
    audioSingleton = createDefaultAudioProvider();
  }
  return audioSingleton;
}

export function setAudioProvider(p: AudioProvider) {
  audioSingleton = p;
}

export function resetAudioProvider() {
  audioSingleton = null;
}

export type { AudioProvider, VoiceTrackOptions } from "./types";
export { DummyAudioProvider } from "./dummy-audio-provider";
export { ElevenLabsAudioProvider } from "./elevenlabs-provider";
export { OpenAiTtsAudioProvider } from "./openai-tts-provider";
export { MacosSayAudioProvider } from "./macos-say-provider";
