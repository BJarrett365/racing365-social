import { NextResponse } from "next/server";
import { normaliseOpenAiTranscriptionLanguage, transcribeWithOpenAi } from "@/app/lib/audio-studio-ai";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import {
  audioStudioId,
  ensureAudioProject,
  updateAudioStudioStore,
  type TranscriptSpeaker,
} from "@/app/lib/audio-studio-store";
import { audioFileFromForm, jsonError, saveAudioFileFromForm } from "../../_shared";

type GuestSpeakerInput = {
  id?: string;
  defaultLabel?: string;
  default_label?: string;
  displayName?: string;
  display_name?: string;
  role?: string;
  colour?: string;
};

type SpeakerMarkInput = {
  speaker_id?: string;
  timestamp?: number;
};

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const project = await ensureAudioProject(String(form.get("projectId") ?? ""));
    const file = await audioFileFromForm(form);
    const source = String(form.get("source") ?? "") === "recording" ? "recording" : "upload";
    const savedFile = await saveAudioFileFromForm(form, source);
    const language = normaliseOpenAiTranscriptionLanguage(String(form.get("language") ?? "")) || undefined;
    const title = String(form.get("title") || savedFile.title || "Audio with Guests").trim();
    const sport = String(form.get("sport") || "Sport").trim();
    const brand = String(form.get("brand") || "Planet Sport Studio").trim();
    const recordingMode = String(form.get("recordingMode") || "same-room").trim();
    const removeBackgroundNoise = String(form.get("removeBackgroundNoise") ?? "") === "true";
    const transcriptId = audioStudioId("aud_guest_tx");
    const speakers = buildSpeakers(transcriptId, form.get("speakers"), Number(form.get("guestCount") ?? 1));
    const speakerMarks = parseSpeakerMarks(form.get("speakerMarks"), speakers);
    const transcriptionFile = await prepareTranscriptionFile(file, removeBackgroundNoise);
    const result = await transcribeGuests(transcriptionFile, language, speakers.length);
    const defaultSpeakerId = speakers[0]?.id;
    const speakerIdByDetectedVoice = mapDetectedSpeakersByFirstAppearance(result.segments, speakers);
    const shouldPreferSpeakerMarks = speakerMarks.length > 1 && speakerIdByDetectedVoice.size <= 1;
    const now = new Date().toISOString();
    const segments = result.segments.length
      ? result.segments.map((segment) => ({
          ...segment,
          speakerId: shouldPreferSpeakerMarks
            ? speakerFromMarks(segment.start, segment.end, speakerMarks) || defaultSpeakerId
            : speakerIdByDetectedVoice.get(segment.speakerId || "") || speakerFromMarks(segment.start, segment.end, speakerMarks) || defaultSpeakerId,
        }))
      : [{
          id: audioStudioId("aud_seg"),
          speakerId: defaultSpeakerId,
          start: 0,
          end: undefined,
          text: result.text,
        }];
    const transcript = {
      id: transcriptId,
      projectId: project.id,
      audioFileId: savedFile.id,
      provider: "openai" as const,
      text: result.text,
      language: result.language || language,
      segments,
      speakers,
      createdAt: now,
      updatedAt: now,
    };

    await updateAudioStudioStore((store) => {
      store.transcripts.unshift(transcript);
    });

    return NextResponse.json({
      recording: {
        id: transcript.id,
        title,
        sport,
        brand,
        date: now,
        duration: maxSegmentEnd(segments),
        audio_url: `/api/file?rel=${encodeURIComponent(savedFile.relPath)}`,
        status: "transcribed",
        transcription_provider: result.provider,
        diarisation_enabled: result.provider === "elevenlabs",
        diarisation_warning: result.warning,
        speaker_markers_used: shouldPreferSpeakerMarks,
        noise_reduction_enabled: removeBackgroundNoise && transcriptionFile !== file,
        recording_mode: recordingMode,
        invite_url: "",
        speakers: speakers.map((speaker, index) => ({
          id: speaker.id,
          default_label: speaker.label,
          display_name: speaker.displayName,
          role: index === 0 ? "Host" : "Guest",
          colour: speakerColour(index),
          confidence_score: null,
        })),
        transcript_segments: segments.map((segment) => ({
          id: segment.id,
          speaker_id: segment.speakerId,
          start_time: segment.start,
          end_time: segment.end,
          text: segment.text,
          confidence_score: null,
          edited_text: "",
          is_highlighted_quote: false,
        })),
        summary: null,
      },
      file: savedFile,
      transcript,
    });
  } catch (error) {
    return jsonError(error, "Audio with Guests processing failed");
  }
}

