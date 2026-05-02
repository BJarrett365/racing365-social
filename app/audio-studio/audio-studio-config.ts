export type AudioStudioToolId =
  | "notes"
  | "transcribe"
  | "text-to-speech"
  | "voice-changer"
  | "voice-creator"
  | "guests"
  | "language"
  | "voice-isolator"
  | "elevenlabs-recording"
  | "elevenlabs-editing";

export type AudioStudioTool = {
  id: AudioStudioToolId;
  title: string;
  href: string;
  eyebrow: string;
  description: string;
  outputs: string[];
  providers: string[];
};

export const audioStudioTools: AudioStudioTool[] = [
  {
    id: "notes",
    title: "Audio Notes",
    href: "/audio-studio/notes",
    eyebrow: "Upload, record, summarise",
    description:
      "Transcribe audio, create clean notes, summaries, key points, action points, quotes, headlines and social ideas.",
    outputs: ["Project notes", "Quotes", "Headlines", "Social posts"],
    providers: ["OpenAI"],
  },
  {
    id: "transcribe",
    title: "Speech to Text Notes",
    href: "/audio-studio/transcribe",
    eyebrow: "Transcript workspace",
    description:
      "OpenAI transcription with timestamps, speaker labels, export formats and conversions into articles or scripts.",
    outputs: ["TXT", "DOCX", "SRT", "VTT"],
    providers: ["OpenAI"],
  },
  {
    id: "text-to-speech",
    title: "Text to Speech",
    href: "/audio-studio/text-to-speech",
    eyebrow: "Generate voice",
    description:
      "Choose OpenAI for quick generation or ElevenLabs for premium voice output, then save to media library.",
    outputs: ["Generated audio", "Voice preview"],
    providers: ["OpenAI", "ElevenLabs"],
  },
  {
    id: "voice-changer",
    title: "Voice Changer",
    href: "/audio-studio/voice-changer",
    eyebrow: "Voice remix",
    description:
      "Upload audio, describe the target voice style, send to ElevenLabs and save original plus edited versions.",
    outputs: ["Original", "Changed voice"],
    providers: ["ElevenLabs"],
  },
  {
    id: "voice-creator",
    title: "Voice Creator",
    href: "/audio-studio/voice-creator",
    eyebrow: "Reusable voices",
    description:
      "Record or upload clean samples, confirm permission and store returned ElevenLabs voice IDs in Voice Library.",
    outputs: ["Voice profile", "Voice ID"],
    providers: ["ElevenLabs"],
  },
  {
    id: "guests",
    title: "Audio with Guests",
    href: "/audio-studio/guests",
    eyebrow: "Multi-speaker shows",
    description:
      "Handle long-form guest audio, speaker-separated transcripts, guest notes, quotes and strong clip moments.",
    outputs: ["Guest notes", "Quotes", "Clip markers"],
    providers: ["OpenAI"],
  },
  {
    id: "language",
    title: "Audio Language",
    href: "/audio-studio/language",
    eyebrow: "Translate and revoice",
    description:
      "Translate original transcripts and generate new audio by language using OpenAI or ElevenLabs TTS.",
    outputs: ["Translated transcript", "Language audio"],
    providers: ["OpenAI", "ElevenLabs"],
  },
  {
    id: "voice-isolator",
    title: "Voice Isolator",
    href: "/audio-studio/voice-isolator",
    eyebrow: "Clean noisy audio",
    description:
      "Send noisy audio to ElevenLabs voice isolation and compare before/after playback in the workspace.",
    outputs: ["Cleaned voice", "Before/after"],
    providers: ["ElevenLabs"],
  },
  {
    id: "elevenlabs-recording",
    title: "Voice Recording",
    href: "/audio-studio/elevenlabs-recording",
    eyebrow: "Browser recorder",
    description:
      "Record clean voice samples in browser, check quality, save them and optionally send to voice creation.",
    outputs: ["Voice sample", "Media library item"],
    providers: ["ElevenLabs"],
  },
  {
    id: "elevenlabs-editing",
    title: "Voice Editing",
    href: "/audio-studio/elevenlabs-editing",
    eyebrow: "Regenerate segments",
    description:
      "Load generated ElevenLabs audio, edit paragraphs, speed, emotion, pauses and pronunciation, then regenerate.",
    outputs: ["Edited segment", "Replacement audio"],
    providers: ["ElevenLabs"],
  },
];

export function audioStudioToolById(id: AudioStudioToolId): AudioStudioTool {
  const tool = audioStudioTools.find((item) => item.id === id);
  if (!tool) throw new Error(`Unknown Audio Studio tool: ${id}`);
  return tool;
}
