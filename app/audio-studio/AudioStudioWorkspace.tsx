"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { AudioMeter } from "./AudioMeter";
import { audioStudioTools, type AudioStudioTool, type AudioStudioToolId } from "./audio-studio-config";

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

export function AudioStudioWorkspace({ activeTool }: { activeTool: AudioStudioTool }) {
  const [projectId, setProjectId] = useState("default-audio-project");
  const [provider, setProvider] = useState<Provider>(activeTool.providers.includes("ElevenLabs") ? "elevenlabs" : "openai");
  const [language, setLanguage] = useState("auto");
  const [voice, setVoice] = useState("nova");
  const [tone, setTone] = useState("Natural, confident and editorial");
  const [speed, setSpeed] = useState(1);
  const [text, setText] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const [autoTitleFromAudio, setAutoTitleFromAudio] = useState(true);
  const [targetVoiceStyle, setTargetVoiceStyle] = useState("Clear sports presenter voice with warm authority");
  const [transcript, setTranscript] = useState("");
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
  const [toolsOpen, setToolsOpen] = useState(false);
  const [api, setApi] = useState<ApiState>({ loading: false, message: "", error: "" });
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingStream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const meterAnimation = useRef<number | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  const featureCopy = useMemo(() => copyForTool(activeTool.id), [activeTool.id]);
  const recordingFile = recordedBlob ? new File([recordedBlob], `browser-recording.${extensionForMime(recordedMimeType)}`, { type: recordedMimeType }) : null;
  const fileForApi = recordingFile ?? uploadedFile;

  const loadProjectMedia = useCallback(async () => {
    const id = projectId.trim();
    if (!id) {
      setProjectMedia([]);
      return;
    }
    const data = await jsonOrThrow<{ files: ProjectMediaItem[] }>(
      await fetch(`/api/audio/files?projectId=${encodeURIComponent(id)}`),
    );
    setProjectMedia(data.files);
    setSelectedMediaId((current) =>
      current && data.files.some((item) => item.id === current) ? current : data.files[0]?.id ?? "",
    );
  }, [projectId]);

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
    void loadProjectNotes();
  }, [loadProjectMedia, loadProjectNotes]);

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
      const body = { projectId, text: text || transcript, voice, tone, speed, language, provider };
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
      const body = { projectId, transcript: transcript || text, language, provider, voice, speed };
      const data = await jsonOrThrow<{ translatedText: string; audio: { relPath: string } }>(
        await fetch("/api/audio/language-audio", { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }),
      );
      setAudioUrl(`/api/file?rel=${encodeURIComponent(data.audio.relPath)}`);
      setResult(data.translatedText);
      await loadProjectMedia();
      return data;
    });
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
      });
      const options = recorderOptionsForFormat(recordingFormat);
      const recorder = new MediaRecorder(stream, options);
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
        stream.getTracks().forEach((track) => track.stop());
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

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="hidden space-y-3 lg:block">
        <Panel title="Audio Studio Tools">
          <AudioToolLinks activeTool={activeTool} onNavigate={() => undefined} />
        </Panel>
        <ProjectPanel projectId={projectId} setProjectId={setProjectId} />
      </aside>

      <main className="space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-[#24301f] bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.16),transparent_30%),#070b12] px-6 py-8 shadow-2xl md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">{activeTool.eyebrow}</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">{activeTool.title}</h1>
            </div>
            <button
              type="button"
              onClick={() => setToolsOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 lg:hidden"
              aria-expanded={toolsOpen}
            >
              <span className="flex h-4 w-4 flex-col justify-center gap-1" aria-hidden="true">
                <span className="block h-0.5 rounded-full bg-white" />
                <span className="block h-0.5 rounded-full bg-white" />
                <span className="block h-0.5 rounded-full bg-white" />
              </span>
              Audio Studio Tools
            </button>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">{activeTool.description}</p>
          {toolsOpen ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-3 lg:hidden">
              <AudioToolLinks activeTool={activeTool} onNavigate={() => setToolsOpen(false)} />
            </div>
          ) : null}
        </section>

        <div className="lg:hidden">
          <ProjectPanel projectId={projectId} setProjectId={setProjectId} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
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

            {activeTool.id === "text-to-speech" || activeTool.id === "language" || activeTool.id === "elevenlabs-editing" ? (
              <Panel title="Voice Generation">
                <ProviderControls provider={provider} setProvider={setProvider} voice={voice} setVoice={setVoice} tone={tone} setTone={setTone} speed={speed} setSpeed={setSpeed} language={language} setLanguage={setLanguage} />
                <textarea value={text} onChange={(event) => setText(event.target.value)} rows={7} placeholder="Paste text, transcript, paragraph edits or pronunciation notes..." className="mt-4 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <R365Button onClick={activeTool.id === "language" ? generateLanguageAudio : generateTts} disabled={api.loading}>Generate Audio</R365Button>
                  {activeTool.id === "language" ? <R365Button variant="ghost" onClick={translateTranscript} disabled={api.loading}>Translate Only</R365Button> : null}
                </div>
              </Panel>
            ) : null}

            <Panel title="Transcript Panel">
              <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={10} placeholder="Transcript with timestamps and speakers will appear here..." className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm" />
              <div className="mt-3 flex flex-wrap gap-2">
                <R365Button onClick={transcribeAudio} disabled={(!fileForApi && !selectedMediaId) || api.loading}>Transcribe</R365Button>
                <R365Button variant="ghost" onClick={generateNotes} disabled={api.loading || !(transcript || text)}>Generate Notes</R365Button>
              </div>
            </Panel>

            <Panel title="Project Media">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs leading-5 text-[color:var(--text-muted)]">
                  Select the saved audio you want to transcribe, then use Transcribe above.
                </p>
                <R365Button variant="ghost" onClick={() => void loadProjectMedia()} disabled={api.loading}>Refresh Media</R365Button>
              </div>
              <div className="space-y-2">
                {projectMedia.length ? projectMedia.map((item) => (
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
                    No saved audio yet. Use Save to Project for uploads or Save Recording for browser recordings.
                  </p>
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
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
              {activeTool.id === "voice-changer" || activeTool.id === "voice-creator" ? (
                <textarea value={targetVoiceStyle} onChange={(event) => setTargetVoiceStyle(event.target.value)} rows={4} className="mt-4 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm" />
              ) : null}
              {activeTool.id === "voice-creator" ? (
                <p className="mt-3 rounded-xl border border-[#eab308]/40 bg-[#eab308]/10 p-3 text-xs leading-5 text-[color:var(--text-secondary)]">
                  Permission warning: only clone or create a voice where the speaker has clearly consented and you have the right to store and reuse the sample.
                </p>
              ) : null}
            </Panel>

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
      {audioStudioTools.map((tool) => (
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
    transcribe: ["Shows transcript text with timestamps where OpenAI returns segment timing.", "Export TXT, DOCX, SRT and VTT, or convert into article, podcast script, captions and social posts."],
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
