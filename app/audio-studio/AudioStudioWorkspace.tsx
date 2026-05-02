"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { audioStudioTools, type AudioStudioTool, type AudioStudioToolId } from "./audio-studio-config";

type Provider = "openai" | "elevenlabs";

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
  const [api, setApi] = useState<ApiState>({ loading: false, message: "", error: "" });
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  const featureCopy = useMemo(() => copyForTool(activeTool.id), [activeTool.id]);
  const recordingFile = recordedBlob ? new File([recordedBlob], "browser-recording.webm", { type: "audio/webm" }) : null;
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

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunks.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" });
      setRecordedBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((track) => track.stop());
    };
    mediaRecorder.current = recorder;
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <Panel title="Audio Studio Tools">
          <div className="space-y-2">
            {audioStudioTools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
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
        </Panel>
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
      </aside>

      <main className="space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-[#24301f] bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.16),transparent_30%),#070b12] px-6 py-8 shadow-2xl md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">{activeTool.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">{activeTool.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">{activeTool.description}</p>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Panel title="Main Workspace">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Upload audio or video</label>
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
                </div>
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Browser recording</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <R365Button onClick={startRecording} disabled={recording}>Start Recording</R365Button>
                    <R365Button variant="ghost" onClick={stopRecording} disabled={!recording}>Stop</R365Button>
                  </div>
                </div>
              </div>

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
                <div className="mt-3 grid h-16 grid-cols-24 items-end gap-1 overflow-hidden rounded-xl bg-[color:var(--surface-muted)] p-2">
                  {Array.from({ length: 48 }).map((_, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-[#22c55e]/70"
                      style={{ height: `${18 + ((index * 17) % 44)}px` }}
                    />
                  ))}
                </div>
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

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

const jsonHeaders = { "Content-Type": "application/json" };
