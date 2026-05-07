"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { parseApiJson } from "@/app/lib/parse-api-json";
import {
  PODCAST_DEFAULT_GENERATION_SETTINGS,
  PODCAST_DEFAULT_VOICE_SETTINGS,
} from "@/lib/podcast-template/constants";
import type {
  ElevenLabsVoiceOption,
  PodcastProject,
  PodcastScriptSegment,
  PodcastSpeaker,
} from "@/types/podcast-template";

type ImportPreview = {
  sourceUrl: string;
  title: string;
  importedText: string;
};

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptySpeaker(): PodcastSpeaker {
  return {
    id: newId("speaker"),
    name: "HOST",
    role: "Host",
    voiceId: "",
    voiceSettings: { ...PODCAST_DEFAULT_VOICE_SETTINGS },
  };
}

const ROLE_TO_DEFAULT_VOICE_NAME: Record<string, string> = {
  host: "Barrie Jarrett Pro",
  "co-host": "Planet Rugby",
  guest: "Planetf1",
};

function defaultSpeakers(): PodcastSpeaker[] {
  return [
    {
      id: newId("speaker"),
      name: "HOST",
      role: "Host",
      voiceId: "",
      voiceSettings: { ...PODCAST_DEFAULT_VOICE_SETTINGS },
    },
    {
      id: newId("speaker"),
      name: "CO-HOST",
      role: "Co-Host",
      voiceId: "",
      voiceSettings: { ...PODCAST_DEFAULT_VOICE_SETTINGS },
    },
    {
      id: newId("speaker"),
      name: "GUEST",
      role: "Guest",
      voiceId: "",
      voiceSettings: { ...PODCAST_DEFAULT_VOICE_SETTINGS },
    },
  ];
}

