"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseApiJson } from "@/app/lib/parse-api-json";
import { FrameSelector } from "@/features/editing-studio/components/media/FrameSelector";
import { VideoEditPreview } from "@/features/editing-studio/components/media/VideoEditPreview";
import { VideoSettingsPanel } from "@/features/editing-studio/components/media/VideoSettingsPanel";
import { VideoTrimModal } from "@/features/editing-studio/components/media/VideoTrimModal";
import { mergeVideoEditSettings, getVideoEditSettings } from "@/features/editing-studio/lib/asset-video-meta";
import { postFrameExtractStub, postVideoTrimStub } from "@/features/editing-studio/lib/editing-video-api";
import { newEditingStudioId } from "@/features/editing-studio/lib/new-id";
import type { EditingAsset, EditingProject } from "@/features/editing-studio/types/domain";
import type { VideoEditSettingsV1 } from "@/features/editing-studio/types/video-edit";
import { editingAssetVideoSrc } from "@/features/editing-studio/utils/editing-asset-video-src";

type Props = {
  projectId: string;
  draft: EditingProject;
  setDraft: React.Dispatch<React.SetStateAction<EditingProject>>;
};

function nowIso(): string {
  return new Date().toISOString();
}

type LibraryVideoItem = { relPath: string; label: string };

function subtitlesAvailable(asset: EditingAsset, project: EditingProject): boolean {
  const m = asset.meta as { subtitleRelPath?: string } | undefined;
  if (m?.subtitleRelPath?.trim()) return true;
  const im = project.integrationMeta;
  if (im && typeof im === "object") {
    const subs = (im as { subtitles?: unknown }).subtitles;
    if (subs !== undefined && subs !== null) return true;
  }
  return false;
}

