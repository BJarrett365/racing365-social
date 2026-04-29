"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  DEFAULT_I2V_RUNWAY_MOTION_FALLBACK,
  DEFAULT_RUNWAY_I2V_MOTION_MASTER_PROMPT,
  MODERATION_SAFE_I2V_MOTION_PROMPT,
} from "@/app/lib/prompts-catalog";
import { firstRunwayTaskOutputUrl } from "@/app/lib/runway-task-output";
import type { RunwayI2vMotionAiFields } from "@/app/lib/racecard-runway-i2v-fields";
import { RunwayTaskQueueHint } from "@/app/features/runway/RunwayTaskQueueHint";

type TaskJson = {
  status?: string;
  failure?: string;
  progress?: number;
  error?: string;
  output?: unknown;
};

const uiInput = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";
const uiLabel = "block text-[11px] font-semibold uppercase tracking-wide text-slate-400";

async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(blob);
  });
}

export type RunwayImageToVideoPanelProps = {
  contentId: string;
  getMotionAiFields: () => RunwayI2vMotionAiFields;
  heroImageUrl?: string | null;
  backdropImageLibraryRel?: string | null;
  onImportedVideo: (rels: { backgroundVideoRel: string; backgroundVideoFrameRel: string }) => void;
};

export function RunwayImageToVideoPanel(props: RunwayImageToVideoPanelProps) {
  const { contentId, getMotionAiFields, heroImageUrl, backdropImageLibraryRel, onImportedVideo } = props;

  const [i2vOpen, setI2vOpen] = useState(false);
  const [i2vImageUrl, setI2vImageUrl] = useState("");
  const [i2vImageDataUri, setI2vImageDataUri] = useState<string | null>(null);
  const [i2vPromptText, setI2vPromptText] = useState("");
  const [i2vDurationSec, setI2vDurationSec] = useState(8);
  const [i2vTaskId, setI2vTaskId] = useState<string | null>(null);
  const [i2vTaskJson, setI2vTaskJson] = useState<TaskJson | null>(null);
  const [i2vBusy, setI2vBusy] = useState(false);
  const [i2vError, setI2vError] = useState<string | null>(null);
  const [i2vImportBusy, setI2vImportBusy] = useState(false);
  const [i2vPreviewVideoError, setI2vPreviewVideoError] = useState(false);
  const [i2vAiBusy, setI2vAiBusy] = useState(false);
  const [i2vAiError, setI2vAiError] = useState<string | null>(null);
  const [libraryStillRel, setLibraryStillRel] = useState<string | null>(null);
  const [i2vMotionBuilderPrompt, setI2vMotionBuilderPrompt] = useState(DEFAULT_RUNWAY_I2V_MOTION_MASTER_PROMPT);
  const i2vMotionMasterCatalogRef = useRef(DEFAULT_RUNWAY_I2V_MOTION_MASTER_PROMPT);
  const i2vModerationSafeResolvedRef = useRef(MODERATION_SAFE_I2V_MOTION_PROMPT);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/prompts");
        const data = await res.json();
        if (cancelled || !res.ok) return;
        const rows = (data.builtin ?? []) as Array<{ id: string; body?: string; catalogBody?: string }>;
        const master = rows.find((r) => r.id === "builtin-news-shorts-i2v-motion-master");
        const mod = rows.find((r) => r.id === "builtin-news-shorts-i2v-moderation-safe-motion");
        if (typeof master?.catalogBody === "string" && master.catalogBody.trim()) {
          i2vMotionMasterCatalogRef.current = master.catalogBody;
        }
        if (typeof master?.body === "string" && master.body.trim()) {
          setI2vMotionBuilderPrompt((prev) =>
            prev === DEFAULT_RUNWAY_I2V_MOTION_MASTER_PROMPT ? master.body! : prev,
          );
        }
        if (typeof mod?.body === "string" && mod.body.trim()) {
          i2vModerationSafeResolvedRef.current = mod.body;
        } else if (typeof mod?.catalogBody === "string" && mod.catalogBody.trim()) {
          i2vModerationSafeResolvedRef.current = mod.catalogBody;
        }
      } catch {
        /* keep catalog defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadI2vImageFromLibraryRel = useCallback(async (rel: string) => {
    const trimmed = rel.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/file?rel=${encodeURIComponent(trimmed)}`);
      if (!res.ok) return;
      const dataUri = await blobToDataUri(await res.blob());
      setI2vImageDataUri(dataUri);
      setI2vImageUrl("");
      setLibraryStillRel(trimmed);
    } catch {
      /* ignore */
    }
  }, []);

  const importRunwayTaskToBackdrop = useCallback(
    async (taskId: string) => {
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
      };
      if (!res.ok || !data.backgroundVideoRel || !data.backgroundVideoFrameRel) {
        throw new Error(data.error || "Import failed");
      }
      onImportedVideo({
        backgroundVideoRel: data.backgroundVideoRel,
        backgroundVideoFrameRel: data.backgroundVideoFrameRel,
      });
    },
    [contentId, onImportedVideo],
  );

  useEffect(() => {
    if (!i2vTaskId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/runway/tasks/${encodeURIComponent(i2vTaskId)}`);
        const data = (await res.json()) as TaskJson & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setI2vTaskJson({ status: "FAILED", failure: data.error || `HTTP ${res.status}` });
          window.clearInterval(timer);
          return;
        }
        setI2vTaskJson(data);
        const s = data.status;
        if (s === "SUCCEEDED" || s === "FAILED" || s === "CANCELLED") {
          window.clearInterval(timer);
        }
      } catch {
        if (!cancelled) {
          setI2vTaskJson({ status: "FAILED", failure: "Poll failed" });
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
  }, [i2vTaskId]);

  const i2vPreviewUrl = useMemo(() => {
    if (!i2vTaskJson || i2vTaskJson.status !== "SUCCEEDED") return null;
    return firstRunwayTaskOutputUrl(i2vTaskJson as Record<string, unknown>);
  }, [i2vTaskJson]);

  const i2vModerationBlocked = useMemo(
    () => Boolean(i2vError && /moderation/i.test(i2vError)),
    [i2vError],
  );

  useEffect(() => {
    setI2vPreviewVideoError(false);
  }, [i2vPreviewUrl]);

  const onI2vImageFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setI2vError("Choose an image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setI2vError("Image must be 12MB or smaller.");
      return;
    }
    setI2vError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") {
        setI2vImageDataUri(r);
        setI2vImageUrl("");
        setLibraryStillRel(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const buildI2vAiPrompt = async () => {
    const ctx = getMotionAiFields();
    const hasSlides = ctx.slides.length > 0;
    const hasEditorCtx = Boolean(ctx.editorMotionContext?.trim());
    if (!ctx.title.trim()) {
      setI2vAiError("Load template content first (headline is required for the motion builder).");
      return;
    }
    if (!hasSlides && !hasEditorCtx) {
      setI2vAiError("Add racecard scenes or fill the headline/script first.");
      return;
    }
    setI2vAiBusy(true);
    setI2vAiError(null);
    try {
      const res = await fetch("/api/ai/runway-image-to-video-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: ctx.brand,
          title: ctx.title,
          strapline: ctx.strapline,
          sourceUrl: ctx.sourceUrl,
          tags: ctx.tags,
          slides: ctx.slides,
          articleBodySample: ctx.articleBodySample,
          ...(ctx.editorMotionContext?.trim()
            ? { editorMotionContext: ctx.editorMotionContext.trim() }
            : {}),
          ...(i2vMotionBuilderPrompt.trim()
            ? { motionPromptBuilderInstruction: i2vMotionBuilderPrompt.trim() }
            : {}),
        }),
      });
      const data = (await res.json()) as { motion_prompt?: string; duration?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Prompt build failed");
      if (data.motion_prompt) setI2vPromptText(data.motion_prompt);
      const d = Math.round(Number(data.duration));
      if (Number.isFinite(d) && d >= 2 && d <= 10) setI2vDurationSec(d);
    } catch (e) {
      setI2vAiError(e instanceof Error ? e.message : "Failed to build motion prompt");
    } finally {
      setI2vAiBusy(false);
    }
  };

  const startI2vVideo = async () => {
    const promptImage = (i2vImageDataUri || i2vImageUrl.trim()).trim();
    if (!promptImage) {
      setI2vError("Add a public image URL (https) or upload an image.");
      return;
    }
    const pt = i2vPromptText.trim() || DEFAULT_I2V_RUNWAY_MOTION_FALLBACK;
    setI2vBusy(true);
    setI2vError(null);
    setI2vAiError(null);
    setI2vTaskId(null);
    setI2vTaskJson(null);
    setI2vPreviewVideoError(false);
    try {
      const res = await fetch("/api/runway/image-to-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptImage,
          promptText: pt,
          duration: i2vDurationSec,
          model: "gen4.5",
        }),
      });
      const data = (await res.json()) as { taskId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Runway rejected the request");
      if (!data.taskId) throw new Error("No task id");
      setI2vTaskId(data.taskId);
    } catch (e) {
      setI2vError(e instanceof Error ? e.message : "Image-to-video start failed");
    } finally {
      setI2vBusy(false);
    }
  };

  const importI2vBackdrop = async () => {
    if (!i2vTaskId || i2vTaskJson?.status !== "SUCCEEDED") return;
    setI2vImportBusy(true);
    setI2vError(null);
    try {
      await importRunwayTaskToBackdrop(i2vTaskId);
    } catch (e) {
      setI2vError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setI2vImportBusy(false);
    }
  };

  const ctx = getMotionAiFields();
  const canBuildAi =
    Boolean(ctx.title.trim()) && (ctx.slides.length > 0 || Boolean(ctx.editorMotionContext?.trim()));

  const heroHttps =
    heroImageUrl && /^https:\/\//i.test(heroImageUrl.trim()) ? heroImageUrl.trim() : null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <button
        type="button"
        onClick={() => setI2vOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-200">Image to Video</h2>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border font-mono text-sm leading-none text-[#eab308]"
          style={{ borderColor: "var(--border-strong)", backgroundColor: "var(--surface)" }}
        >
          {i2vOpen ? "−" : "+"}
        </span>
      </button>
      {i2vOpen ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-400">
            Turn a still into a 9:16 clip with <strong className="text-slate-300">Runway Gen-4.5</strong> image-to-video (
            <code className="text-slate-500">/v1/image_to_video</code>). The image sets composition and style; your{" "}
            <strong className="text-slate-300">motion prompt</strong> should describe{" "}
            <strong className="text-slate-300">camera and movement</strong> (see Runway&apos;s{" "}
            <a
              href="https://help.runwayml.com/hc/en-us/articles/48324313115155-Image-to-Video-Prompting-Guide"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#22c55e] underline underline-offset-2"
            >
              Image to Video prompting guide
            </a>
            ). Provide a <strong className="text-slate-300">public https</strong> image URL, or upload a file (sent as
            a data URI).
          </p>
          {libraryStillRel ? (
            <p className="text-xs text-slate-500">
              Using a server library still. Runway receives it as an inline image.
            </p>
          ) : null}
          <label className={uiLabel}>
            Image URL (https)
            <input
              className={`${uiInput} mt-1`}
              value={i2vImageUrl}
              onChange={(e) => {
                setI2vImageUrl(e.target.value);
                if (e.target.value.trim()) {
                  setI2vImageDataUri(null);
                  setLibraryStillRel(null);
                }
              }}
              placeholder="https://example.com/hero.jpg"
            />
          </label>
          <label className={uiLabel}>
            Or upload image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="mt-1 block w-full text-xs text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-[#1f2d26] file:px-2 file:py-1 file:text-slate-200"
              onChange={onI2vImageFile}
            />
          </label>
          {heroHttps ? (
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200"
              onClick={() => {
                setI2vImageUrl(heroHttps);
                setI2vImageDataUri(null);
                setLibraryStillRel(null);
                setI2vError(null);
              }}
            >
              Use course hero image URL
            </button>
          ) : null}
          {backdropImageLibraryRel?.trim() ? (
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200"
              onClick={() => {
                setI2vError(null);
                void loadI2vImageFromLibraryRel(backdropImageLibraryRel.trim());
              }}
            >
              Use current backdrop still (library file)
            </button>
          ) : null}
          {(i2vImageDataUri || (/^https?:\/\//i.test(i2vImageUrl.trim()) ? i2vImageUrl.trim() : "")) ? (
            <div className="overflow-hidden rounded-lg border border-slate-700 bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={i2vImageDataUri || i2vImageUrl.trim()}
                alt="Source for image-to-video"
                className="mx-auto max-h-40 w-full object-contain"
              />
            </div>
          ) : null}
          <label className={uiLabel}>
            AI prompt for motion (OpenAI builder)
            <textarea
              className={`${uiInput} mt-1 min-h-[140px] font-mono text-[11px] leading-relaxed`}
              value={i2vMotionBuilderPrompt}
              onChange={(e) => setI2vMotionBuilderPrompt(e.target.value)}
              spellCheck={false}
              placeholder="Editor brief for OpenAI: tone, camera, motion style."
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-[11px] font-semibold text-slate-300"
              onClick={() => setI2vMotionBuilderPrompt(i2vMotionMasterCatalogRef.current)}
            >
              Reset motion master prompt
            </button>
          </div>
          <div className="rounded-lg border border-[#1f2d26] bg-[#0f1512] p-3 space-y-2">
            <p className="text-[10px] leading-relaxed text-slate-500">
              <strong className="text-slate-400">OpenAI</strong> can draft motion text from your motion master prompt,
              racecard title, script sample, and scene captions. Edit the result before starting Runway.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border border-[#22c55e]/40 bg-[#22c55e]/10 px-3 py-2 text-xs font-semibold text-[#22c55e] disabled:opacity-40"
                onClick={() => void buildI2vAiPrompt()}
                disabled={i2vAiBusy || !canBuildAi}
              >
                {i2vAiBusy ? "Building…" : "Build AI motion prompt (OpenAI)"}
              </button>
            </div>
            {i2vAiError ? <p className="text-xs text-red-400">{i2vAiError}</p> : null}
          </div>
          <div
            className={
              i2vModerationBlocked
                ? "space-y-2 rounded-lg border border-amber-500/45 bg-amber-950/25 p-3"
                : "space-y-2"
            }
          >
            {i2vModerationBlocked ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-amber-100">Runway: text prompt did not pass moderation</p>
                <p className="text-[10px] leading-relaxed text-amber-100/90">
                  Edit the <strong className="text-amber-50">motion prompt</strong> below (camera, light, environment
                  only). Avoid real names and brands in the motion line if Runway blocks them.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-amber-400/50 bg-amber-500/15 px-2 py-1.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/25"
                    onClick={() => {
                      setI2vPromptText(i2vModerationSafeResolvedRef.current);
                      setI2vError(null);
                    }}
                  >
                    Use moderation-safe motion text
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-600 px-2 py-1.5 text-[10px] font-semibold text-slate-300 hover:border-slate-500"
                    onClick={() => {
                      setI2vPromptText("");
                      setI2vError(null);
                    }}
                  >
                    Clear (use short default on next start)
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-600 px-2 py-1.5 text-[10px] font-semibold text-slate-300 hover:border-slate-500"
                    onClick={() => void buildI2vAiPrompt()}
                    disabled={i2vAiBusy || !canBuildAi}
                  >
                    Rebuild with OpenAI
                  </button>
                </div>
                <p className="text-[10px] text-red-300/95">{i2vError}</p>
              </div>
            ) : null}
            <label className={uiLabel}>
              Motion prompt (sent to Runway — describe motion and camera, not the whole scene)
              <textarea
                className={`${uiInput} mt-1 ${i2vModerationBlocked ? "min-h-[140px]" : "min-h-[80px]"}`}
                value={i2vPromptText}
                onChange={(e) => setI2vPromptText(e.target.value)}
                spellCheck={true}
                placeholder={
                  i2vModerationBlocked
                    ? "Edit here, then click Start Image to Video again."
                    : 'e.g. Slow push-in with gentle handheld drift — or use "Build AI motion prompt" above'
                }
              />
            </label>
          </div>
          <label className={uiLabel}>
            Duration (2–10s)
            <input
              type="number"
              min={2}
              max={10}
              step={1}
              className={`${uiInput} mt-1`}
              value={i2vDurationSec}
              onChange={(e) => setI2vDurationSec(Math.max(2, Math.min(10, Number(e.target.value) || 8)))}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-[#22c55e]/40 bg-[#22c55e]/10 px-3 py-2 text-xs font-semibold text-[#22c55e] disabled:opacity-40"
              onClick={() => void startI2vVideo()}
              disabled={i2vBusy || (!i2vImageDataUri && !i2vImageUrl.trim())}
            >
              {i2vBusy ? "Starting…" : "Start Image to Video (Runway)"}
            </button>
          </div>
          {i2vTaskId ? (
            <div className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3 text-xs text-slate-300">
              <p className="font-mono text-[10px] text-[#eab308]">task {i2vTaskId}</p>
              <p className="mt-1 text-slate-400">
                Status: <strong className="text-slate-200">{i2vTaskJson?.status ?? "…"}</strong>
                {i2vTaskJson?.status === "RUNNING" && typeof i2vTaskJson.progress === "number" ? (
                  <span className="text-slate-500"> ({Math.round(i2vTaskJson.progress * 100)}%)</span>
                ) : null}
              </p>
              <RunwayTaskQueueHint status={i2vTaskJson?.status} modality="video" />
              {i2vTaskJson?.status === "FAILED" || i2vTaskJson?.status === "CANCELLED" ? (
                <p className="mt-1 text-red-300">{i2vTaskJson.failure || "Task ended"}</p>
              ) : null}
              {i2vTaskJson?.status === "SUCCEEDED" ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#22c55e]">
                      Preview (before import)
                    </p>
                    {i2vPreviewUrl ? (
                      <div className="mt-2">
                        {!i2vPreviewVideoError ? (
                          <video
                            key={i2vPreviewUrl}
                            src={i2vPreviewUrl}
                            className="max-h-64 w-full rounded-lg border border-[#1f2d26] bg-black object-contain"
                            controls
                            muted
                            playsInline
                            preload="metadata"
                            onError={() => setI2vPreviewVideoError(true)}
                          />
                        ) : (
                          <p className="text-[10px] text-amber-200/90">
                            Inline preview blocked.{" "}
                            <a
                              href={i2vPreviewUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-[#22c55e] underline"
                            >
                              Open video in new tab
                            </a>
                            .
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-[10px] text-amber-200/80">
                        No output URL in the task payload — you can still import; the server will resolve the file.
                      </p>
                    )}
                  </div>
                  <div className="border-t border-[#1f2d26] pt-3">
                    <button
                      type="button"
                      className="rounded-md border border-[#22c55e]/40 bg-[#22c55e]/10 px-3 py-2 text-xs font-semibold text-[#22c55e] disabled:opacity-40"
                      onClick={() => void importI2vBackdrop()}
                      disabled={i2vImportBusy}
                    >
                      {i2vImportBusy ? "Importing…" : "Import to backdrop"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {i2vError && !i2vModerationBlocked ? <p className="text-xs text-red-400">{i2vError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