export function PodcastTemplateApp() {
  const [project, setProject] = useState<PodcastProject | null>(null);
  const [projects, setProjects] = useState<PodcastProject[]>([]);
  const [voices, setVoices] = useState<ElevenLabsVoiceOption[]>([]);
  const [musicLibrary, setMusicLibrary] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [voiceSearch, setVoiceSearch] = useState("");
  const [previewAction, setPreviewAction] = useState<null | "save" | "generate">(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playerVolume, setPlayerVolume] = useState(1);

  const filteredVoices = useMemo(() => {
    const q = voiceSearch.trim().toLowerCase();
    if (!q) return voices;
    return voices.filter((v) => {
      const hay = `${v.name} ${v.description ?? ""} ${Object.values(v.labels ?? {}).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [voiceSearch, voices]);

  async function refreshProjects() {
    const res = await fetch("/api/podcast-template/projects", { cache: "no-store" });
    const data = await parseApiJson<{ projects?: PodcastProject[]; error?: string }>(res);
    if (!res.ok) throw new Error(data.error || "Failed to load projects");
    setProjects(Array.isArray(data.projects) ? data.projects : []);
  }

  async function refreshVoices() {
    const res = await fetch("/api/podcast-template/voices", { cache: "no-store" });
    const data = await parseApiJson<{ voices?: ElevenLabsVoiceOption[]; error?: string }>(res);
    if (!res.ok) throw new Error(data.error || "Failed to load voices");
    setVoices(Array.isArray(data.voices) ? data.voices : []);
  }

  async function refreshMusicLibrary() {
    const res = await fetch("/api/podcast-template/music-library", { cache: "no-store" });
    const data = await parseApiJson<{ music?: string[]; error?: string }>(res);
    if (!res.ok) throw new Error(data.error || "Failed to load music");
    setMusicLibrary(Array.isArray(data.music) ? data.music : []);
  }

  async function createProject() {
    setBusy("create");
    setError(null);
    try {
      const res = await fetch("/api/podcast-template/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled podcast project",
          sourceType: "url",
          speakers: defaultSpeakers(),
          settings: PODCAST_DEFAULT_GENERATION_SETTINGS,
        }),
      });
      const data = await parseApiJson<{ project?: PodcastProject; error?: string }>(res);
      if (!res.ok || !data.project) throw new Error(data.error || "Create failed");
      setProject(data.project);
      await refreshProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveProject(next?: PodcastProject) {
    const p = next ?? project;
    if (!p) return;
    setBusy("save");
    setError(null);
    try {
      const res = await fetch(`/api/podcast-template/projects/${encodeURIComponent(p.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const data = await parseApiJson<{ project?: PodcastProject; error?: string }>(res);
      if (!res.ok || !data.project) throw new Error(data.error || "Save failed");
      setProject(data.project);
      await refreshProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function parseScript() {
    if (!project) return;
    setBusy("parse");
    setError(null);
    try {
      const res = await fetch("/api/podcast-template/parse-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: project.rawScript,
          speakers: project.speakers,
        }),
      });
      const data = await parseApiJson<{ segments?: PodcastScriptSegment[]; speakers?: PodcastSpeaker[]; error?: string }>(
        res,
      );
      if (!res.ok) throw new Error(data.error || "Parse failed");
      const next: PodcastProject = {
        ...project,
        segments: data.segments ?? [],
        speakers: data.speakers ?? project.speakers,
      };
      await saveProject(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setBusy(null);
    }
  }

  async function importFromUrl() {
    if (!project?.sourceUrl?.trim()) {
      setError("Enter a URL first.");
      return;
    }
    setBusy("import");
    setError(null);
    try {
      const res = await fetch("/api/podcast-template/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: project.sourceUrl }),
      });
      const data = await parseApiJson<ImportPreview & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportPreview({ sourceUrl: data.sourceUrl, title: data.title, importedText: data.importedText });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  async function convertImportedTextWithOpenAi() {
    if (!project) return;
    if (!project.importedText.trim()) {
      setError("Import or paste article text first.");
      return;
    }
    if (!project.scriptConversionPrompt.trim()) {
      setError("Add a conversion prompt first.");
      return;
    }
    setBusy("convert");
    setError(null);
    try {
      const res = await fetch("/api/podcast-template/convert-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: project.importedSummary ?? project.title,
          importedText: project.importedText,
          prompt: project.scriptConversionPrompt,
          speakers: project.speakers.map((sp) => ({
            name: sp.name,
            role: sp.role,
          })),
        }),
      });
      const data = await parseApiJson<{ script?: string; error?: string }>(res);
      if (!res.ok || !data.script) throw new Error(data.error || "OpenAI conversion failed");
      const next = { ...project, rawScript: data.script };
      await saveProject(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OpenAI conversion failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateAudio() {
    if (!project) return;
    setBusy("generate");
    setError(null);
    try {
      const res = await fetch("/api/podcast-template/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await parseApiJson<{ project?: PodcastProject; error?: string }>(res);
      if (!res.ok || !data.project) throw new Error(data.error || "Generate failed");
      setProject(data.project);
      await refreshProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(null);
    }
  }

  function openDraftPreviewFor(action: "save" | "generate") {
    setError(null);
    if (!project) return;
    setPreviewAction(action);
  }

  async function exportAudio() {
    if (!project) return;
    setBusy("export");
    setError(null);
    try {
      const res = await fetch("/api/podcast-template/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await parseApiJson<{ downloadRel?: string; filename?: string; error?: string }>(res);
      if (!res.ok || !data.downloadRel) throw new Error(data.error || "Export failed");
      const href = `/api/file?rel=${encodeURIComponent(data.downloadRel)}&download=1`;
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  function formatClock(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${String(rem).padStart(2, "0")}`;
  }

  function listenToPodcast() {
    if (!project?.outputAudioRel) {
      setError("Generate podcast audio first, then you can listen.");
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = playerVolume;
    audio.playbackRate = playbackRate;
    if (audio.paused) {
      void audio.play().catch(() => setError("Could not start playback in this browser."));
    } else {
      audio.pause();
    }
  }

  function seekAudio(next: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.min(Math.max(0, next), durationSec || 0);
    audio.currentTime = clamped;
    setCurrentSec(clamped);
  }

  function onPlayerRateChange(nextRate: number) {
    setPlaybackRate(nextRate);
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = nextRate;
  }

  function onPlayerVolumeChange(nextVol: number) {
    const v = Math.min(1, Math.max(0, nextVol));
    setPlayerVolume(v);
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = v;
  }

  async function uploadMusic(kind: "intro" | "outro", file: File) {
    if (!project) return;
    const form = new FormData();
    form.append("projectId", project.id);
    form.append("music", file);
    setBusy(kind === "intro" ? "introMusic" : "outroMusic");
    setError(null);
    try {
      const res = await fetch("/api/podcast-template/music-upload", { method: "POST", body: form });
      const data = await parseApiJson<{ musicRel?: string; error?: string }>(res);
      if (!res.ok || !data.musicRel) throw new Error(data.error || "Music upload failed");
      const next = {
        ...project,
        introMusicRel: kind === "intro" ? data.musicRel : project.introMusicRel,
        outroMusicRel: kind === "outro" ? data.musicRel : project.outroMusicRel,
      };
      await saveProject(next);
      await refreshMusicLibrary();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Music upload failed");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([refreshProjects(), refreshVoices(), refreshMusicLibrary()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load initial data");
      }
    })();
  }, []);

  useEffect(() => {
    if (!project || !voices.length) return;
    let changed = false;
    const nextSpeakers = project.speakers.map((sp) => {
      if ((sp.voiceId ?? "").trim()) return sp;
      const preferredName =
        ROLE_TO_DEFAULT_VOICE_NAME[String(sp.role).toLowerCase()] ??
        ROLE_TO_DEFAULT_VOICE_NAME[String(sp.name).trim().toLowerCase()];
      if (!preferredName) return sp;
      const matched = voices.find((v) => v.name.trim().toLowerCase() === preferredName.toLowerCase());
      if (!matched) return sp;
      changed = true;
      return { ...sp, voiceId: matched.voiceId };
    });
    if (changed) {
      setProject({ ...project, speakers: nextSpeakers });
    }
  }, [project, voices]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-[color:var(--text-primary)]">Podcast Template</h1>
          <p className="mt-2 max-w-3xl text-sm text-[color:var(--text-secondary)]">
            Isolated feature route for multi-speaker ElevenLabs podcast generation. Existing templates and editor
            flows are untouched.
          </p>
        </div>
        <div className="flex gap-2">
          <R365Button onClick={() => void createProject()} disabled={Boolean(busy)}>
            {busy === "create" ? "Creating..." : "New podcast project"}
          </R365Button>
          <R365Button
            variant="ghost"
            onClick={() => openDraftPreviewFor("save")}
            disabled={!project || Boolean(busy)}
          >
            {busy === "save" ? "Saving..." : "Save project"}
          </R365Button>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-[color:var(--danger)]">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr_340px]">
        <Panel title="Project Setup">
          {!project ? (
            <p className="text-sm text-[color:var(--text-secondary)]">Create a podcast project to begin.</p>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Project title
                <input
                  className="mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  style={{ borderColor: "var(--border)" }}
                  value={project.title}
                  onChange={(e) => setProject({ ...project, title: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Source type
                <select
                  className="mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  style={{ borderColor: "var(--border)" }}
                  value={project.sourceType}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      sourceType: e.target.value === "url" ? "url" : "paste",
                    })
                  }
                >
                  <option value="paste">Paste Script</option>
                  <option value="url">Import URL</option>
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Source URL
                <input
                  className="mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  style={{ borderColor: "var(--border)" }}
                  value={project.sourceUrl ?? ""}
                  placeholder="https://example.com/article"
                  onChange={(e) => setProject({ ...project, sourceUrl: e.target.value })}
                />
              </label>
              <R365Button onClick={() => void importFromUrl()} disabled={busy === "import"}>
                {busy === "import" ? "Importing..." : "Step 1: Import URL"}
              </R365Button>
              {importPreview ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-xs text-[color:var(--text-secondary)]">
                  <p className="font-semibold text-[color:var(--text-primary)]">{importPreview.title}</p>
                  <p className="mt-1 line-clamp-3">{importPreview.importedText}</p>
                  <div className="mt-2 flex gap-2">
                    <R365Button
                      variant="ghost"
                      onClick={() =>
                        setProject({
                          ...project,
                          importedText: importPreview.importedText,
                          importedSummary: importPreview.title,
                        })
                      }
                    >
                      Apply imported text
                    </R365Button>
                  </div>
                </div>
              ) : null}
              <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Import editor (full article text)
                <textarea
                  className="mt-1 min-h-[180px] w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-xs text-[color:var(--text-primary)]"
                  style={{ borderColor: "var(--border)" }}
                  value={project.importedText}
                  onChange={(e) => setProject({ ...project, importedText: e.target.value })}
                  placeholder="Imported article text appears here. You can edit it before OpenAI conversion."
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Editable script prompt (OpenAI)
                <textarea
                  className="mt-1 min-h-[140px] w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-xs text-[color:var(--text-primary)]"
                  style={{ borderColor: "var(--border)" }}
                  value={project.scriptConversionPrompt}
                  onChange={(e) => setProject({ ...project, scriptConversionPrompt: e.target.value })}
                />
              </label>
              <div className="flex gap-2">
                <R365Button
                  variant="ghost"
                  onClick={() => void saveProject()}
                  disabled={busy === "save"}
                >
                  {busy === "save" ? "Saving..." : "Save prompt"}
                </R365Button>
                <R365Button
                  onClick={() => void convertImportedTextWithOpenAi()}
                  disabled={busy === "convert"}
                >
                  {busy === "convert" ? "Converting..." : "Step 2: Create script with OpenAI"}
                </R365Button>
              </div>
              <div className="border-t border-[var(--border)] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                  Speaker list
                </p>
                <div className="mt-2 space-y-2">
                  {project.speakers.map((sp) => (
                    <div key={sp.id} className="rounded-lg border border-[var(--border)] p-2">
                      <input
                        className="w-full rounded border bg-[var(--surface)] px-2 py-1 text-xs"
                        style={{ borderColor: "var(--border)" }}
                        value={sp.name}
                        onChange={(e) =>
                          setProject({
                            ...project,
                            speakers: project.speakers.map((x) =>
                              x.id === sp.id ? { ...x, name: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <select
                        className="mt-2 w-full rounded border bg-[var(--surface)] px-2 py-1 text-xs"
                        style={{ borderColor: "var(--border)" }}
                        value={sp.role}
                        onChange={(e) =>
                          setProject({
                            ...project,
                            speakers: project.speakers.map((x) =>
                              x.id === sp.id ? { ...x, role: e.target.value as PodcastSpeaker["role"] } : x,
                            ),
                          })
                        }
                      >
                        <option>Host</option>
                        <option>Co-Host</option>
                        <option>Guest</option>
                        <option>Narrator</option>
                        <option>Custom</option>
                      </select>
                      <button
                        type="button"
                        className="mt-2 text-xs text-[color:var(--danger)]"
                        onClick={() =>
                          setProject({
                            ...project,
                            speakers: project.speakers.filter((x) => x.id !== sp.id),
                          })
                        }
                      >
                        Remove speaker
                      </button>
                    </div>
                  ))}
                  <R365Button
                    variant="ghost"
                    onClick={() => setProject({ ...project, speakers: [...project.speakers, emptySpeaker()] })}
                  >
                    Add speaker
                  </R365Button>
                </div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Script Editor + Segments">
          {!project ? null : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Script (Format A/B/C)
                <textarea
                  className="mt-1 min-h-[260px] w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  style={{ borderColor: "var(--border)" }}
                  value={project.rawScript}
                  onChange={(e) => setProject({ ...project, rawScript: e.target.value })}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <R365Button onClick={() => void parseScript()} disabled={busy === "parse"}>
                  {busy === "parse" ? "Parsing..." : "Split into speakers"}
                </R365Button>
                <R365Button variant="ghost" onClick={() => void saveProject()} disabled={Boolean(busy)}>
                  Save
                </R365Button>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                  Structured segments
                </p>
                <div className="mt-2 max-h-[360px] space-y-2 overflow-auto">
                  {project.segments.map((seg) => (
                    <div key={seg.id} className="rounded border border-[var(--border)] bg-[var(--surface)] p-2 text-sm">
                      <p className="text-xs font-semibold text-[#eab308]">{seg.speakerLabel}</p>
                      <p className="mt-1 whitespace-pre-wrap text-[color:var(--text-primary)]">{seg.text}</p>
                    </div>
                  ))}
                  {!project.segments.length ? (
                    <p className="text-sm text-[color:var(--text-secondary)]">No segments parsed yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Voice, Generate, Preview, Export">
          {!project ? null : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Search voices
                <input
                  className="mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                  value={voiceSearch}
                  onChange={(e) => setVoiceSearch(e.target.value)}
                />
              </label>
              <div className="max-h-52 space-y-2 overflow-auto rounded-lg border border-[var(--border)] p-2">
                {project.speakers.map((sp) => (
                  <div key={sp.id} className="rounded border border-[var(--border)] p-2">
                    <p className="text-xs font-semibold text-[#eab308]">{sp.name}</p>
                    <select
                      className="mt-1 w-full rounded border bg-[var(--surface)] px-2 py-1 text-xs"
                      style={{ borderColor: "var(--border)" }}
                      value={sp.voiceId}
                      onChange={(e) =>
                        setProject({
                          ...project,
                          speakers: project.speakers.map((x) =>
                            x.id === sp.id ? { ...x, voiceId: e.target.value } : x,
                          ),
                        })
                      }
                    >
                      <option value="">Select voice</option>
                      {filteredVoices.map((v) => (
                        <option key={v.voiceId} value={v.voiceId}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-[var(--border)] p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                  Generation settings
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <label className="space-y-1">
                    <span>Model</span>
                    <input
                      className="w-full rounded border bg-[var(--surface)] px-2 py-1"
                      style={{ borderColor: "var(--border)" }}
                      value={project.settings.modelId}
                      onChange={(e) =>
                        setProject({
                          ...project,
                          settings: { ...project.settings, modelId: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Output format</span>
                    <input
                      className="w-full rounded border bg-[var(--surface)] px-2 py-1"
                      style={{ borderColor: "var(--border)" }}
                      value={project.settings.outputFormat}
                      onChange={(e) =>
                        setProject({
                          ...project,
                          settings: { ...project.settings, outputFormat: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <span>Pause ms</span>
                    <input
                      type="number"
                      className="w-full rounded border bg-[var(--surface)] px-2 py-1"
                      style={{ borderColor: "var(--border)" }}
                      value={project.settings.pauseMsBetweenLines}
                      onChange={(e) =>
                        setProject({
                          ...project,
                          settings: { ...project.settings, pauseMsBetweenLines: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      checked={project.settings.useDialogueApi}
                      onChange={(e) =>
                        setProject({
                          ...project,
                          settings: { ...project.settings, useDialogueApi: e.target.checked },
                        })
                      }
                    />
                    <span>Prefer dialogue API</span>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] p-2 text-xs">
                <p className="font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">Chapters</p>
                <div className="mt-2 space-y-1">
                  {project.chapters.map((ch) => (
                    <div key={ch.id} className="flex items-center gap-2">
                      <input
                        className="flex-1 rounded border bg-[var(--surface)] px-2 py-1"
                        style={{ borderColor: "var(--border)" }}
                        value={ch.title}
                        onChange={(e) =>
                          setProject({
                            ...project,
                            chapters: project.chapters.map((x) =>
                              x.id === ch.id ? { ...x, title: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="text-[color:var(--danger)]"
                        onClick={() =>
                          setProject({ ...project, chapters: project.chapters.filter((x) => x.id !== ch.id) })
                        }
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <R365Button
                    variant="ghost"
                    onClick={() =>
                      setProject({
                        ...project,
                        chapters: [...project.chapters, { id: newId("chapter"), title: "New chapter" }],
                      })
                    }
                  >
                    Add chapter
                  </R365Button>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] p-2 text-xs">
                <p className="font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">Music</p>
                <div className="mt-2 space-y-2">
                  <label className="block">
                    Intro music
                    <select
                      className="mt-1 w-full rounded border bg-[var(--surface)] px-2 py-1"
                      style={{ borderColor: "var(--border)" }}
                      value={project.introMusicRel ?? ""}
                      onChange={(e) => setProject({ ...project, introMusicRel: e.target.value || undefined })}
                    >
                      <option value="">None</option>
                      {musicLibrary.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    Outro music
                    <select
                      className="mt-1 w-full rounded border bg-[var(--surface)] px-2 py-1"
                      style={{ borderColor: "var(--border)" }}
                      value={project.outroMusicRel ?? ""}
                      onChange={(e) => setProject({ ...project, outroMusicRel: e.target.value || undefined })}
                    >
                      <option value="">None</option>
                      {musicLibrary.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    Upload music
                    <input
                      type="file"
                      accept=".mp3,.wav,.m4a,.aac,audio/*"
                      className="mt-1 w-full rounded border bg-[var(--surface)] px-2 py-1"
                      style={{ borderColor: "var(--border)" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.currentTarget.value = "";
                        if (!file) return;
                        void uploadMusic("intro", file);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <R365Button onClick={() => openDraftPreviewFor("generate")} disabled={busy === "generate"}>
                  {busy === "generate" ? "Generating..." : "Generate podcast audio"}
                </R365Button>
                <R365Button variant="ghost" onClick={listenToPodcast} disabled={!project.outputAudioRel}>
                  Listen to Podcast
                </R365Button>
                <R365Button variant="ghost" onClick={() => void exportAudio()} disabled={busy === "export"}>
                  {busy === "export" ? "Exporting..." : "Export audio"}
                </R365Button>
              </div>

              {project.outputAudioRel ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                  <audio
                    ref={audioRef}
                    className="hidden"
                    src={`/api/file?rel=${encodeURIComponent(project.outputAudioRel)}`}
                    onLoadedMetadata={(e) => {
                      const d = Number(e.currentTarget.duration || 0);
                      setDurationSec(Number.isFinite(d) ? d : 0);
                    }}
                    onTimeUpdate={(e) => setCurrentSec(e.currentTarget.currentTime || 0)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={listenToPodcast}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-sm font-bold text-[color:var(--text-primary)]"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? "II" : "▶"}
                    </button>
                    <div className="min-w-[70px] text-xs font-semibold text-[color:var(--text-secondary)]">
                      {formatClock(currentSec)} / {formatClock(durationSec)}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(durationSec, 0.1)}
                      step={0.01}
                      value={Math.min(currentSec, durationSec || 0)}
                      onChange={(e) => seekAudio(Number(e.target.value))}
                      className="flex-1"
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <label className="space-y-1">
                      <span className="font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                        Speed
                      </span>
                      <select
                        className="w-full rounded border bg-[var(--surface)] px-2 py-1"
                        style={{ borderColor: "var(--border)" }}
                        value={String(playbackRate)}
                        onChange={(e) => onPlayerRateChange(Number(e.target.value) || 1)}
                      >
                        <option value="0.75">0.75x</option>
                        <option value="1">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                        Volume
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={playerVolume}
                        onChange={(e) => onPlayerVolumeChange(Number(e.target.value))}
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border border-[var(--border)] p-2 text-xs">
                <p className="font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                  Generation history
                </p>
                <ul className="mt-2 space-y-1">
                  {project.generationHistory.map((h) => (
                    <li key={h.id} className="rounded border border-[var(--border)] p-2">
                      <p className="font-semibold text-[color:var(--text-primary)]">
                        {h.status.toUpperCase()} · {h.mode}
                      </p>
                      <p className="text-[color:var(--text-secondary)]">{new Date(h.createdAt).toLocaleString()}</p>
                      <p>{h.message}</p>
                    </li>
                  ))}
                  {!project.generationHistory.length ? (
                    <li className="text-[color:var(--text-secondary)]">No generation history yet.</li>
                  ) : null}
                </ul>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Saved Projects">
        <div className="grid gap-2 md:grid-cols-2">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              className="rounded-lg border border-[var(--border)] p-3 text-left transition hover:bg-[var(--surface-hover)]"
              onClick={() => setProject(p)}
            >
              <p className="font-semibold text-[color:var(--text-primary)]">{p.title}</p>
              <p className="text-xs text-[color:var(--text-secondary)]">
                {p.id} · updated {new Date(p.updatedAt).toLocaleString()}
              </p>
            </button>
          ))}
          {!projects.length ? <p className="text-sm text-[color:var(--text-secondary)]">No podcast projects yet.</p> : null}
        </div>
      </Panel>

      {project && previewAction ? (
        <div
          className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px] transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="podcast-draft-preview-title"
          onClick={() => setPreviewAction(null)}
        >
          <div
            className="ui-modal relative z-10 w-full max-w-3xl p-5"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2
              id="podcast-draft-preview-title"
              className="text-lg font-semibold text-[color:var(--text-primary)]"
            >
              Podcast Draft Preview
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Review this podcast draft before{" "}
              {previewAction === "save" ? "saving project metadata" : "generating audio"}.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                <p className="font-semibold text-[color:var(--text-primary)]">{project.title}</p>
                <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                  Source type: {project.sourceType === "url" ? "Import URL" : "Paste Script"}
                </p>
                {project.sourceUrl ? (
                  <p className="mt-1 text-xs break-all text-[color:var(--text-secondary)]">{project.sourceUrl}</p>
                ) : null}
                <p className="mt-2 text-xs text-[color:var(--text-secondary)]">
                  Speakers: {project.speakers.length} · Segments: {project.segments.length} · Chapters:{" "}
                  {project.chapters.length}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                  Intro music: {project.introMusicRel ? "Yes" : "No"} · Outro music:{" "}
                  {project.outroMusicRel ? "Yes" : "No"}
                </p>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                  Speaker Voice Mapping
                </p>
                <ul className="mt-2 space-y-1 text-xs text-[color:var(--text-secondary)]">
                  {project.speakers.map((sp) => (
                    <li key={sp.id}>
                      <span className="font-semibold text-[color:var(--text-primary)]">{sp.name}</span>:{" "}
                      {sp.voiceId ? sp.voiceId : "No voice selected"}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Script Preview
              </p>
              <pre className="mt-2 max-h-[280px] overflow-auto whitespace-pre-wrap text-xs text-[color:var(--text-primary)]">
                {project.rawScript.trim() || "No script content yet."}
              </pre>
            </div>

            {project.outputAudioRel ? (
              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                  Latest Audio Preview
                </p>
                <audio
                  controls
                  className="mt-2 w-full"
                  src={`/api/file?rel=${encodeURIComponent(project.outputAudioRel)}`}
                />
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <R365Button
                onClick={() => {
                  const action = previewAction;
                  setPreviewAction(null);
                  if (action === "save") {
                    void saveProject();
                  } else {
                    void generateAudio();
                  }
                }}
                disabled={Boolean(busy)}
              >
                {previewAction === "save" ? "Confirm and Save" : "Confirm and Generate"}
              </R365Button>
              <R365Button
                variant="ghost"
                onClick={listenToPodcast}
                disabled={!project.outputAudioRel || Boolean(busy)}
              >
                Listen to Podcast
              </R365Button>
              <R365Button variant="ghost" onClick={() => setPreviewAction(null)} disabled={Boolean(busy)}>
                Back to editing
              </R365Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
