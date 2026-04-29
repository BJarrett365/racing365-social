export type PodcastSourceType = "paste" | "url";

export type PodcastVoiceSettings = {
  stability: number;
  similarityBoost: number;
  style: number;
  speakerBoost: boolean;
};

export type PodcastSpeakerRole = "Host" | "Co-Host" | "Guest" | "Narrator" | "Custom";

export type PodcastSpeaker = {
  id: string;
  name: string;
  role: PodcastSpeakerRole;
  voiceId: string;
  voiceSettings: PodcastVoiceSettings;
};

export type PodcastScriptSegment = {
  id: string;
  speakerId: string;
  speakerLabel: string;
  text: string;
  order: number;
};

export type PodcastChapter = {
  id: string;
  title: string;
  startMs?: number;
  basedOnSegmentId?: string;
};

export type PodcastGenerationSettings = {
  modelId: string;
  languageCode: string;
  outputFormat: string;
  pauseMsBetweenLines: number;
  useDialogueApi: boolean;
  speechVolume: number;
  musicVolume: number;
  musicFadeInSec: number;
  musicFadeOutSec: number;
};

export type PodcastGenerationHistoryItem = {
  id: string;
  createdAt: string;
  mode: "dialogue" | "per_line";
  status: "success" | "error";
  outputAudioRel?: string;
  message: string;
};

export type PodcastProject = {
  id: string;
  title: string;
  sourceType: PodcastSourceType;
  sourceUrl?: string;
  importedText: string;
  importedSummary?: string;
  /** User-editable prompt used to convert imported article text into speaker script via OpenAI. */
  scriptConversionPrompt: string;
  rawScript: string;
  segments: PodcastScriptSegment[];
  speakers: PodcastSpeaker[];
  chapters: PodcastChapter[];
  settings: PodcastGenerationSettings;
  introMusicRel?: string;
  outroMusicRel?: string;
  outputAudioRel?: string;
  generationHistory: PodcastGenerationHistoryItem[];
  createdAt: string;
  updatedAt: string;
};

export type ElevenLabsVoiceOption = {
  voiceId: string;
  name: string;
  previewUrl?: string;
  labels?: Record<string, string>;
  description?: string;
  category?: string;
};
