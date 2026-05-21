"use client";

import { useCallback, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath, withAppPathPrefix } from "@/app/lib/app-base-path";
import { isSafeContentId, normalizeContentIdForFilename } from "@/app/lib/editor-content-id";
import { RUNWAY_T2I_PROMPT_MAX, RUNWAY_T2I_RATIOS_NEWS_SHORTS, formatRunwayT2iRatioLabel } from "@/app/lib/runway-text-to-image-constants";

type T2iProvider = "runway" | "openai" | "higgsfield";

const HIGGSFIELD_ASPECTS = ["1:1", "4:3", "3:4", "16:9", "9:16"] as const;

type Props = {
  /** Override default panel heading (e.g. on Tools → Asset library). */
  panelTitle?: string;
  className?: string;
};

export function LibraryTextToImagePanel({ panelTitle = "Text to image (asset library)", className = "mb-6" }: Props) {
  const [provider, setProvider] = useState<T2iProvider>("higgsfield");
  const [prompt, setPrompt] = useState("");
  const [runwayRatio, setRunwayRatio] = useState("1280:720");
  const [openAiSize, setOpenAiSize] = useState<"1792x1024" | "1024x1024" | "1024x1792">("1792x1024");
  const [higgsAspect, setHiggsAspect] = useState<(typeof HIGGSFIELD_ASPECTS)[number]>("16:9");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [libraryRel, setLibraryRel] = useState<string | null>(null);

  const run = useCallback(async () => {
    const promptText = prompt.trim();
    if (!promptText) {
      setError("Enter a prompt first.");
      setMessage(null);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    setPreviewUrl(null);
    setLibraryRel(null);
    try {
      if (provider === "openai") {
        const res = await fetch(studioApiPath("/api/openai/text-to-image"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText,
            size: openAiSize,
            quality: "standard",
          }),
        });
        const data = (await res.json()) as { error?: string; imageUrl?: string; imageLibraryRel?: string };
        if (!res.ok || !data.imageUrl) throw new Error(data.error || "OpenAI text-to-image failed.");
        setPreviewUrl(data.imageUrl);
        setLibraryRel(data.imageLibraryRel?.trim() ? data.imageLibraryRel.trim() : null);
        setMessage("OpenAI image saved to the library (when download succeeded). Copy URL or use the path below in Language Studio.");
        return;
      }

      if (provider === "higgsfield") {
        const res = await fetch(studioApiPath("/api/higgsfield/text-to-image"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText,
            aspectRatio: higgsAspect,
          }),
        });
        const data = (await res.json()) as { error?: string; imageUrl?: string; imageLibraryRel?: string; ok?: boolean };
        if (!res.ok || !data.imageUrl) throw new Error(data.error || "Higgsfield text-to-image failed.");
        setPreviewUrl(data.imageUrl);
        setLibraryRel(data.imageLibraryRel?.trim() ? data.imageLibraryRel.trim() : null);
        setMessage("Higgsfield image saved to the library. Use the path below in Review Queue → Source Image, or copy the URL.");
        return;
      }

      if (promptText.length > RUNWAY_T2I_PROMPT_MAX) {
        throw new Error(
          `Runway allows at most ${RUNWAY_T2I_PROMPT_MAX} characters (this prompt is ${promptText.length}). Shorten the prompt or switch to OpenAI / Higgsfield.`,
        );
      }
      const startRes = await fetch(studioApiPath("/api/runway/text-to-image"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText,
          ratio: runwayRatio,
        }),
      });
      const startData = (await startRes.json()) as { error?: string; taskId?: string };
      if (!startRes.ok) throw new Error(startData.error || "Runway Text to Image failed.");
      const taskId = typeof startData.taskId === "string" ? startData.taskId.trim() : "";
      if (!taskId) throw new Error("Runway did not return a task id.");

      const norm = normalizeContentIdForFilename(`library-t2i-${Date.now().toString(36)}`);
      const contentId = isSafeContentId(norm) && norm.length > 0 ? norm : `library-t2i-${Date.now().toString(36)}`;

      const maxAttempts = 45;
      const delayMs = 3000;
      let lastStatus = "";
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, delayMs));
        const impRes = await fetch(studioApiPath("/api/runway/import-task"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, taskId, assetKind: "image" }),
        });
        const impData = (await impRes.json()) as {
          error?: string;
          backgroundImageRel?: string;
          status?: string;
        };
        if (impRes.ok && typeof impData.backgroundImageRel === "string" && impData.backgroundImageRel.trim()) {
          const rel = impData.backgroundImageRel.trim();
          const url = withAppPathPrefix(`/api/file?rel=${encodeURIComponent(rel)}`);
          setPreviewUrl(url);
          setLibraryRel(rel);
          setMessage(`Runway image ready (task ${taskId}). Saved under ${rel}.`);
          return;
        }
        if (impRes.status === 409) {
          lastStatus = typeof impData.status === "string" ? impData.status : "processing";
          continue;
        }
        throw new Error(impData.error || `Runway import failed (${impRes.status}).`);
      }
      const approxMin = Math.round((maxAttempts * delayMs) / 6000) / 10;
      throw new Error(
        lastStatus
          ? `Runway task did not finish within ~${approxMin} min (last status: ${lastStatus}).`
          : `Runway task did not finish within ~${approxMin} min.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Text to image failed.");
    } finally {
      setBusy(false);
    }
  }, [provider, prompt, runwayRatio, openAiSize, higgsAspect]);

  const displayPreview = libraryRel
    ? withAppPathPrefix(`/api/file?rel=${encodeURIComponent(libraryRel)}`)
    : previewUrl;

  return (
    <Panel title={panelTitle} className={className}>
      <p className="text-xs text-[color:var(--text-secondary)]">
        Generate a still and save it under <code className="text-[color:var(--text-muted)]">output/images/library/</code>. Then attach
        the path in{" "}
        <strong className="text-[color:var(--text-primary)]">Language Studio → Review Queue → Source Image</strong>, or use{" "}
        <strong className="text-[color:var(--text-primary)]">Image Library path</strong>.
      </p>
      <label className="mt-3 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
        Provider
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as T2iProvider)}
          className="mt-1 w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        >
          <option value="higgsfield">Higgsfield (prompt-only — Seedream v4 default)</option>
          <option value="openai">OpenAI Images (gpt-image-1 default)</option>
          <option value="runway">Runway Gen-4 (async — polled to library)</option>
        </select>
      </label>
      {provider === "runway" ? (
        <label className="mt-3 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
          Runway ratio
          <select
            value={runwayRatio}
            onChange={(e) => setRunwayRatio(e.target.value)}
            className="mt-1 w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            {RUNWAY_T2I_RATIOS_NEWS_SHORTS.map((r) => (
              <option key={r} value={r}>
                {formatRunwayT2iRatioLabel(r)}
              </option>
            ))}
          </select>
        </label>
      ) : provider === "openai" ? (
        <label className="mt-3 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
          OpenAI output size
          <select
            value={openAiSize}
            onChange={(e) => setOpenAiSize(e.target.value as typeof openAiSize)}
            className="mt-1 w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <option value="1792x1024">1792 × 1024 — landscape (≈16:9)</option>
            <option value="1024x1024">1024 × 1024 — square</option>
            <option value="1024x1792">1024 × 1792 — portrait</option>
          </select>
        </label>
      ) : (
        <>
          <label className="mt-3 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
            Higgsfield aspect ratio
            <select
              value={higgsAspect}
              onChange={(e) => setHiggsAspect(e.target.value as (typeof HIGGSFIELD_ASPECTS)[number])}
              className="mt-1 w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              {HIGGSFIELD_ASPECTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-2 text-xs text-[color:var(--text-secondary)]">
            Default model path{" "}
            <code className="text-[color:var(--text-muted)]">bytedance/seedream/v4/text-to-image</code> — override with{" "}
            <code className="text-[color:var(--text-muted)]">HIGGSFIELD_TEXT_TO_IMAGE_ENDPOINT</code>. Requires Higgsfield credentials.
          </p>
        </>
      )}
      <label className="mt-3 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
        Prompt
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="Describe the image to generate…"
          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 font-mono text-xs leading-relaxed text-[color:var(--text-primary)]"
        />
      </label>
      {provider === "runway" && prompt.length > RUNWAY_T2I_PROMPT_MAX ? (
        <p className="mt-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Prompt is {prompt.length} characters; Runway allows {RUNWAY_T2I_PROMPT_MAX}. Switch to OpenAI or Higgsfield for longer briefs.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <R365Button type="button" onClick={() => void run()} disabled={busy || !prompt.trim()}>
          {busy ? "Generating…" : "Text to image"}
        </R365Button>
      </div>
      {message ? <p className="mt-3 text-xs text-[#22c55e]">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {displayPreview ? (
        <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
          {libraryRel ? (
            <p className="break-all font-mono text-[11px] text-[color:var(--text-secondary)]">
              Library: <code>{libraryRel}</code>
            </p>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayPreview} alt="" className="mt-2 max-h-80 max-w-full rounded-lg border border-[color:var(--border)] object-contain" />
          <R365Button
            type="button"
            variant="ghost"
            className="mt-2"
            onClick={() => void navigator.clipboard.writeText(displayPreview)}
          >
            Copy image URL
          </R365Button>
        </div>
      ) : null}
    </Panel>
  );
}
