"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContentFormat, GeneratedContent } from "@/types";
import type { RunwayBackgroundPromptResult, RunwayBgBrand } from "@/app/lib/runway-background-prompt-types";
import { deriveRunwaySceneHint, runwayBrandFromFormat } from "@/app/lib/runway-editor-context";
import { firstRunwayTaskOutputUrl } from "@/app/lib/runway-task-output";
import { R365Button } from "@/app/components/R365Button";

const input =
  "w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-2 py-1.5 text-xs text-white placeholder:text-slate-600";

type TaskJson = {
  status?: string;
  failure?: string;
  progress?: number;
  error?: string;
  output?: unknown;
};

export function EditorBackgroundVideoPanel({
  contentId,
  content,
  format,
  onVideoSaved,
  onSaveBackdrop,
}: {
  contentId: string;
  content: GeneratedContent | null;
  format: ContentFormat;
  onVideoSaved: (rels: { backgroundVideoRel: string; backgroundVideoFrameRel: string }) => void;
  /** Persist backdrop path into template (browser draft or disk for tpl-). */
  onSaveBackdrop: () => void | Promise<void>;
}) {
  const brand = useMemo(() => runwayBrandFromFormat(format), [format]);
  const [scene, setScene] = useState("");
  const [mood, setMood] = useState("energetic");
  const [durationSec, setDurationSec] = useState(8);
  const [promptText, setPromptText] = useState("");
  const [aiPackage, setAiPackage] = useState<RunwayBackgroundPromptResult | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskJson, setTaskJson] = useState<TaskJson | null>(null);
  const [runwayBusy, setRunwayBusy] = useState(false);
  const [runwayError, setRunwayError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [pendingTemplateSave, setPendingTemplateSave] = useState(false);
  const [saveBackdropBusy, setSaveBackdropBusy] = useState(false);
  const [previewVideoError, setPreviewVideoError] = useState(false);

  const runwayPreviewUrl = useMemo(() => {
    if (!taskJson || taskJson.status !== "SUCCEEDED") return null;
    return firstRunwayTaskOutputUrl(taskJson as Record<string, unknown>);
  }, [taskJson]);

  useEffect(() => {
    setPreviewVideoError(false);
  }, [runwayPreviewUrl]);

  useEffect(() => {
    if (!content) return;
    setScene((s) => (s.trim() ? s : deriveRunwaySceneHint(content)));
  }, [content]);

  const fillFromTemplate = useCallback(() => {
    if (!content) return;
    setScene(deriveRunwaySceneHint(content));
  }, [content]);

  const buildAiPrompt = async () => {
    if (!content) return;
    setAiBusy(true);
    setAiError(null);
    setAiPackage(null);
    try {
      const res = await fetch("/api/ai/runway-background-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brand as RunwayBgBrand,
          scene: scene.trim() || deriveRunwaySceneHint(content),
          mood: mood.trim() || "energetic",
        }),
      });
      const data = (await res.json()) as RunwayBackgroundPromptResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "Prompt build failed");
      setAiPackage(data);
      setPromptText(data.runway_prompt);
      const d = Math.round(data.settings.duration);
      if (d >= 2 && d <= 10) setDurationSec(d);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAiBusy(false);
    }
  };

  const startRunwayVideo = async () => {
    const pt = promptText.trim();
    if (!pt) {
      setRunwayError("Add a prompt or run Build AI prompt first.");
      return;
    }
    setRunwayBusy(true);
    setRunwayError(null);
    setTaskId(null);
    setTaskJson(null);
    setPreviewVideoError(false);
    try {
      const res = await fetch("/api/runway/text-to-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: pt,
          duration: durationSec,
          model: "gen4.5",
        }),
      });
      const data = (await res.json()) as { taskId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Runway rejected the request");
      if (!data.taskId) throw new Error("No task id");
      setTaskId(data.taskId);
    } catch (e) {
      setRunwayError(e instanceof Error ? e.message : "Runway start failed");
    } finally {
      setRunwayBusy(false);
    }
  };

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/runway/tasks/${encodeURIComponent(taskId)}`);
        const data = (await res.json()) as TaskJson & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setTaskJson({ status: "FAILED", failure: data.error || `HTTP ${res.status}` });
          window.clearInterval(timer);
          return;
        }
        setTaskJson(data);
        const s = data.status;
        if (s === "SUCCEEDED" || s === "FAILED" || s === "CANCELLED") {
          window.clearInterval(timer);
        }
      } catch {
        if (!cancelled) {
          setTaskJson({ status: "FAILED", failure: "Poll failed" });
          window.clearInterval(timer);
        }
      }
    };

    void poll();
    const timer = window.setInterval(poll, 5000) as number;
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [taskId]);

  const importToEditor = async () => {
    if (!taskId || taskJson?.status !== "SUCCEEDED") return;
    setImportBusy(true);
    setRunwayError(null);
    try {
      const res = await fetch("/api/runway/import-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, taskId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        backgroundVideoRel?: string;
        backgroundVideoFrameRel?: string;
        error?: string;
        status?: string;
      };
      if (res.status === 409) {
        setRunwayError(data.error || "Still processing…");
        return;
      }
      if (!res.ok || !data.backgroundVideoRel || !data.backgroundVideoFrameRel) {
        throw new Error(data.error || "Import failed");
      }
      onVideoSaved({
        backgroundVideoRel: data.backgroundVideoRel,
        backgroundVideoFrameRel: data.backgroundVideoFrameRel,
      });
      setPendingTemplateSave(true);
    } catch (e) {
      setRunwayError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Build a loopable 9:16 backdrop with{" "}
        <strong className="text-slate-300">Runway Gen-4.5</strong> (text → video). Uses your{" "}
        <code className="text-slate-500">RUNWAYML_API_SECRET</code> from{" "}
        <a
          href="https://dev.runwayml.com/organization/eb9f601c-2259-4a7a-adc5-ef88f1d7771e/api-keys"
          target="_blank"
          rel="noreferrer noopener"
          className="text-[#22c55e] hover:underline"
        >
          API keys (this org)
        </a>{" "}
        ·{" "}
        <a href="https://dev.runwayml.com/" target="_blank" rel="noreferrer noopener" className="text-[#22c55e] hover:underline">
          dev portal
        </a>
        . OpenAI refines the prompt from template + brand; then Runway renders the clip. For still backdrops, use{" "}
        <strong className="text-slate-400">Background (before render)</strong> to upload an image or open Runway in the
        browser.
      </p>
      <p className="text-[10px] text-slate-600">
        Brand for this format: <strong className="text-slate-400">{brand}</strong> (from template type). Edit scene /
        mood if needed.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[10px] font-semibold uppercase text-slate-500 sm:col-span-2">
          Scene (from content or custom)
          <input
            className={`${input} mt-1`}
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            placeholder="e.g. race title, headline"
            disabled={!content}
          />
        </label>
        <label className="block text-[10px] font-semibold uppercase text-slate-500">
          Mood
          <input className={`${input} mt-1`} value={mood} onChange={(e) => setMood(e.target.value)} />
        </label>
        <label className="block text-[10px] font-semibold uppercase text-slate-500">
          Duration (Runway gen4.5: 2–10s)
          <input
            type="number"
            min={2}
            max={10}
            step={1}
            className={`${input} mt-1`}
            value={durationSec}
            onChange={(e) => setDurationSec(Math.max(2, Math.min(10, Number(e.target.value) || 8)))}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <R365Button type="button" variant="ghost" onClick={fillFromTemplate} disabled={!content}>
          Fill scene from template
        </R365Button>
        <R365Button type="button" variant="ghost" onClick={() => void buildAiPrompt()} disabled={!content || aiBusy}>
          {aiBusy ? "Building…" : "Build AI prompt (OpenAI)"}
        </R365Button>
      </div>
      {aiError && <p className="text-xs text-red-400">{aiError}</p>}
      {aiPackage && (
        <div className="space-y-2 rounded-lg border border-[#1f2d26] bg-[#0f1512] p-3">
          <p className="text-[10px] text-[#22c55e]">
            AI package ready — filename <span className="font-mono">{aiPackage.filename}</span>. Edit the video prompt
            below if you want.
          </p>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Scene subtitle timing (JSON)</p>
          <pre className="max-h-56 overflow-auto rounded border border-[#1f2d26] bg-[#0a0e0c] p-2 text-[10px] text-slate-300">
            {JSON.stringify(aiPackage.subtitles, null, 2)}
          </pre>
        </div>
      )}
      <label className="block text-[10px] font-semibold uppercase text-slate-500">
        Video prompt (sent to Runway)
        <textarea
          className={`${input} mt-1 min-h-[120px] font-mono text-[11px]`}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Runway text-to-video prompt; no logos or text in-frame."
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <R365Button type="button" onClick={() => void startRunwayVideo()} disabled={runwayBusy || !promptText.trim()}>
          {runwayBusy ? "Starting…" : "Start Runway video"}
        </R365Button>
      </div>
      {taskId && (
        <div className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3 text-xs text-slate-300">
          <p className="font-mono text-[10px] text-[#eab308]">task {taskId}</p>
          <p className="mt-1 text-slate-400">
            Status:{" "}
            <strong className="text-slate-200">{taskJson?.status ?? "…"}</strong>
            {taskJson?.status === "RUNNING" && typeof taskJson.progress === "number" && (
              <span className="text-slate-500"> ({Math.round(taskJson.progress * 100)}%)</span>
            )}
          </p>
          {(taskJson?.status === "FAILED" || taskJson?.status === "CANCELLED") && (
            <p className="mt-1 text-red-300">{taskJson.failure || taskJson.error || "Task ended"}</p>
          )}
          {taskJson?.status === "SUCCEEDED" && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#22c55e]">Preview (before import)</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Streamed from Runway (URLs expire in ~24–48h). Import copies the file into this Short.
                </p>
                {runwayPreviewUrl ? (
                  <div className="mt-2">
                    {!previewVideoError ? (
                      <video
                        key={runwayPreviewUrl}
                        src={runwayPreviewUrl}
                        className="max-h-64 w-full rounded-lg border border-[#1f2d26] bg-black object-contain"
                        controls
                        muted
                        playsInline
                        preload="metadata"
                        onError={() => setPreviewVideoError(true)}
                      />
                    ) : (
                      <p className="text-[10px] text-amber-200/90">
                        Inline preview blocked (browser/CORS).{" "}
                        <a
                          href={runwayPreviewUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-[#22c55e] underline"
                        >
                          Open video in new tab
                        </a>{" "}
                        to review, then import below.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] text-amber-200/80">
                    No output URL in the task payload yet — you can still import; the server will resolve the file.
                  </p>
                )}
              </div>
              <div className="border-t border-[#1f2d26] pt-3">
                <R365Button type="button" onClick={() => void importToEditor()} disabled={importBusy}>
                  {importBusy ? "Importing…" : "Import to backdrop"}
                </R365Button>
                <p className="mt-2 text-[10px] text-slate-500">
                  Import saves to{" "}
                  <span className="font-mono text-slate-400">uploads/{contentId}/custom-bg.mp4</span>, refreshes the
                  motion background for this Short, and makes the same file available under{" "}
                  <strong className="text-slate-400">Upload backdrop file</strong>. Then use{" "}
                  <strong className="text-slate-400">Save backdrop to template</strong> so the path persists.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      {pendingTemplateSave && (
        <div className="rounded-lg border border-[#eab308]/35 bg-[#1a1608]/80 p-3">
          <p className="text-[11px] text-slate-300">
            Motion backdrop is live for this session. Save your template so the file path is stored with this Short and
            reloads correctly.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <R365Button
              type="button"
              onClick={() => {
                setSaveBackdropBusy(true);
                void Promise.resolve(onSaveBackdrop())
                  .then(() => setPendingTemplateSave(false))
                  .finally(() => setSaveBackdropBusy(false));
              }}
              disabled={saveBackdropBusy}
            >
              {saveBackdropBusy ? "Saving…" : "Save backdrop to template"}
            </R365Button>
          </div>
        </div>
      )}
      {runwayError && <p className="text-xs text-red-400">{runwayError}</p>}
    </div>
  );
}
