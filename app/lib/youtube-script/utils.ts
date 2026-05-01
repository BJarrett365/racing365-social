import type { ScriptOutputType, TranscriptResult, TranscriptSegment } from "@/app/lib/youtube-script/types";

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export const scriptOutputLabels: Record<ScriptOutputType, string> = {
  clean_transcript: "Clean transcript",
  summary: "Article summary",
  article: "Full article",
  video_script: "Video script",
  podcast_script: "Podcast dialogue script",
  shorts_script: "YouTube Shorts script",
  social_captions: "Social captions",
  quote_clips: "Quote clips",
  subtitles: "Subtitle file",
  translation: "Translate via Language Studio",
};

export function extractYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID_RE.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && VIDEO_ID_RE.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId && VIDEO_ID_RE.test(watchId)) return watchId;
      const parts = url.pathname.split("/").filter(Boolean);
      const id = parts.find((part, index) => ["embed", "shorts", "live"].includes(parts[index - 1] ?? ""));
      return id && VIDEO_ID_RE.test(id) ? id : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function canonicalYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function timeToSeconds(value: string): number | undefined {
  const match = value.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[,.](\d{1,3}))?$/);
  if (!match) return undefined;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const millis = Number(String(match[4] ?? "0").padEnd(3, "0"));
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

function parseTimestampedLines(text: string): TranscriptSegment[] {
  const rows = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const segments: TranscriptSegment[] = [];

  for (const row of rows) {
    const match = row.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d{1,3})?)\]?\s+(.+)$/);
    if (!match) continue;
    const startSeconds = timeToSeconds(match[1]);
    const text = match[2].replace(/\s+/g, " ").trim();
    if (!text) continue;
    segments.push({ startSeconds, text });
  }

  return segments.map((segment, index) => ({
    ...segment,
    endSeconds: segment.endSeconds ?? segments[index + 1]?.startSeconds ?? (segment.startSeconds ?? index * 5) + 5,
  }));
}

export function parseManualTranscript(text: string): TranscriptResult {
  const fullText = text.trim();
  if (fullText.includes("-->")) {
    const timed = parseTimedTranscript(fullText);
    return { ...timed, source: "manual_paste" };
  }

  const timestampedSegments = parseTimestampedLines(fullText);
  if (timestampedSegments.length > 0) {
    return {
      source: "manual_paste",
      segments: timestampedSegments,
      fullText: timestampedSegments.map((segment) => segment.text).join("\n\n"),
      hasTimestamps: true,
    };
  }

  const segments = fullText
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map<TranscriptSegment>((chunk) => ({ text: chunk }));

  return {
    source: "manual_paste",
    segments: segments.length > 0 ? segments : fullText ? [{ text: fullText }] : [],
    fullText,
    hasTimestamps: false,
  };
}

export function parseTimedTranscript(text: string, language?: string): TranscriptResult {
  const blocks = text
    .replace(/\r/g, "")
    .replace(/^WEBVTT[^\n]*\n+/i, "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const segments: TranscriptSegment[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex < 0) continue;
    const [rawStart, rawEnd] = lines[timeLineIndex].split("-->").map((part) => part.trim().split(/\s+/)[0]);
    const startSeconds = timeToSeconds(rawStart ?? "");
    const endSeconds = timeToSeconds(rawEnd ?? "");
    const cueText = lines
      .slice(timeLineIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cueText) continue;
    segments.push({ startSeconds, endSeconds, text: cueText });
  }

  if (segments.length === 0) {
    return { ...parseManualTranscript(text), language };
  }

  return {
    source: "youtube_api",
    language,
    segments,
    fullText: segments.map((segment) => segment.text).join("\n\n"),
    hasTimestamps: true,
  };
}

export function transcriptToText(transcript: TranscriptResult): string {
  return transcript.segments.length > 0
    ? transcript.segments.map((segment) => segment.text.trim()).filter(Boolean).join("\n\n")
    : transcript.fullText;
}

function formatSrtTime(seconds = 0): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const millis = Math.round((safe - Math.floor(safe)) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

export function transcriptToSrt(transcript: TranscriptResult): string {
  const sourceSegments = transcript.segments.length > 0 ? transcript.segments : [{ text: transcript.fullText }];
  return sourceSegments
    .map((segment, index) => {
      const start = segment.startSeconds ?? index * 5;
      const end = segment.endSeconds ?? start + 5;
      return `${index + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${segment.text.trim()}`;
    })
    .join("\n\n");
}

export function splitAiTextIntoSegments(text: string): TranscriptSegment[] {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => ({ text: chunk }));
}
