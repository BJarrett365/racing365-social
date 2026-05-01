export type YouTubeVideoMeta = {
  videoId: string;
  url: string;
  title: string;
  channelName?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  publishedAt?: string;
};

export type TranscriptSegment = {
  startSeconds?: number;
  endSeconds?: number;
  text: string;
};

export type TranscriptResult = {
  source: "youtube_api" | "apify" | "manual_paste" | "uploaded_transcription";
  language?: string;
  segments: TranscriptSegment[];
  fullText: string;
  hasTimestamps: boolean;
};

export type ScriptOutputType =
  | "clean_transcript"
  | "summary"
  | "article"
  | "video_script"
  | "podcast_script"
  | "shorts_script"
  | "social_captions"
  | "quote_clips"
  | "subtitles"
  | "translation";

export type YouTubeGeneratedOutput = {
  id: string;
  type: ScriptOutputType;
  title: string;
  content: string;
  language?: string;
  createdAt: string;
};

export type YouTubeScriptImport = {
  id: string;
  sourceUrl: string;
  meta: YouTubeVideoMeta;
  transcript: TranscriptResult;
  outputs: YouTubeGeneratedOutput[];
  createdAt: string;
  updatedAt: string;
};
