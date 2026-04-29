import type { PodcastGenerationSettings, PodcastVoiceSettings } from "@/types/podcast-template";

export const PODCAST_PROJECTS_FILE = "data/local/podcast-template-projects.json";

export const PODCAST_DEFAULT_VOICE_SETTINGS: PodcastVoiceSettings = {
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.2,
  speakerBoost: true,
};

export const PODCAST_DEFAULT_GENERATION_SETTINGS: PodcastGenerationSettings = {
  modelId: "eleven_multilingual_v2",
  languageCode: "en",
  outputFormat: "mp3_44100_128",
  pauseMsBetweenLines: 220,
  useDialogueApi: true,
  speechVolume: 1,
  musicVolume: 0.2,
  musicFadeInSec: 1.2,
  musicFadeOutSec: 1.2,
};

export const PODCAST_DEFAULT_SCRIPT_CONVERSION_PROMPT = `Turn the imported article into a podcast dialogue script.

Requirements:
- Keep facts strictly from the source text only.
- Use British English.
- 2-4 speakers (HOST, CO-HOST, GUEST, NARRATOR) as appropriate.
- Produce a clear intro, main discussion, and closing section.
- Keep it concise, natural, and conversational.
- Output ONLY lines in the format SPEAKER: text.
- Do not include markdown or bullet points.`;
