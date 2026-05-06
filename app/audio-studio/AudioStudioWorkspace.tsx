"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { AudioMeter } from "./AudioMeter";
import { AudioWithGuestsWorkspace } from "./AudioWithGuestsWorkspace";
import { VoiceCreatorCloneWorkspace } from "./VoiceCreatorCloneWorkspace";
import { visibleAudioStudioTools, type AudioStudioTool, type AudioStudioToolId } from "./audio-studio-config";

type Provider = "openai" | "elevenlabs";
type RecorderTab = "recorder" | "memos" | "settings";

type ApiState = {
  loading: boolean;
  message: string;
  error: string;
};

type ProjectMediaItem = {
  id: string;
  kind: "file" | "generated";
  title: string;
  name: string;
  originalName: string;
  source: string;
  mimeType: string;
  size?: number;
  relPath: string;
  createdAt: string;
};

type SavedNoteFile = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
};

type ElevenLabsVoiceOption = {
  voice_id: string;
  name: string;
  description?: string;
  category?: string;
  groupLabel?: string;
  labels?: Record<string, string>;
};

const fallbackElevenLabsVoices: ElevenLabsVoiceOption[] = [
  { voice_id: "9BWtsMINqrJLrRacOk9x", name: "Aria", category: "premade", groupLabel: "Female", labels: { accent: "American" } },
  { voice_id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", category: "premade", groupLabel: "Male", labels: { accent: "American" } },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", category: "premade", groupLabel: "Female", labels: { accent: "American" } },
  { voice_id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", category: "premade", groupLabel: "Female", labels: { accent: "American" } },
  { voice_id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", category: "premade", groupLabel: "Male", labels: { accent: "Australian" } },
  { voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "George", category: "premade", groupLabel: "Male", labels: { accent: "British" } },
  { voice_id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", category: "premade", groupLabel: "Male", labels: { accent: "American" } },
  { voice_id: "SAz9YHcvj6GT2YYXdXww", name: "River", category: "premade", groupLabel: "Other", labels: { accent: "American" } },
  { voice_id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", category: "premade", groupLabel: "Male", labels: { accent: "American" } },
  { voice_id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", category: "premade", groupLabel: "Female", labels: { accent: "Swedish" } },
  { voice_id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", category: "premade", groupLabel: "Female", labels: { accent: "British" } },
  { voice_id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", category: "premade", groupLabel: "Female", labels: { accent: "American" } },
  { voice_id: "bIHbv24MWmeRgasZH58o", name: "Will", category: "premade", groupLabel: "Male", labels: { accent: "American" } },
  { voice_id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", category: "premade", groupLabel: "Female", labels: { accent: "American" } },
  { voice_id: "cjVigY5qzO86Huf0OWal", name: "Eric", category: "premade", groupLabel: "Male", labels: { accent: "American" } },
  { voice_id: "iP95p4xoKVk53GoZ742B", name: "Chris", category: "premade", groupLabel: "Male", labels: { accent: "American" } },
  { voice_id: "nPczCjzI2devNBz1zQrb", name: "Brian", category: "premade", groupLabel: "Male", labels: { accent: "American" } },
  { voice_id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", category: "premade", groupLabel: "Male", labels: { accent: "British" } },
  { voice_id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", category: "premade", groupLabel: "Female", labels: { accent: "British" } },
  { voice_id: "pqHfZKP75CvOlQylNhV4", name: "Bill", category: "premade", groupLabel: "Male", labels: { accent: "American" } },
  { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (legacy)", category: "premade", groupLabel: "Female", labels: { accent: "American" } },
];

const acceptedAudio = ".mp3,.wav,.m4a,.mp4,audio/*,video/mp4";
const languageOptions = [
  { label: "Auto detect", code: "auto" },
  { label: "English", code: "en" },
  { label: "Spanish", code: "es" },
  { label: "French", code: "fr" },
  { label: "German", code: "de" },
  { label: "Italian", code: "it" },
  { label: "Portuguese", code: "pt" },
  { label: "Arabic", code: "ar" },
  { label: "Japanese", code: "ja" },
];

const openAiVoiceOptions = [
  { label: "Alloy", value: "alloy" },
  { label: "Ash", value: "ash" },
  { label: "Ballad", value: "ballad" },
  { label: "Coral", value: "coral" },
  { label: "Echo", value: "echo" },
  { label: "Fable", value: "fable" },
  { label: "Nova", value: "nova" },
  { label: "Onyx", value: "onyx" },
  { label: "Sage", value: "sage" },
  { label: "Shimmer", value: "shimmer" },
];

const elevenLabsModelOptions = [
  { label: "Eleven Multilingual v2", value: "eleven_multilingual_v2" },
  { label: "Eleven v3", value: "eleven_v3" },
  { label: "Eleven Flash v2.5", value: "eleven_flash_v2_5" },
];

export function AudioStudioWorkspace({ activeTool }: { activeTool: AudioStudioTool }) {
  const [projectId, setProjectId] = useState("default-audio-project");
  const [provider, setProvider] = useState<Provider>(activeTool.providers.includes("ElevenLabs") ? "elevenlabs" : "openai");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [language, setLanguage] = useState(activeTool.id === "language" ? "en" : "auto");
  const [voice, setVoice] = useState("nova");
  const [elevenLabsVoice, setElevenLabsVoice] = useState("admin-default");
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoiceOption[]>([]);
  const [elevenLabsVoicesStatus, setElevenLabsVoicesStatus] = useState("");
  const [customElevenLabsVoiceId, setCustomElevenLabsVoiceId] = useState("");
  const [elevenLabsModel, setElevenLabsModel] = useState("eleven_multilingual_v2");
  const [outputFormat, setOutputFormat] = useState("mp3_44100_128");
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [styleExaggeration, setStyleExaggeration] = useState(0);
  const [speakerBoost, setSpeakerBoost] = useState(true);
  const [tone, setTone] = useState("Natural, confident and editorial");
  const [speed, setSpeed] = useState(1);
  const [text, setText] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const [autoTitleFromAudio, setAutoTitleFromAudio] = useState(true);
  const [targetVoiceStyle, setTargetVoiceStyle] = useState("Clear sports presenter voice with warm authority");
  const [transcript, setTranscript] = useState("");
  const [notesTranslationLanguage, setNotesTranslationLanguage] = useState("it");
  const [translatedNotesTranscript, setTranslatedNotesTranscript] = useState("");
  const [notesTranslationStatus, setNotesTranslationStatus] = useState("");
  const [result, setResult] = useState("");
  const [savedNotes, setSavedNotes] = useState<SavedNoteFile[]>([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [projectMedia, setProjectMedia] = useState<ProjectMediaItem[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [displayMeterLevel, setDisplayMeterLevel] = useState(0);
  const [recorderTab, setRecorderTab] = useState<RecorderTab>("recorder");
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDeviceId, setMicDeviceId] = useState("");
  const [recordingQuality, setRecordingQuality] = useState("High");
  const [recordingFormat, setRecordingFormat] = useState("WebM");
  const [recordedMimeType, setRecordedMimeType] = useState("audio/webm");
  const [languageSpeechRecording, setLanguageSpeechRecording] = useState(false);
  const [targetLanguageSpeechRecording, setTargetLanguageSpeechRecording] = useState(false);
  const [sourceLanguageAudioUrl, setSourceLanguageAudioUrl] = useState("");
  const [api, setApi] = useState<ApiState>({ loading: false, message: "", error: "" });
  const [translationPreviewStatus, setTranslationPreviewStatus] = useState("");
  const [autoTranscriptStatus, setAutoTranscriptStatus] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingStream = useRef<MediaStream | null>(null);
  const languageSpeechRecorder = useRef<MediaRecorder | null>(null);
  const languageSpeechStream = useRef<MediaStream | null>(null);
  const languageSpeechChunks = useRef<BlobPart[]>([]);
  const targetLanguageSpeechRecorder = useRef<MediaRecorder | null>(null);
  const targetLanguageSpeechStream = useRef<MediaStream | null>(null);
  const targetLanguageSpeechChunks = useRef<BlobPart[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const meterAnimation = useRef<number | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const autoTranscribedMediaId = useRef("");

  const featureCopy = useMemo(() => copyForTool(activeTool.id), [activeTool.id]);
  const recordingFile = recordedBlob ? new File([recordedBlob], `browser-recording.${extensionForMime(recordedMimeType)}`, { type: recordedMimeType }) : null;
  const fileForApi = recordingFile ?? uploadedFile;
  const visibleProjectMedia = useMemo(
    () => filterProjectMediaForTool(activeTool.id, projectMedia),
    [activeTool.id, projectMedia],
  );

  useEffect(() => {
    if (activeTool.id !== "text-to-speech") return;
    let cancelled = false;

    async function loadElevenLabsVoices() {
      setElevenLabsVoicesStatus("Loading ElevenLabs voices...");
      try {
        const res = await fetch("/api/voice-options/elevenlabs", { cache: "no-store", credentials: "include" });
        if (!res.ok) throw new Error("Voice options unavailable");
        const data = await res.json() as { voices?: ElevenLabsVoiceOption[]; source?: string };
        const voices = Array.isArray(data.voices)
          ? data.voices.filter((item) => String(item.voice_id ?? "").trim() && String(item.name ?? "").trim())
          : [];
        const sourceVoices = voices.length > 0 ? voices : fallbackElevenLabsVoices;

        if (cancelled) return;
        setElevenLabsVoices(sourceVoices);
        setElevenLabsVoicesStatus(
          voices.length > 0
            ? `${voices.length} ElevenLabs voices loaded${data.source === "fallback" ? " from fallback list" : ""}.`
            : "Using built-in ElevenLabs default voices.",
        );
      } catch {
        if (cancelled) return;
        setElevenLabsVoices(fallbackElevenLabsVoices);
        setElevenLabsVoicesStatus("Using built-in ElevenLabs default voices. You can still use Admin default or a custom voice ID.");
      }
    }

    loadElevenLabsVoices();

    return () => {
      cancelled = true;
    };
  }, [activeTool.id]);

  const loadProjectMedia = useCallback(async () => {
    const id = projectId.trim();
    if (!id) {
      setProjectMedia([]);
      return;
    }
    const data = await jsonOrThrow<{ files: ProjectMediaItem[] }>(
      await fetch(projectMediaUrlForTool(activeTool.id, id)),
    );
    setProjectMedia(data.files);
    const visibleFiles = filterProjectMediaForTool(activeTool.id, data.files);
    setSelectedMediaId((current) =>
      current && visibleFiles.some((item) => item.id === current) ? current : visibleFiles[0]?.id ?? "",
    );
  }, [activeTool.id, projectId]);

  const loadProjectNotes = useCallback(async () => {
    const id = projectId.trim();
    if (!id) {
      setSavedNotes([]);
      return;
    }
    const data = await jsonOrThrow<{ notes: SavedNoteFile[] }>(
      await fetch(`/api/audio/notes?projectId=${encodeURIComponent(id)}`),
    );
    setSavedNotes(data.notes);
  }, [projectId]);

  useEffect(() => {
    void loadProjectMedia();
    if (activeTool.id !== "text-to-speech" && activeTool.id !== "language") void loadProjectNotes();
  }, [activeTool.id, loadProjectMedia, loadProjectNotes]);

  useEffect(() => {
    if (activeTool.id !== "language") return;
    const source = text.trim();
    if (!source) {
      setResult("");
      setTranslationPreviewStatus("");
      return;
    }
    if (language === "auto") return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setTranslationPreviewStatus("Translating...");
      try {
        const data = await jsonOrThrow<{ translatedText?: string; languageVersion?: { translatedText: string } }>(
          await fetch("/api/audio/translate", {
            method: "POST",
            headers: jsonHeaders,
            body: JSON.stringify({ projectId, transcript: source, language, previewOnly: true }),
            signal: controller.signal,
          }),
        );
        setResult(data.translatedText ?? data.languageVersion?.translatedText ?? "");
        setTranslationPreviewStatus("");
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Auto translation failed";
        setTranslationPreviewStatus(message);
      }
    }, 700);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [activeTool.id, language, projectId, text]);

  useEffect(() => {
    if (activeTool.id !== "notes") return;
    if (api.loading || recording || !selectedMediaId) return;
    const selectedMedia = projectMedia.find((item) => item.id === selectedMediaId);
    if (!selectedMedia || autoTranscribedMediaId.current === selectedMedia.id) return;

    const mediaToTranscribe = selectedMedia;
    let cancelled = false;
    autoTranscribedMediaId.current = mediaToTranscribe.id;
    setAutoTranscriptStatus("Generating transcript...");

    async function autoTranscribeSelectedMedia() {
      try {
        const file = await fileFromProjectMedia(mediaToTranscribe);
        const form = new FormData();
        form.set("projectId", projectId);
        if (language !== "auto") form.set("language", language);
        form.set("file", file);
        const data = await jsonOrThrow<{ transcript: { text: string; segments: Array<{ start?: number; end?: number; text: string }> } }>(
          await fetch("/api/audio/transcribe/openai", { method: "POST", body: form }),
        );
        if (cancelled) return;
        setTranscript(data.transcript.text);
        setResult(formatSegments(data.transcript.segments, data.transcript.text));
        setAutoTranscriptStatus("Transcript generated.");
      } catch (error) {
        if (cancelled) return;
        autoTranscribedMediaId.current = "";
        const message = error instanceof Error ? error.message : "Auto transcription failed";
        setAutoTranscriptStatus(message);
      }
    }

    void autoTranscribeSelectedMedia();

    return () => {
      cancelled = true;
    };
  }, [activeTool.id, api.loading, language, projectId, projectMedia, recording, selectedMediaId]);

  useEffect(() => {
    if (activeTool.id !== "notes") return;
    const source = transcript.trim();
    if (!source) {
      setTranslatedNotesTranscript("");
      setNotesTranslationStatus("");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setNotesTranslationStatus("Translating transcript...");
      try {
        const data = await jsonOrThrow<{ translatedText?: string; languageVersion?: { translatedText: string } }>(
          await fetch("/api/audio/translate", {
            method: "POST",
            headers: jsonHeaders,
            body: JSON.stringify({
              projectId,
              transcript: source,
              language: notesTranslationLanguage,
              previewOnly: true,
            }),
            signal: controller.signal,
          }),
        );
        setTranslatedNotesTranscript(data.translatedText ?? data.languageVersion?.translatedText ?? "");
        setNotesTranslationStatus("");
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Transcript translation failed";
        setNotesTranslationStatus(message);
      }
    }, 700);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [activeTool.id, notesTranslationLanguage, projectId, transcript]);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    void navigator.mediaDevices.enumerateDevices()
      .then((devices) => setMicDevices(devices.filter((device) => device.kind === "audioinput")))
      .catch(() => setMicDevices([]));
  }, []);

  useEffect(() => {
    if (!recording || recordingPaused) return;
    const interval = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [recording, recordingPaused]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!recording || recordingPaused) {
        setDisplayMeterLevel(0);
        return;
      }
      const calibratedLevel = calibrateAudioMeterLevel(recordingLevel);
      setDisplayMeterLevel((previous) => {
        const smoothing = calibratedLevel < previous ? 0.18 : 0.48;
        return Math.round((previous * smoothing) + (calibratedLevel * (1 - smoothing)));
      });
    }, 120);

    return () => window.clearInterval(interval);
  }, [recording, recordingPaused, recordingLevel]);

  useEffect(() => {
    return () => {
      stopMeter();
      recordingStream.current?.getTracks().forEach((track) => track.stop());
      languageSpeechStream.current?.getTracks().forEach((track) => track.stop());
      targetLanguageSpeechStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function runApi<T>(label: string, action: () => Promise<T>): Promise<T | null> {
    setApi({ loading: true, message: label, error: "" });
    setResult("");
    try {
      const value = await action();
      setApi({ loading: false, message: "Saved to Audio Studio project.", error: "" });
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Audio Studio action failed";
      setApi({ loading: false, message: "", error: message });
      return null;
    }
  }

  async function uploadCurrentAudio(source: "upload" | "recording") {
    const file = source === "recording" ? recordingFile : uploadedFile;
    if (!file) {
      throw new Error(source === "recording" ? "Record audio before saving a recording." : "Choose an audio file before saving to project.");
    }
    const form = new FormData();
    form.set("projectId", projectId);
    form.set("source", source);
    form.set("title", audioTitle);
    if (language !== "auto") form.set("language", language);
    form.set("generateTitle", autoTitleFromAudio ? "true" : "false");
    form.set("file", file);
    const res = await fetch(source === "recording" ? "/api/audio/record" : "/api/audio/upload", { method: "POST", body: form });
    const data = await jsonOrThrow<{ file: ProjectMediaItem }>(res);
    setAudioUrl(`/api/file?rel=${encodeURIComponent(data.file.relPath)}`);
    setSelectedMediaId(data.file.id);
    setAudioTitle(data.file.title || audioTitle);
    setResult(`Saved ${data.file.title || data.file.originalName || data.file.name} to project media.\n\n${data.file.relPath}`);
    await loadProjectMedia();
    return data;
  }

  async function deleteProjectMedia(item: ProjectMediaItem) {
    await runApi("Deleting audio...", async () => {
      await jsonOrThrow<{ ok: boolean }>(
        await fetch("/api/audio/files", {
          method: "DELETE",
          headers: jsonHeaders,
          body: JSON.stringify({ id: item.id, kind: item.kind }),
        }),
      );
      if (audioUrl.includes(encodeURIComponent(item.relPath))) setAudioUrl("");
      if (selectedMediaId === item.id) setSelectedMediaId("");
      setResult(`Deleted ${item.originalName || item.name} from project media.`);
      await loadProjectMedia();
      return { ok: true };
    });
  }

  async function transcribeAudio() {
    await runApi("Transcribing with OpenAI...", async () => {
      const selectedMedia = projectMedia.find((item) => item.id === selectedMediaId);
      const file = selectedMedia ? await fileFromProjectMedia(selectedMedia) : fileForApi;
      if (!file) throw new Error("Choose saved project media, upload audio or record audio before transcription.");
      const form = new FormData();
      form.set("projectId", projectId);
      if (language !== "auto") form.set("language", language);
      form.set("file", file);
      const data = await jsonOrThrow<{ transcript: { text: string; segments: Array<{ start?: number; end?: number; text: string }> } }>(
        await fetch("/api/audio/transcribe/openai", { method: "POST", body: form }),
      );
      setTranscript(data.transcript.text);
      setResult(formatSegments(data.transcript.segments, data.transcript.text));
      return data;
    });
  }

  async function generateNotes() {
    await runApi("Generating notes...", async () => {
      const body = { projectId, transcript: transcript || text, context: activeTool.title };
      const data = await jsonOrThrow<{ note: Record<string, unknown> }>(
        await fetch("/api/audio/notes", { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }),
      );
      setResult(formatNote(data.note));
      await loadProjectNotes();
      return data;
    });
  }

  async function saveNotes() {
    await runApi("Saving notes...", async () => {
      const notesSource = result || transcript || text;
      if (!notesSource.trim()) {
        throw new Error("Generate notes, transcribe audio or add text before saving notes.");
      }
      const body = {
        projectId,
        title: audioTitle || "Saved Audio Notes",
        content: notesSource,
        saveOnly: true,
      };
      const data = await jsonOrThrow<{ note: SavedNoteFile }>(
        await fetch("/api/audio/notes", { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }),
      );
      setResult(data.note.content);
      await loadProjectNotes();
      return data;
    });
  }

  async function updateSavedNote(note: SavedNoteFile) {
    await runApi("Saving note file...", async () => {
      const data = await jsonOrThrow<{ note: SavedNoteFile }>(
        await fetch("/api/audio/notes", {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({ id: note.id, title: note.title, content: note.content }),
        }),
      );
      setSavedNotes((current) => current.map((item) => item.id === data.note.id ? data.note : item));
      return data;
    });
  }

  function editSavedNote(id: string, patch: Partial<Pick<SavedNoteFile, "title" | "content">>) {
    setSavedNotes((current) => current.map((note) => note.id === id ? { ...note, ...patch } : note));
  }

  async function deleteSavedNote(note: SavedNoteFile) {
    await runApi("Deleting note file...", async () => {
      await jsonOrThrow<{ ok: boolean }>(
        await fetch("/api/audio/notes", {
          method: "DELETE",
          headers: jsonHeaders,
          body: JSON.stringify({ id: note.id }),
        }),
      );
      setSavedNotes((current) => current.filter((item) => item.id !== note.id));
      if (result === note.content) setResult("");
      return { ok: true };
    });
  }

  async function generateTts() {
    await runApi("Generating audio...", async () => {
      const selectedElevenLabsVoice = elevenLabsVoice === "custom" ? customElevenLabsVoiceId : elevenLabsVoice;
      const body = {
        projectId,
        text: text || transcript,
        voice: provider === "elevenlabs" ? selectedElevenLabsVoice : voice,
        voiceId: provider === "elevenlabs" ? selectedElevenLabsVoice : undefined,
        tone,
        speed,
        language,
        provider,
        modelId: elevenLabsModel,
        outputFormat,
        stability,
        similarity,
        styleExaggeration,
        speakerBoost,
      };
      const url = provider === "elevenlabs" ? "/api/audio/tts/elevenlabs" : "/api/audio/tts/openai";
      const data = await jsonOrThrow<{ audio: { relPath: string } }>(
        await fetch(url, { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }),
      );
      setAudioUrl(`/api/file?rel=${encodeURIComponent(data.audio.relPath)}`);
      setResult(`Generated audio saved to project media library.\n\n${data.audio.relPath}`);
      await loadProjectMedia();
      return data;
    });
  }

  async function runElevenLabsFileRoute(endpoint: string, label: string) {
    await runApi(label, async () => {
      if (!fileForApi) throw new Error("Upload or record audio first.");
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("targetVoiceStyle", targetVoiceStyle);
      form.set("permissionConfirmed", "true");
      form.set("file", fileForApi);
      const data = await jsonOrThrow<{ audio?: { relPath: string }; voice?: { voiceId: string }; file?: { relPath: string } }>(
        await fetch(endpoint, { method: "POST", body: form }),
      );
      const relPath = data.audio?.relPath || data.file?.relPath;
      if (relPath) setAudioUrl(`/api/file?rel=${encodeURIComponent(relPath)}`);
      setResult(JSON.stringify(data, null, 2));
      await loadProjectMedia();
      return data;
    });
  }

  async function translateTranscript() {
    await runApi("Translating transcript...", async () => {
      const body = { projectId, transcript: transcript || text, language };
      const data = await jsonOrThrow<{ languageVersion: { translatedText: string } }>(
        await fetch("/api/audio/translate", { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }),
      );
      setResult(data.languageVersion.translatedText);
      return data;
    });
  }

  async function generateLanguageAudio() {
    await runApi("Generating translated audio...", async () => {
      const body = {
        projectId,
        transcript: transcript || text,
        translatedText: result.trim() || undefined,
        language,
        provider,
        voice,
        speed,
      };
      const data = await jsonOrThrow<{ translatedText: string; audio: { relPath: string } }>(
        await fetch("/api/audio/language-audio", { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }),
      );
      setAudioUrl(`/api/file?rel=${encodeURIComponent(data.audio.relPath)}`);
      setResult(data.translatedText);
      await loadProjectMedia();
      return data;
    });
  }

  async function processLanguageSpeech(blob: Blob) {
    await runApi("Transcribing speech and generating translated audio...", async () => {
      const file = new File([blob], `language-speech.${extensionForMime(blob.type || "audio/webm")}`, {
        type: blob.type || "audio/webm",
      });
      const form = new FormData();
      form.set("projectId", projectId);
      if (sourceLanguage !== "auto") form.set("language", sourceLanguage);
      form.set("file", file);

      const transcription = await jsonOrThrow<{ transcript: { text: string } }>(
        await fetch("/api/audio/transcribe/openai", { method: "POST", body: form }),
      );
      const spokenText = transcription.transcript.text.trim();
      if (!spokenText) throw new Error("No speech was detected. Try again closer to the microphone.");
      setText(spokenText);

      const body = { projectId, transcript: spokenText, language, provider, voice, speed };
      const audioData = await jsonOrThrow<{ translatedText: string; audio: { relPath: string } }>(
        await fetch("/api/audio/language-audio", { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }),
      );
      setResult(audioData.translatedText);
      setAudioUrl(`/api/file?rel=${encodeURIComponent(audioData.audio.relPath)}`);
      await loadProjectMedia();
      return audioData;
    });
  }

  async function processTargetLanguageSpeech(blob: Blob) {
    await runApi("Transcribing target language and generating source audio...", async () => {
      const targetLanguage = language === "auto" ? "en" : language;
      const sourceAudioLanguage = sourceLanguage === "auto" ? "en" : sourceLanguage;
      const file = new File([blob], `target-language-speech.${extensionForMime(blob.type || "audio/webm")}`, {
        type: blob.type || "audio/webm",
      });
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("language", targetLanguage);
      form.set("file", file);

      const transcription = await jsonOrThrow<{ transcript: { text: string } }>(
        await fetch("/api/audio/transcribe/openai", { method: "POST", body: form }),
      );
      const targetSpokenText = transcription.transcript.text.trim();
      if (!targetSpokenText) throw new Error("No speech was detected. Try again closer to the microphone.");
      setResult(targetSpokenText);

      const translation = await jsonOrThrow<{ translatedText?: string; languageVersion?: { translatedText: string } }>(
        await fetch("/api/audio/translate", {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({
            projectId,
            transcript: targetSpokenText,
            language: sourceAudioLanguage,
            previewOnly: true,
          }),
        }),
      );
      const sourceText = translation.translatedText ?? translation.languageVersion?.translatedText ?? "";
      setText(sourceText);

      const audioData = await jsonOrThrow<{ translatedText: string; audio: { relPath: string } }>(
        await fetch("/api/audio/language-audio", {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({
            projectId,
            transcript: targetSpokenText,
            translatedText: sourceText,
            language: sourceAudioLanguage,
            provider,
            voice,
            speed,
          }),
        }),
      );
      setSourceLanguageAudioUrl(`/api/file?rel=${encodeURIComponent(audioData.audio.relPath)}`);
      await loadProjectMedia();
      return audioData;
    });
  }

  async function startLanguageSpeechInput() {
    try {
      setApi({ loading: false, message: "", error: "" });
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone recording is not supported in this browser.");
      }
      if (typeof MediaRecorder === "undefined") {
        throw new Error("Browser audio recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = recorderOptionsForFormat("WebM");
      let recorder: MediaRecorder;
      try {
        recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      languageSpeechChunks.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) languageSpeechChunks.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(languageSpeechChunks.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        languageSpeechRecorder.current = null;
        languageSpeechStream.current = null;
        setLanguageSpeechRecording(false);
        if (blob.size > 0) void processLanguageSpeech(blob);
      };
      languageSpeechRecorder.current = recorder;
      languageSpeechStream.current = stream;
      recorder.start(1000);
      setLanguageSpeechRecording(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start microphone";
      setApi({ loading: false, message: "", error: message });
    }
  }

  function stopLanguageSpeechInput() {
    if (languageSpeechRecorder.current && languageSpeechRecorder.current.state !== "inactive") {
      languageSpeechRecorder.current.stop();
    }
  }

  function toggleLanguageSpeechInput() {
    if (languageSpeechRecording) {
      stopLanguageSpeechInput();
      return;
    }
    void startLanguageSpeechInput();
  }

  async function startTargetLanguageSpeechInput() {
    try {
      setApi({ loading: false, message: "", error: "" });
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone recording is not supported in this browser.");
      }
      if (typeof MediaRecorder === "undefined") {
        throw new Error("Browser audio recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = recorderOptionsForFormat("WebM");
      let recorder: MediaRecorder;
      try {
        recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      targetLanguageSpeechChunks.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) targetLanguageSpeechChunks.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(targetLanguageSpeechChunks.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        targetLanguageSpeechRecorder.current = null;
        targetLanguageSpeechStream.current = null;
        setTargetLanguageSpeechRecording(false);
        if (blob.size > 0) void processTargetLanguageSpeech(blob);
      };
      targetLanguageSpeechRecorder.current = recorder;
      targetLanguageSpeechStream.current = stream;
      recorder.start(1000);
      setTargetLanguageSpeechRecording(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start microphone";
      setApi({ loading: false, message: "", error: message });
    }
  }

  function stopTargetLanguageSpeechInput() {
    if (targetLanguageSpeechRecorder.current && targetLanguageSpeechRecorder.current.state !== "inactive") {
      targetLanguageSpeechRecorder.current.stop();
    }
  }

  function toggleTargetLanguageSpeechInput() {
    if (targetLanguageSpeechRecording) {
      stopTargetLanguageSpeechInput();
      return;
    }
    void startTargetLanguageSpeechInput();
  }

  function swapTranslationLanguages() {
    if (sourceLanguage === "auto") return;
    setSourceLanguage(language);
    setLanguage(sourceLanguage);
    setText(result);
    setResult(text);
  }

  async function exportTranscript(format: string) {
    await runApi(`Exporting ${format.toUpperCase()}...`, async () => {
      const body = { projectId, transcript: transcript || result || text, format };
      const data = await jsonOrThrow<{ export: { content: string; filename: string; mimeType: string } }>(
        await fetch("/api/audio/export", { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }),
      );
      downloadText(data.export.filename, data.export.content, data.export.mimeType);
      setResult(data.export.content);
      return data;
    });
  }

  async function convertTranscript(format: string) {
    await runApi(`Converting transcript to ${format}...`, async () => {
      const data = await jsonOrThrow<{ output: string }>(
        await fetch("/api/audio/export", {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({ projectId, transcript: transcript || result || text, format }),
        }),
      );
      setResult(data.output);
      return data;
    });
  }

  function stopMeter() {
    if (meterAnimation.current !== null) {
      cancelAnimationFrame(meterAnimation.current);
      meterAnimation.current = null;
    }
    void audioContext.current?.close().catch(() => undefined);
    audioContext.current = null;
    setRecordingLevel(0);
  }

  function startMeter(stream: MediaStream) {
    stopMeter();
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.35;
    source.connect(analyser);
    audioContext.current = context;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (const value of data) {
        const centred = (value - 128) / 128;
        sumSquares += centred * centred;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      const voiceLevel = Math.max(0, Math.min(1, (rms - 0.008) / 0.14));
      setRecordingLevel((previous) => {
        const smoothing = voiceLevel < previous ? 0.18 : 0.5;
        return (previous * smoothing) + (voiceLevel * (1 - smoothing));
      });
      meterAnimation.current = requestAnimationFrame(tick);
    };
    tick();
  }

  async function startRecording() {
    let stream: MediaStream | null = null;
    try {
      setApi({ loading: false, message: "", error: "" });
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone recording is not supported in this browser.");
      }
      if (typeof MediaRecorder === "undefined") {
        throw new Error("Browser audio recording is not supported in this browser.");
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
      });
      const activeStream = stream;
      const options = recorderOptionsForFormat(recordingFormat);
      let recorder: MediaRecorder;
      try {
        recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      } catch {
        // Some browsers report support for a type but still fail when constructing the recorder.
        recorder = new MediaRecorder(stream);
      }
      chunks.current = [];
      setRecordedBlob(null);
      setAudioUrl("");
      setRecordingSeconds(0);
      setRecordingPaused(false);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" });
        setRecordedMimeType(blob.type || "audio/webm");
        setRecordedBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        activeStream.getTracks().forEach((track) => track.stop());
        recordingStream.current = null;
        stopMeter();
        setDisplayMeterLevel(0);
      };
      mediaRecorder.current = recorder;
      recordingStream.current = stream;
      startMeter(stream);
      recorder.start(3000);
      setRecording(true);
      void navigator.mediaDevices?.enumerateDevices?.()
        .then((devices) => setMicDevices(devices.filter((device) => device.kind === "audioinput")))
        .catch(() => undefined);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      const message = error instanceof Error ? error.message : "Could not start microphone";
      setApi({ loading: false, message: "", error: message });
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
    setRecordingPaused(false);
  }

  function toggleRecording() {
    if (recording) {
      stopRecording();
      return;
    }
    void startRecording();
  }

  function pauseRecording() {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.pause();
      setRecordingPaused(true);
      setRecordingLevel(0);
    }
  }

  function resumeRecording() {
    if (mediaRecorder.current?.state === "paused") {
      mediaRecorder.current.resume();
      setRecordingPaused(false);
    }
  }

  function cancelRecording() {
    chunks.current = [];
    recordingStream.current?.getTracks().forEach((track) => track.stop());
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.onstop = null;
      mediaRecorder.current.stop();
    }
    mediaRecorder.current = null;
    recordingStream.current = null;
    setRecording(false);
    setRecordingPaused(false);
    setRecordingSeconds(0);
    setRecordedBlob(null);
    setAudioUrl("");
    setRecordingLevel(0);
    setDisplayMeterLevel(0);
    stopMeter();
  }

  if (activeTool.id === "voice-creator") {
    return <VoiceCreatorCloneWorkspace />;
  }
  if (activeTool.id === "guests") {
    return <AudioWithGuestsWorkspace />;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="hidden space-y-3 lg:block">
        <Panel title="Audio Studio Tools">
          <AudioToolLinks activeTool={activeTool} onNavigate={() => undefined} />
        </Panel>
        {activeTool.id !== "text-to-speech" && activeTool.id !== "language" ? <ProjectPanel projectId={projectId} setProjectId={setProjectId} /> : null}
      </aside>

      <main className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {activeTool.id === "language" ? (
              <LanguageTranslatePanel
                sourceLanguage={sourceLanguage}
                setSourceLanguage={setSourceLanguage}
                targetLanguage={language}
                setTargetLanguage={setLanguage}
                sourceText={text}
                setSourceText={setText}
                translatedText={result}
                setTranslatedText={setResult}
                provider={provider}
                setProvider={setProvider}
                voice={voice}
                setVoice={setVoice}
                speed={speed}
                setSpeed={setSpeed}
                translateTranscript={translateTranscript}
                generateLanguageAudio={generateLanguageAudio}
                swapTranslationLanguages={swapTranslationLanguages}
                languageSpeechRecording={languageSpeechRecording}
                toggleLanguageSpeechInput={toggleLanguageSpeechInput}
                targetLanguageSpeechRecording={targetLanguageSpeechRecording}
                toggleTargetLanguageSpeechInput={toggleTargetLanguageSpeechInput}
                apiLoading={api.loading}
                apiMessage={api.message}
                apiError={api.error}
                translationPreviewStatus={translationPreviewStatus}
                targetAudioUrl={audioUrl}
                sourceAudioUrl={sourceLanguageAudioUrl}
              />
            ) : null}

            {activeTool.id === "text-to-speech" ? (
              <TtsScriptPanel text={text} setText={setText} generateTts={generateTts} apiLoading={api.loading} apiMessage={api.message} apiError={api.error} />
            ) : null}

            {activeTool.id !== "text-to-speech" && activeTool.id !== "language" ? (
            <Panel title="Main Workspace">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Main Workspace</p>
                  <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                    Record, title and review audio before transcription.
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${recording ? "bg-[#22c55e]/15 text-[#22c55e]" : "bg-red-500/15 text-red-300"}`}>
                  {recording ? "Recording on" : "Mic off"}
                </span>
              </div>
              <RecorderConsole
                activeTab={recorderTab}
                setActiveTab={setRecorderTab}
                recording={recording}
                recordingPaused={recordingPaused}
                recordingSeconds={recordingSeconds}
                displayMeterLevel={displayMeterLevel}
                recordedBlob={recordedBlob}
                recordedMimeType={recordedMimeType}
                projectMedia={projectMedia}
                selectedMediaId={selectedMediaId}
                micDevices={micDevices}
                micDeviceId={micDeviceId}
                setMicDeviceId={setMicDeviceId}
                recordingQuality={recordingQuality}
                setRecordingQuality={setRecordingQuality}
                recordingFormat={recordingFormat}
                setRecordingFormat={setRecordingFormat}
                toggleRecording={toggleRecording}
                pauseRecording={pauseRecording}
                resumeRecording={resumeRecording}
                stopRecording={stopRecording}
                cancelRecording={cancelRecording}
                saveRecording={() => runApi("Saving recording...", () => uploadCurrentAudio("recording"))}
                transcribeAudio={transcribeAudio}
                deleteProjectMedia={deleteProjectMedia}
                setSelectedMediaId={setSelectedMediaId}
                setAudioUrl={setAudioUrl}
                apiLoading={api.loading}
              />

              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                <label className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Title Header</label>
                <input
                  value={audioTitle}
                  onChange={(event) => setAudioTitle(event.target.value)}
                  placeholder="Add a title, or let Plexa create one from the audio when saving..."
                  className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-black/20 px-3 py-2 text-sm"
                />
                <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-[color:var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={autoTitleFromAudio}
                    onChange={(event) => setAutoTitleFromAudio(event.target.checked)}
                    className="mt-1"
                  />
                  <span>Create the title from the audio when saving. If OpenAI is unavailable, Plexa will use this title or the filename.</span>
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-black/20 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">Audio player with waveform</p>
                  <span className="text-xs text-[color:var(--text-muted)]">{uploadedFile?.name || (recordedBlob ? "Browser recording" : "No audio selected")}</span>
                </div>
                {audioUrl ? <audio controls src={audioUrl} className="w-full" /> : <div className="h-12 rounded-xl bg-[linear-gradient(90deg,rgba(234,179,8,.2),rgba(34,197,94,.25),rgba(234,179,8,.12))]" />}
                <LiveWaveform level={recordingLevel} active={recording && !recordingPaused} hasAudio={Boolean(audioUrl || recordedBlob || uploadedFile)} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <R365Button variant="ghost" onClick={() => runApi("Saving upload...", () => uploadCurrentAudio("upload"))} disabled={!uploadedFile || api.loading}>Save to Project</R365Button>
                  <R365Button variant="ghost" onClick={() => runApi("Saving recording...", () => uploadCurrentAudio("recording"))} disabled={!recordingFile || api.loading}>Save Recording</R365Button>
                </div>
              </div>
            </Panel>
            ) : null}

            {activeTool.id !== "text-to-speech" && activeTool.id !== "language" ? (
              <div className="lg:hidden">
                <ProjectPanel projectId={projectId} setProjectId={setProjectId} />
              </div>
            ) : null}

            {activeTool.id === "elevenlabs-editing" ? (
              <Panel title="Voice Generation">
                <ProviderControls provider={provider} setProvider={setProvider} voice={voice} setVoice={setVoice} tone={tone} setTone={setTone} speed={speed} setSpeed={setSpeed} language={language} setLanguage={setLanguage} />
                <textarea value={text} onChange={(event) => setText(event.target.value)} rows={7} placeholder="Paste text, transcript, paragraph edits or pronunciation notes..." className="mt-4 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <R365Button onClick={generateTts} disabled={api.loading}>Generate Audio</R365Button>
                </div>
              </Panel>
            ) : null}

            {activeTool.id !== "text-to-speech" && activeTool.id !== "language" ? (
            <Panel title="Transcript Panel">
              {activeTool.id === "notes" && autoTranscriptStatus ? (
                <p className="mb-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-xs font-semibold text-[color:var(--text-muted)]">
                  {autoTranscriptStatus}
                </p>
              ) : null}
              <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={10} placeholder="Transcript with timestamps and speakers will appear here..." className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm" />
              <div className="mt-3 flex flex-wrap gap-2">
                <R365Button onClick={transcribeAudio} disabled={(!fileForApi && !selectedMediaId) || api.loading}>Transcribe</R365Button>
                <R365Button variant="ghost" onClick={generateNotes} disabled={api.loading || !(transcript || text)}>Generate Notes</R365Button>
              </div>
            </Panel>
            ) : null}

            {activeTool.id === "notes" ? (
              <NotesTranslatePanel
                targetLanguage={notesTranslationLanguage}
                setTargetLanguage={setNotesTranslationLanguage}
                translatedText={translatedNotesTranscript}
                setTranslatedText={setTranslatedNotesTranscript}
                status={notesTranslationStatus}
                sourceText={transcript}
              />
            ) : null}

            <Panel title={activeTool.id === "text-to-speech" ? "Generated Audio" : activeTool.id === "language" ? "Generated Language Audio" : "Project Media"}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs leading-5 text-[color:var(--text-muted)]">
                  {activeTool.id === "text-to-speech"
                    ? "Generated speech is saved here after you create audio."
                    : activeTool.id === "language"
                      ? "Translated voice output is saved here after you generate audio."
                    : "Select the saved audio you want to transcribe, then use Transcribe above."}
                </p>
                <R365Button variant="ghost" onClick={() => void loadProjectMedia()} disabled={api.loading}>Refresh Media</R365Button>
              </div>
              <div className="space-y-2">
                {visibleProjectMedia.length ? visibleProjectMedia.map((item) => (
                  <div key={`${item.kind}-${item.id}`} className={`rounded-xl border p-3 ${selectedMediaId === item.id ? "border-[#eab308] bg-[#eab308]/10" : "border-[color:var(--border)] bg-[color:var(--surface-muted)]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                        <input
                          type="radio"
                          name="audio-transcription-source"
                          checked={selectedMediaId === item.id}
                          onChange={() => {
                            setSelectedMediaId(item.id);
                            setAudioUrl(`/api/file?rel=${encodeURIComponent(item.relPath)}`);
                          }}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-[color:var(--text-primary)]">{item.title || item.originalName || item.name}</span>
                          <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
                            {item.originalName || item.name} · {item.source} · {item.mimeType || "audio"}{item.size ? ` · ${formatBytes(item.size)}` : ""}
                          </span>
                        </span>
                      </label>
                      <R365Button variant="danger" onClick={() => void deleteProjectMedia(item)} disabled={api.loading}>Delete</R365Button>
                    </div>
                    <audio controls src={`/api/file?rel=${encodeURIComponent(item.relPath)}`} className="mt-3 w-full" />
                  </div>
                )) : (
                  <p className="rounded-xl border border-[color:var(--border)] bg-black/20 p-3 text-xs text-[color:var(--text-muted)]">
                    {activeTool.id === "text-to-speech"
                      ? "No generated speech yet. Browser recordings and uploads stay in Audio Notes."
                      : activeTool.id === "language"
                        ? "No translated audio yet. Translate text, then generate audio to save it here."
                      : "No saved audio yet. Use Save to Project for uploads or Save Recording for browser recordings."}
                  </p>
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            {activeTool.id === "text-to-speech" ? (
              <TtsSettingsPanel
                provider={provider}
                setProvider={setProvider}
                voice={voice}
                setVoice={setVoice}
                elevenLabsVoice={elevenLabsVoice}
                setElevenLabsVoice={setElevenLabsVoice}
                elevenLabsVoices={elevenLabsVoices}
                elevenLabsVoicesStatus={elevenLabsVoicesStatus}
                customElevenLabsVoiceId={customElevenLabsVoiceId}
                setCustomElevenLabsVoiceId={setCustomElevenLabsVoiceId}
                elevenLabsModel={elevenLabsModel}
                setElevenLabsModel={setElevenLabsModel}
                outputFormat={outputFormat}
                setOutputFormat={setOutputFormat}
                speed={speed}
                setSpeed={setSpeed}
                stability={stability}
                setStability={setStability}
                similarity={similarity}
                setSimilarity={setSimilarity}
                styleExaggeration={styleExaggeration}
                setStyleExaggeration={setStyleExaggeration}
                speakerBoost={speakerBoost}
                setSpeakerBoost={setSpeakerBoost}
                language={language}
                setLanguage={setLanguage}
                tone={tone}
                setTone={setTone}
                generateTts={generateTts}
                apiLoading={api.loading}
              />
            ) : null}

            {activeTool.id !== "text-to-speech" && activeTool.id !== "language" ? (
            <Panel title="Tool Actions">
              <div className="space-y-3">
                {featureCopy.map((item) => (
                  <p key={item} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-xs leading-5 text-[color:var(--text-secondary)]">{item}</p>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {actionButtons(activeTool.id, {
                  transcribeAudio,
                  generateNotes,
                  generateTts,
                  translateTranscript,
                  generateLanguageAudio,
                  runElevenLabsFileRoute,
                  apiLoading: api.loading,
                })}
              </div>
              {activeTool.id === "voice-changer" ? (
                <textarea value={targetVoiceStyle} onChange={(event) => setTargetVoiceStyle(event.target.value)} rows={4} className="mt-4 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm" />
              ) : null}
            </Panel>
            ) : null}

            {activeTool.id !== "text-to-speech" && activeTool.id !== "language" ? (
            <Panel title="Upload Audio or Video">
              <label className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Choose source file</label>
              <input
                type="file"
                accept={acceptedAudio}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setUploadedFile(file);
                  if (file && !audioTitle.trim()) setAudioTitle(titleFromFileName(file.name));
                }}
                className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm"
              />
              <p className="mt-3 text-xs leading-5 text-[color:var(--text-muted)]">
                Select mp3, wav, m4a or mp4, then use Save to Project in the audio player.
              </p>
            </Panel>
            ) : null}

            {activeTool.id !== "text-to-speech" && activeTool.id !== "language" ? (
            <Panel title="Export">
              <div className="grid grid-cols-2 gap-2">
                {["txt", "docx", "srt", "vtt"].map((format) => (
                  <R365Button key={format} variant="ghost" onClick={() => exportTranscript(format)} disabled={api.loading}>{format.toUpperCase()}</R365Button>
                ))}
              </div>
              <div className="mt-3 grid gap-2">
                {["article", "podcast-script", "captions", "social-posts"].map((format) => (
                  <R365Button key={format} variant="ghost" onClick={() => convertTranscript(format)} disabled={api.loading}>Convert to {format}</R365Button>
                ))}
              </div>
            </Panel>
            ) : null}

            {activeTool.id !== "text-to-speech" && activeTool.id !== "language" ? (
            <Panel title="Notes Panel">
              {api.loading ? <p className="text-sm text-[#eab308]">{api.message}</p> : null}
              {api.error ? <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{api.error}</p> : null}
              <p className="mb-3 text-xs leading-5 text-[color:var(--text-muted)]">
                Use this as a draft notes area. Edit the text, then save it as a note file underneath.
              </p>
              <div className="mb-3 flex flex-wrap gap-2">
                <R365Button onClick={saveNotes} disabled={api.loading || !(result || transcript || text)}>
                  Save Notes
                </R365Button>
              </div>
              <textarea
                value={result}
                onChange={(event) => setResult(event.target.value)}
                rows={12}
                placeholder="Generated notes, transcript exports, translated text and provider responses will appear here. You can edit this before saving."
                className="w-full rounded-xl border border-[color:var(--border)] bg-black/20 p-3 text-xs leading-5 text-[color:var(--text-secondary)]"
              />
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Saved Note Files</p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                      Each saved note is editable here in its own panel.
                    </p>
                  </div>
                  <R365Button variant="ghost" onClick={() => void loadProjectNotes()} disabled={api.loading}>Refresh Notes</R365Button>
                </div>
                {savedNotes.length ? savedNotes.map((note) => (
                  <div key={note.id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Note file</p>
                    <input
                      value={note.title}
                      onChange={(event) => editSavedNote(note.id, { title: event.target.value })}
                      className="w-full rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2 text-sm font-bold text-[color:var(--text-primary)]"
                    />
                    <textarea
                      value={note.content}
                      onChange={(event) => editSavedNote(note.id, { content: event.target.value })}
                      rows={8}
                      className="mt-3 w-full rounded-lg border border-[color:var(--border)] bg-black/20 p-3 text-xs leading-5 text-[color:var(--text-secondary)]"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <R365Button onClick={() => void updateSavedNote(note)} disabled={api.loading}>Save Changes</R365Button>
                      <R365Button variant="danger" onClick={() => void deleteSavedNote(note)} disabled={api.loading}>Delete Note File</R365Button>
                    </div>
                  </div>
                )) : (
                  <p className="rounded-xl border border-[color:var(--border)] bg-black/20 p-3 text-xs text-[color:var(--text-muted)]">
                    No saved notes yet. Edit the Notes Panel and press Save Notes.
                  </p>
                )}
              </div>
            </Panel>
            ) : null}

          </div>
        </div>
      </main>
    </div>
  );
}

function RecorderConsole({
  activeTab,
  setActiveTab,
  recording,
  recordingPaused,
  recordingSeconds,
  displayMeterLevel,
  recordedBlob,
  recordedMimeType,
  projectMedia,
  selectedMediaId,
  micDevices,
  micDeviceId,
  setMicDeviceId,
  recordingQuality,
  setRecordingQuality,
  recordingFormat,
  setRecordingFormat,
  toggleRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  cancelRecording,
  saveRecording,
  transcribeAudio,
  deleteProjectMedia,
  setSelectedMediaId,
  setAudioUrl,
  apiLoading,
}: {
  activeTab: RecorderTab;
  setActiveTab: (value: RecorderTab) => void;
  recording: boolean;
  recordingPaused: boolean;
  recordingSeconds: number;
  displayMeterLevel: number;
  recordedBlob: Blob | null;
  recordedMimeType: string;
  projectMedia: ProjectMediaItem[];
  selectedMediaId: string;
  micDevices: MediaDeviceInfo[];
  micDeviceId: string;
  setMicDeviceId: (value: string) => void;
  recordingQuality: string;
  setRecordingQuality: (value: string) => void;
  recordingFormat: string;
  setRecordingFormat: (value: string) => void;
  toggleRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  saveRecording: () => Promise<unknown>;
  transcribeAudio: () => void;
  deleteProjectMedia: (item: ProjectMediaItem) => Promise<void>;
  setSelectedMediaId: (value: string) => void;
  setAudioUrl: (value: string) => void;
  apiLoading: boolean;
}) {
  const recordingSize = recordedBlob ? formatBytes(recordedBlob.size) : "0 B";

  return (
    <div className="overflow-hidden rounded-2xl border border-black/60 bg-black text-white shadow-2xl">
      <div className="h-1 bg-red-600" />
      <div className="p-4 sm:p-5">
        {activeTab === "recorder" ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="flex justify-center lg:justify-end">
              <RecordActionButton recording={recording} recordingPaused={recordingPaused} onClick={toggleRecording} />
            </div>
            <div className="text-center">
              <RecorderSignalMonitor
                displayLevel={displayMeterLevel}
                recording={recording && !recordingPaused}
              />
              <div className="font-mono text-5xl tracking-tight sm:text-6xl">{formatDuration(recordingSeconds)}</div>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white/55">
                {recording ? (recordingPaused ? "Paused" : "Recording live") : recordedBlob ? `${recordingSize} • ${recordedMimeType || "audio"}` : "Ready to record"}
              </p>
            </div>
            <div className="flex justify-center lg:justify-start">
              <button
                type="button"
                onClick={stopRecording}
                disabled={!recording}
                className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/35 bg-zinc-950 text-red-600 transition enabled:hover:border-white/60 disabled:opacity-40"
                aria-label="Stop recording"
              >
                <span className="h-10 w-10 rounded-md bg-red-700" />
              </button>
            </div>
          </div>
        ) : null}

        {activeTab === "memos" ? (
          <div className="mt-5 space-y-3">
            {projectMedia.length ? projectMedia.slice(0, 5).map((item) => (
              <div key={`${item.kind}-${item.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMediaId(item.id);
                      setAudioUrl(`/api/file?rel=${encodeURIComponent(item.relPath)}`);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-bold">{item.title || item.originalName || item.name}</span>
                    <span className="mt-1 block text-xs text-white/50">
                      {new Date(item.createdAt).toLocaleDateString()} • {item.mimeType || "audio"}{item.size ? ` • ${formatBytes(item.size)}` : ""}
                    </span>
                  </button>
                  <div className="flex gap-2">
                    <R365Button variant="ghost" onClick={transcribeAudio} disabled={apiLoading || selectedMediaId !== item.id}>Transcribe</R365Button>
                    <R365Button variant="danger" onClick={() => void deleteProjectMedia(item)} disabled={apiLoading}>Delete</R365Button>
                  </div>
                </div>
              </div>
            )) : (
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                No saved voice memos yet. Record, stop, then save the recording to project media.
              </p>
            )}
          </div>
        ) : null}

        {activeTab === "settings" ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-wide text-white/55">
              Mic input
              <select value={micDeviceId} onChange={(event) => setMicDeviceId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white">
                <option value="">Default microphone</option>
                {micDevices.map((device, index) => (
                  <option key={device.deviceId || index} value={device.deviceId}>
                    {device.label || `Microphone ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-white/55">
              Quality
              <select value={recordingQuality} onChange={(event) => setRecordingQuality(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white">
                <option>High</option>
                <option>Standard</option>
                <option>Draft</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-white/55">
              Preferred format
              <select value={recordingFormat} onChange={(event) => setRecordingFormat(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white">
                <option>WebM</option>
                <option>M4A</option>
                <option>WAV</option>
              </select>
            </label>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(["recorder", "memos", "settings"] as RecorderTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-3xl px-4 py-3 text-center font-bold transition ${
                activeTab === tab ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10"
              }`}
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]">
                <RecorderTabIcon tab={tab} />
              </span>
              <span className="mt-1 block text-sm capitalize">{tab === "memos" ? "Voice Memos" : tab}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {recording ? (
            recordingPaused ? (
              <R365Button onClick={resumeRecording}>Resume</R365Button>
            ) : (
              <R365Button variant="ghost" onClick={pauseRecording}>Pause</R365Button>
            )
          ) : null}
          <R365Button variant="ghost" onClick={() => void saveRecording()} disabled={!recordedBlob || recording || apiLoading}>Save Recording</R365Button>
          <R365Button variant="ghost" onClick={transcribeAudio} disabled={recording || apiLoading || (!recordedBlob && !selectedMediaId)}>Transcribe</R365Button>
          <R365Button variant="danger" onClick={cancelRecording} disabled={apiLoading || (!recordedBlob && !recording)}>Cancel</R365Button>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-white/45">
          Draft chunks are captured locally every few seconds while recording. Save Recording stores the final audio in the Plexa project using local storage in development and Netlify Blobs on live.
        </p>
      </div>
    </div>
  );
}

function RecorderTabIcon({ tab }: { tab: RecorderTab }) {
  const iconClass = "h-11 w-11";
  if (tab === "recorder") {
    return (
      <svg viewBox="0 0 64 64" className={iconClass} aria-hidden="true">
        <path d="M32 8c-5.5 0-10 4.5-10 10v16c0 5.5 4.5 10 10 10s10-4.5 10-10V18c0-5.5-4.5-10-10-10Z" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M15 31v3c0 9.4 7.6 17 17 17s17-7.6 17-17v-3M32 51v8M24 59h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
      </svg>
    );
  }
  if (tab === "memos") {
    return (
      <svg viewBox="0 0 64 64" className={iconClass} aria-hidden="true">
        <path d="M10 38h9l14 12V14L19 26h-9v12Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="4" />
        <path d="M42 25c3 4 3 10 0 14M49 18c7 8 7 20 0 28" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className={iconClass} aria-hidden="true">
      <path d="M27 8h10l2 7a20 20 0 0 1 5 3l7-3 5 9-5 5a20 20 0 0 1 0 6l5 5-5 9-7-3a20 20 0 0 1-5 3l-2 7H27l-2-7a20 20 0 0 1-5-3l-7 3-5-9 5-5a20 20 0 0 1 0-6l-5-5 5-9 7 3a20 20 0 0 1 5-3l2-7Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="4" />
      <circle cx="32" cy="32" r="8" fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

function RecorderSignalMonitor({ displayLevel, recording }: { displayLevel: number; recording: boolean }) {
  const speaking = recording && displayLevel > 6;
  const status =
    !recording
      ? { label: "Input monitor idle", detail: "Start recording to check level", tone: "text-white/45", clarity: 0 }
      : !speaking
        ? { label: "Silence detected", detail: "Move closer to the mic", tone: "text-white/65", clarity: 20 }
        : displayLevel >= 88
          ? { label: "Clipping warning", detail: "Too loud, lower input", tone: "text-red-400", clarity: 45 }
          : displayLevel >= 70
            ? { label: "Strong signal", detail: "Watch for peaks", tone: "text-yellow-300", clarity: 72 }
            : { label: "Safe voice level", detail: "Clean recording range", tone: "text-green-400", clarity: 92 };

  return (
    <div className="mb-4">
      <AudioMeter level={recording ? displayLevel : 0} className="mx-auto rounded-sm" />
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[0.16em]">
        <span className={status.tone}>{status.label}</span>
        <span className="text-white/25">•</span>
        <span className="text-white/45">{status.detail}</span>
        <span className="text-white/25">•</span>
        <span className="text-white/45">Clarity {status.clarity}%</span>
      </div>
    </div>
  );
}

function LiveWaveform({ level, active, hasAudio }: { level: number; active: boolean; hasAudio: boolean }) {
  const liveLevel = active && level > 0.06 ? Math.min(1, level) : 0;
  return (
    <div className="mt-3 flex h-16 items-end gap-1 overflow-hidden rounded-xl bg-[color:var(--surface-muted)] p-2">
      {Array.from({ length: 48 }).map((_, index) => {
        const shape = 0.35 + (((index * 13) % 17) / 24);
        const pulse = liveLevel ? Math.max(4, 8 + (liveLevel * 54 * shape)) : hasAudio ? 8 + ((index * 7) % 9) : 5;
        const isActive = liveLevel > 0;
        return (
          <span
            key={index}
            className={`flex-1 rounded-full transition-all duration-75 ${isActive ? "bg-[#22c55e]" : hasAudio ? "bg-[#22c55e]/25" : "bg-zinc-800/40"}`}
            style={{
              height: `${Math.min(56, pulse)}px`,
              opacity: isActive ? Math.max(0.35, liveLevel) : 0.55,
            }}
          />
        );
      })}
    </div>
  );
}

function RecordActionButton({ recording, recordingPaused, onClick }: { recording: boolean; recordingPaused: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-red-600 shadow-2xl transition ${
        recording && !recordingPaused ? "shadow-red-500/60 ring-8 ring-red-500/20" : "shadow-red-500/30"
      }`}
      aria-pressed={recording}
      aria-label={recording ? "Stop recording" : "Start recording"}
    >
      {recording && !recordingPaused ? <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" /> : null}
      <span className="relative h-20 w-20 rounded-full bg-red-600" />
    </button>
  );
}

function AudioToolLinks({ activeTool, onNavigate }: { activeTool: AudioStudioTool; onNavigate: () => void }) {
  return (
    <div className="space-y-2">
      {visibleAudioStudioTools.map((tool) => (
        <Link
          key={tool.id}
          href={tool.href}
          onClick={onNavigate}
          className={`block rounded-xl border p-3 text-sm transition ${
            tool.id === activeTool.id
              ? "border-[#eab308] bg-[#eab308]/10 text-[color:var(--text-primary)]"
              : "border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:border-[#22c55e]/60"
          }`}
        >
          <span className="font-bold">{tool.title}</span>
          <span className="mt-1 block text-xs text-[color:var(--text-muted)]">{tool.eyebrow}</span>
        </Link>
      ))}
    </div>
  );
}

function ProjectPanel({ projectId, setProjectId }: { projectId: string; setProjectId: (value: string) => void }) {
  return (
    <Panel title="Project">
      <label className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Project ID</label>
      <input
        value={projectId}
        onChange={(event) => setProjectId(event.target.value)}
        className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm"
      />
      <p className="mt-3 text-xs leading-5 text-[color:var(--text-muted)]">
        Outputs can be routed into Video Studio, Podcast Template, Social Post Creator, Language Studio and Media Library.
      </p>
    </Panel>
  );
}

function LanguageTranslatePanel({
  sourceLanguage,
  setSourceLanguage,
  targetLanguage,
  setTargetLanguage,
  sourceText,
  setSourceText,
  translatedText,
  setTranslatedText,
  provider,
  setProvider,
  voice,
  setVoice,
  speed,
  setSpeed,
  translateTranscript,
  generateLanguageAudio,
  swapTranslationLanguages,
  languageSpeechRecording,
  toggleLanguageSpeechInput,
  targetLanguageSpeechRecording,
  toggleTargetLanguageSpeechInput,
  apiLoading,
  apiMessage,
  apiError,
  translationPreviewStatus,
  targetAudioUrl,
  sourceAudioUrl,
}: {
  sourceLanguage: string;
  setSourceLanguage: (value: string) => void;
  targetLanguage: string;
  setTargetLanguage: (value: string) => void;
  sourceText: string;
  setSourceText: (value: string) => void;
  translatedText: string;
  setTranslatedText: (value: string) => void;
  provider: Provider;
  setProvider: (value: Provider) => void;
  voice: string;
  setVoice: (value: string) => void;
  speed: number;
  setSpeed: (value: number) => void;
  translateTranscript: () => void;
  generateLanguageAudio: () => void;
  swapTranslationLanguages: () => void;
  languageSpeechRecording: boolean;
  toggleLanguageSpeechInput: () => void;
  targetLanguageSpeechRecording: boolean;
  toggleTargetLanguageSpeechInput: () => void;
  apiLoading: boolean;
  apiMessage: string;
  apiError: string;
  translationPreviewStatus: string;
  targetAudioUrl: string;
  sourceAudioUrl: string;
}) {
  const targetLanguageOptions = languageOptions.filter((item) => item.code !== "auto");

  return (
    <Panel title="Translate">
      <div className="rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-sm">
        <div className="grid items-center gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_auto_1fr]">
          <select
            value={sourceLanguage}
            onChange={(event) => setSourceLanguage(event.target.value)}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900"
          >
            {languageOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          <button
            type="button"
            onClick={swapTranslationLanguages}
            disabled={sourceLanguage === "auto" || apiLoading}
            className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-black text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Swap languages"
          >
            ⇄
          </button>
          <select
            value={targetLanguage === "auto" ? "en" : targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900"
          >
            {targetLanguageOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </div>

        <div className="grid md:grid-cols-2">
          <div className="min-h-[360px] border-b border-slate-200 p-5 md:border-b-0 md:border-r">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{languageLabel(sourceLanguage)}</p>
              {sourceText ? (
                <button type="button" onClick={() => setSourceText("")} className="text-sm font-bold text-slate-400 hover:text-slate-700">
                  Clear
                </button>
              ) : null}
            </div>
            <textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              rows={11}
              placeholder="Enter text"
              className="min-h-[260px] w-full resize-none border-0 bg-transparent text-2xl font-semibold leading-snug text-slate-950 outline-none placeholder:text-slate-400"
            />
            {sourceAudioUrl ? (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {languageLabel(sourceLanguage === "auto" ? "en" : sourceLanguage)} audio
                </p>
                <audio controls autoPlay src={sourceAudioUrl} className="w-full" />
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={toggleLanguageSpeechInput}
                disabled={apiLoading}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-lg transition ${
                  languageSpeechRecording
                    ? "border-red-200 bg-red-50 text-red-600 shadow-[0_0_0_6px_rgba(239,68,68,0.12)]"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                } disabled:cursor-not-allowed disabled:opacity-50`}
                aria-label={languageSpeechRecording ? "Stop listening" : "Start voice input"}
              >
                {languageSpeechRecording ? "■" : "🎙"}
              </button>
              <p className="text-xs text-slate-400">
                {languageSpeechRecording ? "Listening... press again to translate and revoice" : `${sourceText.length.toLocaleString()} characters`}
              </p>
            </div>
          </div>

          <div className="min-h-[360px] bg-slate-50 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{languageLabel(targetLanguage === "auto" ? "en" : targetLanguage)}</p>
              {translatedText ? (
                <button type="button" onClick={() => void navigator.clipboard?.writeText(translatedText)} className="text-sm font-bold text-slate-400 hover:text-slate-700">
                  Copy
                </button>
              ) : null}
            </div>
            <textarea
              value={translatedText}
              onChange={(event) => setTranslatedText(event.target.value)}
              rows={11}
              placeholder="Translation"
              className="min-h-[260px] w-full resize-none border-0 bg-transparent text-2xl font-semibold leading-snug text-slate-900 outline-none placeholder:text-slate-400"
            />
            {targetAudioUrl ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {languageLabel(targetLanguage === "auto" ? "en" : targetLanguage)} audio
                </p>
                <audio controls autoPlay src={targetAudioUrl} className="w-full" />
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={toggleTargetLanguageSpeechInput}
                disabled={apiLoading}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-lg transition ${
                  targetLanguageSpeechRecording
                    ? "border-red-200 bg-red-50 text-red-600 shadow-[0_0_0_6px_rgba(239,68,68,0.12)]"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                } disabled:cursor-not-allowed disabled:opacity-50`}
                aria-label={targetLanguageSpeechRecording ? "Stop target language input" : "Start target language input"}
              >
                {targetLanguageSpeechRecording ? "■" : "🎙"}
              </button>
              <p className="text-xs text-slate-400">
                {targetLanguageSpeechRecording
                  ? `Listening in ${languageLabel(targetLanguage === "auto" ? "en" : targetLanguage)}... press again to translate back`
                  : `Speak in ${languageLabel(targetLanguage === "auto" ? "en" : targetLanguage)}`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-200 bg-white p-4 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Audio Provider
              <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} className="mt-2 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm normal-case tracking-normal text-slate-900">
                <option value="openai">OpenAI</option>
                <option value="elevenlabs">ElevenLabs</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Voice
              <input value={voice} onChange={(event) => setVoice(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm normal-case tracking-normal text-slate-900" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Speed {speed.toFixed(2)}x
              <input type="range" min="0.5" max="2" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="mt-4 w-full" />
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-2 lg:justify-end">
            <R365Button onClick={translateTranscript} disabled={apiLoading || !sourceText.trim()}>Translate</R365Button>
            <R365Button variant="ghost" onClick={generateLanguageAudio} disabled={apiLoading || !(sourceText.trim() || translatedText.trim())}>
              Generate {languageLabel(targetLanguage === "auto" ? "en" : targetLanguage)} Audio
            </R365Button>
          </div>
        </div>
      </div>

      {apiLoading ? <p className="mt-3 text-sm font-semibold text-[#eab308]">{apiMessage}</p> : null}
      {!apiLoading && translationPreviewStatus ? <p className="mt-3 text-sm font-semibold text-[color:var(--text-muted)]">{translationPreviewStatus}</p> : null}
      {apiError ? <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{apiError}</p> : null}
    </Panel>
  );
}

function NotesTranslatePanel({
  targetLanguage,
  setTargetLanguage,
  translatedText,
  setTranslatedText,
  status,
  sourceText,
}: {
  targetLanguage: string;
  setTargetLanguage: (value: string) => void;
  translatedText: string;
  setTranslatedText: (value: string) => void;
  status: string;
  sourceText: string;
}) {
  const targetLanguageOptions = languageOptions.filter((item) => item.code !== "auto");

  return (
    <Panel title="Translate">
      <div className="rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-sm">
        <div className="grid items-center gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold leading-[3rem] text-slate-900">
            Auto detect
          </div>
          <div
            className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-black text-slate-400"
            aria-hidden="true"
          >
            ⇄
          </div>
          <select
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900"
          >
            {targetLanguageOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </div>

        <div className="grid md:grid-cols-2">
          <div className="min-h-[300px] border-b border-slate-200 p-5 md:border-b-0 md:border-r">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Auto Detect</p>
              {sourceText ? <p className="text-xs text-slate-400">{sourceText.length.toLocaleString()} characters</p> : null}
            </div>
            <textarea
              value={sourceText}
              readOnly
              rows={9}
              placeholder="Transcript will appear here"
              className="min-h-[220px] w-full resize-none border-0 bg-transparent text-2xl font-semibold leading-snug text-slate-950 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="min-h-[300px] bg-slate-50 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{languageLabel(targetLanguage)}</p>
              {translatedText ? (
                <button type="button" onClick={() => void navigator.clipboard?.writeText(translatedText)} className="text-sm font-bold text-slate-400 hover:text-slate-700">
                  Copy
                </button>
              ) : null}
            </div>
            <textarea
              value={translatedText}
              onChange={(event) => setTranslatedText(event.target.value)}
              rows={9}
              placeholder="Translation"
              className="min-h-[220px] w-full resize-none border-0 bg-transparent text-2xl font-semibold leading-snug text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-3">
          <p className="text-xs font-semibold text-slate-500">
            {status || (sourceText ? "Transcript translation updates automatically." : "Transcribe audio to translate your notes.")}
          </p>
        </div>
      </div>
    </Panel>
  );
}

function TtsScriptPanel({
  text,
  setText,
  generateTts,
  apiLoading,
  apiMessage,
  apiError,
}: {
  text: string;
  setText: (value: string) => void;
  generateTts: () => void;
  apiLoading: boolean;
  apiMessage: string;
  apiError: string;
}) {
  const maxChars = 5000;
  return (
    <Panel title="Text to Speech Script">
      <div className="flex min-h-[420px] flex-col rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={maxChars}
          placeholder="Paste or write the script you want to turn into speech..."
          className="min-h-[320px] flex-1 resize-none rounded-xl border border-transparent bg-transparent p-3 text-base leading-7 text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--border)]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] pt-3">
          <p className="text-xs text-[color:var(--text-muted)]">{text.length.toLocaleString()} / {maxChars.toLocaleString()} characters</p>
          <R365Button onClick={generateTts} disabled={apiLoading || !text.trim()}>
            Generate Speech
          </R365Button>
        </div>
        {apiLoading ? <p className="mt-3 text-xs font-semibold text-[#eab308]">{apiMessage || "Generating speech..."}</p> : null}
        {apiError ? <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{apiError}</p> : null}
      </div>
    </Panel>
  );
}

function renderElevenLabsVoiceOptions(voices: ElevenLabsVoiceOption[]) {
  const grouped = voices.reduce<Record<string, ElevenLabsVoiceOption[]>>((acc, item) => {
    const group = item.groupLabel || item.category || "ElevenLabs voices";
    acc[group] = acc[group] ? [...acc[group], item] : [item];
    return acc;
  }, {});

  return Object.entries(grouped).map(([group, items]) => (
    <optgroup key={group} label={group}>
      {items.map((item) => {
        const accent = item.labels?.accent || item.labels?.description || item.description;
        return (
          <option key={item.voice_id} value={item.voice_id}>
            {item.name}{accent ? ` - ${accent}` : ""}
          </option>
        );
      })}
    </optgroup>
  ));
}

function TtsSettingsPanel({
  provider,
  setProvider,
  voice,
  setVoice,
  elevenLabsVoice,
  setElevenLabsVoice,
  elevenLabsVoices,
  elevenLabsVoicesStatus,
  customElevenLabsVoiceId,
  setCustomElevenLabsVoiceId,
  elevenLabsModel,
  setElevenLabsModel,
  outputFormat,
  setOutputFormat,
  speed,
  setSpeed,
  stability,
  setStability,
  similarity,
  setSimilarity,
  styleExaggeration,
  setStyleExaggeration,
  speakerBoost,
  setSpeakerBoost,
  language,
  setLanguage,
  tone,
  setTone,
  generateTts,
  apiLoading,
}: {
  provider: Provider;
  setProvider: (value: Provider) => void;
  voice: string;
  setVoice: (value: string) => void;
  elevenLabsVoice: string;
  setElevenLabsVoice: (value: string) => void;
  elevenLabsVoices: ElevenLabsVoiceOption[];
  elevenLabsVoicesStatus: string;
  customElevenLabsVoiceId: string;
  setCustomElevenLabsVoiceId: (value: string) => void;
  elevenLabsModel: string;
  setElevenLabsModel: (value: string) => void;
  outputFormat: string;
  setOutputFormat: (value: string) => void;
  speed: number;
  setSpeed: (value: number) => void;
  stability: number;
  setStability: (value: number) => void;
  similarity: number;
  setSimilarity: (value: number) => void;
  styleExaggeration: number;
  setStyleExaggeration: (value: number) => void;
  speakerBoost: boolean;
  setSpeakerBoost: (value: boolean) => void;
  language: string;
  setLanguage: (value: string) => void;
  tone: string;
  setTone: (value: string) => void;
  generateTts: () => void;
  apiLoading: boolean;
}) {
  return (
    <Panel title="Text to Speech Settings">
      <div className="space-y-4">
        <label className="block text-sm font-semibold">
          Provider
          <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
            <option value="elevenlabs">ElevenLabs</option>
            <option value="openai">OpenAI</option>
          </select>
        </label>

        {provider === "elevenlabs" ? (
          <>
            <label className="block text-sm font-semibold">
              Voice
              <select value={elevenLabsVoice} onChange={(event) => setElevenLabsVoice(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
                <option value="admin-default">Admin default voice</option>
                {renderElevenLabsVoiceOptions(elevenLabsVoices)}
                <option value="custom">Custom voice ID</option>
              </select>
              {elevenLabsVoicesStatus ? (
                <span className="mt-2 block text-xs font-medium text-[color:var(--text-muted)]">{elevenLabsVoicesStatus}</span>
              ) : null}
            </label>
            {elevenLabsVoice === "custom" ? (
              <label className="block text-sm font-semibold">
                Custom ElevenLabs voice ID
                <input value={customElevenLabsVoiceId} onChange={(event) => setCustomElevenLabsVoiceId(event.target.value)} placeholder="Paste voice_id from ElevenLabs" className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2" />
              </label>
            ) : null}
            <label className="block text-sm font-semibold">
              Model
              <select value={elevenLabsModel} onChange={(event) => setElevenLabsModel(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
                {elevenLabsModelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <MeterSlider label="Stability" value={stability} setValue={setStability} low="More variable" high="More stable" />
            <MeterSlider label="Similarity" value={similarity} setValue={setSimilarity} low="Low" high="High" />
            <MeterSlider label="Style exaggeration" value={styleExaggeration} setValue={setStyleExaggeration} low="None" high="Exaggerated" />
            <label className="block text-sm font-semibold">
              Output format
              <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
                <option value="mp3_44100_128">MP3 44.1kHz 128kbps</option>
                <option value="mp3_44100_192">MP3 44.1kHz 192kbps</option>
                <option value="pcm_44100">WAV / PCM 44.1kHz</option>
              </select>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm font-semibold">
              Speaker boost
              <input type="checkbox" checked={speakerBoost} onChange={(event) => setSpeakerBoost(event.target.checked)} />
            </label>
          </>
        ) : (
          <label className="block text-sm font-semibold">
            Voice
            <select value={voice} onChange={(event) => setVoice(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
              {openAiVoiceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        )}

        <label className="block text-sm font-semibold">
          Language override
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
            {languageOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Direction / tone
          <textarea value={tone} onChange={(event) => setTone(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm" />
        </label>
        <label className="block text-sm font-semibold">
          Speed {speed.toFixed(2)}x
          <input type="range" min="0.5" max="2" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="mt-3 w-full" />
        </label>
        <R365Button onClick={generateTts} disabled={apiLoading}>
          Generate Speech
        </R365Button>
      </div>
    </Panel>
  );
}

function MeterSlider({ label, value, setValue, low, high }: { label: string; value: number; setValue: (value: number) => void; low: string; high: string }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => setValue(Number(event.target.value))} className="mt-3 w-full" />
      <span className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-[color:var(--text-muted)]">
        <span>{low}</span>
        <span>{high}</span>
      </span>
    </label>
  );
}

function ProviderControls({
  provider,
  setProvider,
  voice,
  setVoice,
  tone,
  setTone,
  speed,
  setSpeed,
  language,
  setLanguage,
}: {
  provider: Provider;
  setProvider: (value: Provider) => void;
  voice: string;
  setVoice: (value: string) => void;
  tone: string;
  setTone: (value: string) => void;
  speed: number;
  setSpeed: (value: number) => void;
  language: string;
  setLanguage: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <label className="text-sm font-semibold">
        Provider
        <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
          <option value="openai">OpenAI</option>
          <option value="elevenlabs">ElevenLabs</option>
        </select>
      </label>
      <label className="text-sm font-semibold">
        Voice
        <input value={voice} onChange={(event) => setVoice(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2" />
      </label>
      <label className="text-sm font-semibold">
        Language
        <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2">
          {languageOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold md:col-span-2">
        Tone / emotion
        <input value={tone} onChange={(event) => setTone(event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2" />
      </label>
      <label className="text-sm font-semibold">
        Speed {speed.toFixed(2)}x
        <input type="range" min="0.5" max="2" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="mt-3 w-full" />
      </label>
    </div>
  );
}

function actionButtons(
  toolId: AudioStudioToolId,
  actions: {
    transcribeAudio: () => void;
    generateNotes: () => void;
    generateTts: () => void;
    translateTranscript: () => void;
    generateLanguageAudio: () => void;
    runElevenLabsFileRoute: (endpoint: string, label: string) => void;
    apiLoading: boolean;
  },
) {
  const disabled = actions.apiLoading;
  if (toolId === "voice-changer") return <R365Button onClick={() => actions.runElevenLabsFileRoute("/api/audio/voice-changer/elevenlabs", "Changing voice with ElevenLabs...")} disabled={disabled}>Change Voice</R365Button>;
  if (toolId === "voice-creator") return <R365Button onClick={() => actions.runElevenLabsFileRoute("/api/audio/voice-creator/elevenlabs", "Creating ElevenLabs voice...")} disabled={disabled}>Create Voice</R365Button>;
  if (toolId === "voice-isolator") return <R365Button onClick={() => actions.runElevenLabsFileRoute("/api/audio/voice-isolator/elevenlabs", "Isolating voice...")} disabled={disabled}>Isolate Voice</R365Button>;
  if (toolId === "elevenlabs-recording") return <R365Button onClick={() => actions.runElevenLabsFileRoute("/api/audio/voice-creator/elevenlabs", "Sending recording to ElevenLabs...")} disabled={disabled}>Send Recording to Voice Creator</R365Button>;
  if (toolId === "elevenlabs-editing") return <R365Button onClick={actions.generateTts} disabled={disabled}>Regenerate Selected Segment</R365Button>;
  if (toolId === "language") return <><R365Button onClick={actions.translateTranscript} disabled={disabled}>Translate Transcript</R365Button><R365Button variant="ghost" onClick={actions.generateLanguageAudio} disabled={disabled}>Generate Language Audio</R365Button></>;
  if (toolId === "text-to-speech") return <R365Button onClick={actions.generateTts} disabled={disabled}>Generate Speech</R365Button>;
  return <><R365Button onClick={actions.transcribeAudio} disabled={disabled}>Transcribe</R365Button><R365Button variant="ghost" onClick={actions.generateNotes} disabled={disabled}>Generate Audio Notes</R365Button></>;
}

function copyForTool(toolId: AudioStudioToolId): string[] {
  const common = [
    "Audio stays inside the Audio Studio project and provider calls run from secure API routes.",
    "API keys are resolved server-side from environment/admin settings and are never exposed in the browser.",
  ];
  const byTool: Record<AudioStudioToolId, string[]> = {
    notes: ["Upload mp3, wav, m4a or mp4, or record directly in browser.", "Creates summary, clean notes, key points, actions, quotes, headlines and social post ideas."],
    "text-to-speech": ["Provider selector supports OpenAI for quick generation and ElevenLabs for premium voice.", "Generated audio is saved to the Audio Studio project media area."],
    "voice-changer": ["Upload a source file and describe the target voice style.", "Saves both original and changed voice versions where the ElevenLabs API returns audio."],
    "voice-creator": ["Record or upload clean voice samples and confirm permission before creating a voice.", "Returned ElevenLabs voice_id is stored in the reusable Voice Library."],
    guests: ["Use long-form uploads for guest shows and interviews.", "Speaker labels can be edited in the transcript before notes, quotes and clips are produced."],
    language: ["Translate original transcript while preserving the source transcript.", "Generate new language audio through OpenAI or ElevenLabs TTS."],
    "voice-isolator": ["Upload noisy audio and receive a cleaned voice track.", "Use before/after playback to compare the result."],
    "elevenlabs-recording": ["Record clean voice samples in the browser.", "Save to media library or send to ElevenLabs voice creation after permission confirmation."],
    "elevenlabs-editing": ["Edit paragraphs, pauses, speed, emotion and pronunciation notes.", "Regenerate the selected segment and save replacement audio where possible."],
  };
  return [...byTool[toolId], ...common];
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  }
  return data as T;
}

function formatSegments(segments: Array<{ start?: number; end?: number; text: string }>, fallback: string): string {
  if (!segments.length) return fallback;
  return segments.map((segment) => `[${formatTime(segment.start)} - ${formatTime(segment.end)}] ${segment.text}`).join("\n");
}

function languageLabel(code: string): string {
  return languageOptions.find((item) => item.code === code)?.label ?? code.toUpperCase();
}

function formatTime(value?: number): string {
  if (!Number.isFinite(value)) return "00:00";
  const total = Math.max(0, Math.floor(value ?? 0));
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatNote(note: Record<string, unknown>): string {
  return Object.entries(note)
    .map(([key, value]) => `${key}\n${Array.isArray(value) ? value.map((item) => `- ${item}`).join("\n") : String(value)}`)
    .join("\n\n");
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function projectMediaUrlForTool(toolId: AudioStudioToolId, projectId: string): string {
  const params = new URLSearchParams({ projectId });
  if (toolId === "text-to-speech") {
    params.set("kind", "generated");
    params.set("sourceTool", "text-to-speech");
  }
  if (toolId === "language") {
    params.set("kind", "generated");
    params.set("sourceTool", "language");
  }
  return `/api/audio/files?${params.toString()}`;
}

function filterProjectMediaForTool(toolId: AudioStudioToolId, media: ProjectMediaItem[]): ProjectMediaItem[] {
  if (toolId === "text-to-speech") return media.filter((item) => item.kind === "generated");
  return media;
}

async function fileFromProjectMedia(item: ProjectMediaItem): Promise<File> {
  const res = await fetch(`/api/file?rel=${encodeURIComponent(item.relPath)}`);
  if (!res.ok) throw new Error(`Could not load saved audio ${item.originalName || item.name}`);
  const blob = await res.blob();
  return new File([blob], item.originalName || item.name, {
    type: item.mimeType || blob.type || "application/octet-stream",
  });
}

function titleFromFileName(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Audio recording";
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, seconds);
  const hours = Math.floor(total / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((total % 3600) / 60).toString().padStart(2, "0");
  const secs = Math.floor(total % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}

function calibrateAudioMeterLevel(rawLevel: number): number {
  if (!Number.isFinite(rawLevel) || rawLevel < 0.025) return 0;
  if (rawLevel < 0.7) return Math.round(6 + (rawLevel / 0.7) * 58);
  if (rawLevel < 0.92) return Math.round(64 + ((rawLevel - 0.7) / 0.22) * 18);
  return Math.round(84 + Math.min(1, (rawLevel - 0.92) / 0.08) * 16);
}

function recorderOptionsForFormat(format: string): MediaRecorderOptions | undefined {
  const preferred =
    format === "WAV"
      ? "audio/wav"
      : format === "M4A"
        ? "audio/mp4"
        : "audio/webm;codecs=opus";
  if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(preferred)) {
    return { mimeType: preferred };
  }
  if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return { mimeType: "audio/webm;codecs=opus" };
  }
  return undefined;
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

const jsonHeaders = { "Content-Type": "application/json" };