export function EditingStudioMediaVideoSection({ projectId, draft, setDraft }: Props) {
  const videoAssets = useMemo(
    () => draft.assets.filter((a) => a.kind === "video" && (a.relPath?.trim() || a.url?.trim())),
    [draft.assets],
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => videoAssets[0]?.id ?? null);

  useEffect(() => {
    if (videoAssets.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !videoAssets.some((a) => a.id === selectedId)) {
      setSelectedId(videoAssets[0].id);
    }
  }, [videoAssets, selectedId]);

  const selected = useMemo(
    () => videoAssets.find((a) => a.id === selectedId) ?? videoAssets[0],
    [videoAssets, selectedId],
  );

  const selectedSrc = selected ? editingAssetVideoSrc(selected) : null;
  const videoSettings = selected ? getVideoEditSettings(selected) : null;

  const [durationSec, setDurationSec] = useState(0);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [videoLibraryOpen, setVideoLibraryOpen] = useState(false);
  const [videoLibraryItems, setVideoLibraryItems] = useState<LibraryVideoItem[]>([]);
  const [videoLibraryState, setVideoLibraryState] = useState<"idle" | "loading" | "error">("idle");
  const [trimOpen, setTrimOpen] = useState(false);
  const [proc, setProc] = useState<"idle" | "trim" | "frame" | "error">("idle");
  const [procHint, setProcHint] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  const patchAsset = useCallback(
    (assetId: string, fn: (a: EditingAsset) => EditingAsset) => {
      const ts = nowIso();
      setDraft((p) => ({
        ...p,
        assets: p.assets.map((a) => (a.id === assetId ? fn(a) : a)),
        updatedAt: ts,
      }));
    },
    [setDraft],
  );

  const applyVideoPatch = (patch: Partial<VideoEditSettingsV1>) => {
    if (!selected) return;
    const ts = nowIso();
    patchAsset(selected.id, (a) => mergeVideoEditSettings(a, patch, ts));
  };

  const onUploadVideo = async (file: File, mode: "add" | "replace") => {
    setUploadState("uploading");
    setUploadMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/editing-studio/projects/${encodeURIComponent(projectId)}/assets/upload-video`, {
        method: "POST",
        body: fd,
      });
      const data = await parseApiJson<{ asset?: EditingAsset; error?: string }>(res);
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
      }
      if (!data.asset) {
        throw new Error("Invalid upload response");
      }
      const ts = nowIso();
      if (mode === "add") {
        setDraft((p) => ({
          ...p,
          assets: [...p.assets, data.asset!],
          updatedAt: ts,
        }));
        setSelectedId(data.asset!.id);
      } else if (selected) {
        const newRel = data.asset!.relPath!;
        patchAsset(selected.id, (a) => ({
          ...a,
          relPath: newRel,
          url: undefined,
          mimeType: data.asset!.mimeType,
          byteSize: data.asset!.byteSize,
          label: a.label,
          updatedAt: ts,
          meta: {
            ...(a.meta as Record<string, unknown>),
            originalRelPath: (a.meta as { originalRelPath?: string })?.originalRelPath ?? a.relPath,
            replacedAt: ts,
          },
        }));
      }
      setDurationSec(0);
      setUploadMessage(null);
      setUploadState("idle");
    } catch (e) {
      setUploadState("error");
      setUploadMessage(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const loadVideoLibrary = async () => {
    setLibraryError(null);
    setVideoLibraryState("loading");
    try {
      const res = await fetch("/api/editing-studio/library/videos");
      const data = await parseApiJson<{ items?: LibraryVideoItem[]; error?: string }>(res);
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load renders");
      }
      setVideoLibraryItems(data.items ?? []);
      setVideoLibraryState("idle");
    } catch (e) {
      setVideoLibraryState("error");
      setLibraryError(e instanceof Error ? e.message : "Library error");
    }
  };

  const addVideoFromLibrary = (item: LibraryVideoItem) => {
    const ts = nowIso();
    const asset: EditingAsset = {
      id: newEditingStudioId("ast"),
      kind: "video",
      label: item.label,
      relPath: item.relPath,
      createdAt: ts,
      updatedAt: ts,
      meta: { fromLibrary: true, libraryRelPath: item.relPath },
    };
    setDraft((p) => ({
      ...p,
      assets: [...p.assets, asset],
      updatedAt: ts,
    }));
    setSelectedId(asset.id);
    setVideoLibraryOpen(false);
    setDurationSec(0);
  };

  const runTrimStub = async () => {
    if (!selected?.relPath) return;
    const vs = getVideoEditSettings(selected);
    setProc("trim");
    setProcHint(null);
    try {
      const data = await postVideoTrimStub({
        relPath: selected.relPath,
        assetId: selected.id,
        trimStartSec: vs.trimStartSec,
        trimEndSec: vs.trimEndSec,
      });
      setProc("idle");
      setProcHint(data.message ?? (data.stub ? "Trim request recorded (stub)." : null));
    } catch (e) {
      setProc("error");
      setProcHint(e instanceof Error ? e.message : "Trim request failed");
    }
  };

  const runFrameStub = async () => {
    if (!selected?.relPath) return;
    const vs = getVideoEditSettings(selected);
    setProc("frame");
    setProcHint(null);
    try {
      const data = await postFrameExtractStub({
        relPath: selected.relPath,
        assetId: selected.id,
        timeSec: vs.coverFrameSec,
      });
      setProc("idle");
      setProcHint(data.message ?? (data.stub ? "Frame request recorded (stub)." : null));
    } catch (e) {
      setProc("error");
      setProcHint(e instanceof Error ? e.message : "Frame request failed");
    }
  };

  const subOn = selected ? subtitlesAvailable(selected, draft) : false;

  return (
    <section className="border-t pt-8" style={{ borderColor: "var(--border)" }}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[color:var(--text-primary)]">Video</h3>
        <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
          Single-asset prep: trim, cover frame, layout, and overlays. Settings are stored on the asset; transcoding is a
          future pipeline step.
        </p>
      </div>

      {procHint ? (
        <p className="mb-3 rounded-lg border border-amber-500/35 bg-amber-500/[0.07] px-3 py-2 text-sm text-amber-900 dark:text-amber-100" role="status">
          {procHint}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onUploadVideo(f, "add");
          }}
        />
        <button
          type="button"
          disabled={uploadState === "uploading"}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          {uploadState === "uploading" ? "Uploading…" : "Upload video"}
        </button>

        <button
          type="button"
          onClick={() => {
            setVideoLibraryOpen((o) => !o);
            if (!videoLibraryOpen) void loadVideoLibrary();
          }}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
          style={{ borderColor: "var(--border)" }}
        >
          {videoLibraryOpen ? "Hide renders" : "Existing render / library"}
        </button>

        <input
          ref={replaceRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f && selected) void onUploadVideo(f, "replace");
          }}
        />
        <button
          type="button"
          disabled={!selected || uploadState === "uploading"}
          onClick={() => replaceRef.current?.click()}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
          style={{ borderColor: "var(--border)" }}
        >
          Replace video
        </button>
      </div>

      {uploadState === "error" && uploadMessage ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {uploadMessage}
        </p>
      ) : null}

      {videoLibraryOpen ? (
        <div className="mt-4 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Video library</p>
          {videoLibraryState === "loading" ? (
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Loading…</p>
          ) : videoLibraryState === "error" ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {libraryError ?? "Could not load library."}
            </p>
          ) : videoLibraryItems.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              No videos under <code className="text-xs">{"output/video"}</code>. Export or add mp4 files there to pick a render.
            </p>
          ) : (
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
              {videoLibraryItems.map((item) => (
                <li key={item.relPath}>
                  <button
                    type="button"
                    onClick={() => addVideoFromLibrary(item)}
                    className="w-full truncate rounded-lg border px-2 py-2 text-left hover:bg-[var(--surface-hover)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {videoAssets.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--text-muted)]">No video asset yet — upload or attach a render from the library.</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,220px)_1fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">Videos</p>
            <ul className="mt-2 space-y-1">
              {videoAssets.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm ${
                      selected?.id === a.id
                        ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10"
                        : "border-transparent hover:bg-[var(--surface-hover)]"
                    }`}
                    style={{ borderColor: selected?.id === a.id ? undefined : "var(--border)" }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] text-zinc-300">
                      VID
                    </span>
                    <span className="min-w-0 truncate">{a.label || "Video"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selected && selectedSrc && videoSettings ? (
            <div className="min-w-0 space-y-4">
              <video
                src={selectedSrc}
                className="hidden"
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 0) setDurationSec(d);
                }}
              />

              <VideoEditPreview
                src={selectedSrc}
                settings={videoSettings}
                headline={draft.publicHeadline?.trim() || draft.title}
                className="max-w-lg"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTrimOpen(true)}
                  className="rounded-lg bg-[color:var(--accent)] px-3 py-2 text-sm font-semibold text-[color:var(--accent-foreground)]"
                >
                  Trim in / out…
                </button>
                <button
                  type="button"
                  disabled={proc === "trim"}
                  onClick={() => void runTrimStub()}
                  className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                  style={{ borderColor: "var(--border)" }}
                >
                  {proc === "trim" ? "Sending…" : "Queue trim (stub API)"}
                </button>
                <button
                  type="button"
                  disabled={proc === "frame"}
                  onClick={() => void runFrameStub()}
                  className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                  style={{ borderColor: "var(--border)" }}
                >
                  {proc === "frame" ? "Sending…" : "Queue cover frame (stub API)"}
                </button>
              </div>

              <FrameSelector
                src={selectedSrc}
                durationSec={durationSec || 1}
                coverFrameSec={videoSettings.coverFrameSec}
                onCoverChange={(sec) => applyVideoPatch({ coverFrameSec: sec })}
              />

              <VideoSettingsPanel
                settings={videoSettings}
                onChange={(patch) => applyVideoPatch(patch)}
                subtitlesAvailable={subOn}
              />

              <p className="text-xs text-[color:var(--text-muted)]">
                Source file:{" "}
                <code className="text-[10px]">{(selected.meta as { originalRelPath?: string })?.originalRelPath ?? selected.relPath}</code>
              </p>
            </div>
          ) : null}
        </div>
      )}

      {trimOpen && selected && selectedSrc && videoSettings ? (
        <VideoTrimModal
          key={selected.id}
          src={selectedSrc}
          initialTrimStart={videoSettings.trimStartSec}
          initialTrimEnd={videoSettings.trimEndSec}
          onClose={() => setTrimOpen(false)}
          onSave={(start, end) => {
            const ts = nowIso();
            patchAsset(selected.id, (a) => mergeVideoEditSettings(a, { trimStartSec: start, trimEndSec: end }, ts));
            setTrimOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