async function prepareTranscriptionFile(file: File, removeBackgroundNoise: boolean): Promise<File> {
  if (!removeBackgroundNoise) return file;
  const key = await getServerSecretAsync("ELEVENLABS_API_KEY");
  if (!key) return file;
  try {
    const body = new FormData();
    body.set("audio", file);
    const res = await fetch("https://api.elevenlabs.io/v1/audio-isolation", {
      method: "POST",
      headers: { "xi-api-key": key, Accept: "audio/mpeg" },
      body,
    });
    if (!res.ok) return file;
    return new File(
      [Buffer.from(await res.arrayBuffer())],
      `${file.name.replace(/\.[^.]+$/, "") || "audio-with-guests"}-cleaned.mp3`,
      { type: "audio/mpeg" },
    );
  } catch {
    return file;
  }
}

async function transcribeGuests(file: File, language: string | undefined, speakerCount: number): Promise<{
  provider: "elevenlabs" | "openai";
  text: string;
  language?: string;
  warning?: string;
  segments: Array<{ id: string; start?: number; end?: number; text: string; speakerId?: string }>;
}> {
  const elevenLabsKey = await getServerSecretAsync("ELEVENLABS_API_KEY");
  let warning: string | undefined;
  if (elevenLabsKey) {
    try {
      return await transcribeWithElevenLabs(file, elevenLabsKey, language, speakerCount);
    } catch (error) {
      // Fall back to OpenAI so the core guests workflow still works if ElevenLabs STT is unavailable.
      warning = error instanceof Error ? error.message : "ElevenLabs diarised transcription was unavailable.";
    }
  } else {
    warning = "ELEVENLABS_API_KEY is required for automatic Host/Guest voice detection.";
  }

  const openAiResult = await transcribeWithOpenAi(file, language);
  return {
    provider: "openai",
    warning,
    ...openAiResult,
  };
}

async function transcribeWithElevenLabs(
  file: File,
  key: string,
  language: string | undefined,
  speakerCount: number,
): Promise<{
  provider: "elevenlabs";
  text: string;
  language?: string;
  segments: Array<{ id: string; start?: number; end?: number; text: string; speakerId?: string }>;
}> {
  const body = new FormData();
  body.set("model_id", "scribe_v2");
  body.set("file", file);
  body.set("diarize", "true");
  body.set("num_speakers", String(Math.min(32, Math.max(1, speakerCount))));
  body.set("timestamps_granularity", "word");
  body.set("tag_audio_events", "true");
  if (language && language !== "auto") body.set("language_code", language);

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs diarised transcription failed (${res.status}): ${error.slice(0, 500)}`);
  }

  const data = await res.json() as {
    text?: string;
    language_code?: string;
    language?: string;
    words?: Array<{
      text?: string;
      word?: string;
      start?: number;
      end?: number;
      speaker_id?: string | null;
      type?: string;
    }>;
  };
  const segments = wordsToSpeakerSegments(data.words ?? []);
  return {
    provider: "elevenlabs",
    text: data.text?.trim() || segments.map((segment) => segment.text).join(" "),
    language: data.language_code || data.language,
    segments,
  };
}

function wordsToSpeakerSegments(words: Array<{
  text?: string;
  word?: string;
  start?: number;
  end?: number;
  speaker_id?: string | null;
  type?: string;
}>): Array<{ id: string; start?: number; end?: number; text: string; speakerId?: string }> {
  const segments: Array<{ id: string; start?: number; end?: number; text: string; speakerId?: string }> = [];
  let current: { id: string; start?: number; end?: number; text: string; speakerId?: string } | null = null;

  for (const word of words) {
    const text = String(word.text ?? word.word ?? "").trim();
    if (!text) continue;
    const speakerId = word.speaker_id || "speaker_0";
    const shouldStart = !current || current.speakerId !== speakerId || endsSentence(current.text);
    if (shouldStart) {
      if (current?.text.trim()) segments.push({ ...current, text: current.text.trim() });
      current = {
        id: audioStudioId("aud_seg"),
        start: word.start,
        end: word.end,
        text,
        speakerId,
      };
    } else {
      if (!current) continue;
      current.text = appendWord(current.text, text);
      current.end = word.end ?? current.end;
    }
  }

  if (current?.text.trim()) segments.push({ ...current, text: current.text.trim() });
  return segments;
}

function mapDetectedSpeakersByFirstAppearance(
  segments: Array<{ speakerId?: string }>,
  speakers: TranscriptSpeaker[],
): Map<string, string> {
  const mapping = new Map<string, string>();
  for (const segment of segments) {
    const detectedSpeakerId = segment.speakerId;
    if (!detectedSpeakerId || mapping.has(detectedSpeakerId)) continue;
    const speaker = speakers[mapping.size];
    if (!speaker) break;
    mapping.set(detectedSpeakerId, speaker.id);
  }
  return mapping;
}

function endsSentence(text: string): boolean {
  return /[.!?]$/.test(text.trim());
}

function appendWord(current: string, word: string): string {
  return /^[,.;:!?)]/.test(word) ? `${current}${word}` : `${current} ${word}`;
}

function buildSpeakers(transcriptId: string, raw: FormDataEntryValue | null, guestCount: number): TranscriptSpeaker[] {
  const inputs = parseSpeakers(raw);
  const count = Math.min(10, Math.max(1, Number.isFinite(guestCount) ? Math.round(guestCount) : 1));
  const defaults = [
    { defaultLabel: "Host", displayName: "Host", role: "Host" },
    ...Array.from({ length: count }, (_, index) => ({
      defaultLabel: `Guest ${index + 1}`,
      displayName: `Guest ${index + 1}`,
      role: "Guest",
    })),
  ];

  return defaults.map((fallback, index) => {
    const input = inputs[index];
    const label = input?.defaultLabel?.trim() || input?.default_label?.trim() || fallback.defaultLabel;
    const displayName = input?.displayName?.trim() || input?.display_name?.trim() || label;
    return {
      id: input?.id?.trim() || audioStudioId("aud_spk"),
      transcriptId,
      label,
      displayName,
    };
  });
}

function parseSpeakers(raw: FormDataEntryValue | null): GuestSpeakerInput[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as GuestSpeakerInput[] : [];
  } catch {
    return [];
  }
}

function parseSpeakerMarks(raw: FormDataEntryValue | null, speakers: TranscriptSpeaker[]): SpeakerMarkInput[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const speakerIds = new Set(speakers.map((speaker) => speaker.id));
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => item as SpeakerMarkInput)
      .filter((item) => item.speaker_id && speakerIds.has(item.speaker_id) && Number.isFinite(Number(item.timestamp)))
      .map((item) => ({ speaker_id: item.speaker_id, timestamp: Math.max(0, Number(item.timestamp)) }))
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  } catch {
    return [];
  }
}

function speakerFromMarks(start: number | undefined, end: number | undefined, marks: SpeakerMarkInput[]): string | undefined {
  if (!marks.length) return undefined;
  const hasRange = Number.isFinite(start) && Number.isFinite(end);
  const time = Math.max(0, hasRange ? ((start ?? 0) + (end ?? 0)) / 2 : start ?? 0);
  let match = marks[0];
  for (const mark of marks) {
    if (Number(mark.timestamp) <= time) match = mark;
    else break;
  }
  return match?.speaker_id;
}

function maxSegmentEnd(segments: Array<{ end?: number; start?: number }>): number {
  return Math.max(0, ...segments.map((segment) => segment.end ?? segment.start ?? 0));
}

function speakerColour(index: number): string {
  return ["#38bdf8", "#22c55e", "#f97316", "#a78bfa", "#f43f5e", "#14b8a6", "#eab308", "#6366f1", "#84cc16", "#ec4899", "#06b6d4"][index % 11];
}
