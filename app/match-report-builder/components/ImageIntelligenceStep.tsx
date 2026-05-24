"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath, withAppPathPrefix } from "@/app/lib/app-base-path";
import { isSafeContentId, normalizeContentIdForFilename } from "@/app/lib/editor-content-id";
import {
  buildMatchReportHeroPrompt,
  buildPreviewHeroPrompt,
  F365_MATCH_REPORT_SPEC,
  F365_PREVIEW_SPEC,
  type HeroPromptProvider,
} from "@/app/lib/match-report/hero-image-prompts";
import { RUNWAY_T2I_PROMPT_MAX } from "@/app/lib/runway-text-to-image-constants";
import type { MatchReportProject } from "@/app/lib/match-report/types";
import { HeroPreviewGrid } from "@/app/match-report-builder/components/HeroPreviewGrid";
import {
  LibraryImagePickerModal,
  libraryImagePreviewUrl,
} from "@/app/match-report-builder/components/LibraryImagePickerModal";

const inputClass =
  "w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]";

type SourceMode = "library" | "generate" | "url";

type Props = {
  project: MatchReportProject;
  onProjectChange: (project: MatchReportProject) => void;
  onBack?: () => void;
  busy?: boolean;
  error?: string | null;
};

export function ImageIntelligenceStep({ project, onProjectChange, onBack, busy, error }: Props) {
  const [mode, setMode] = useState<SourceMode>("library");
  const [libraryRel, setLibraryRel] = useState("");
  const [libraryUrl, setLibraryUrl] = useState("");
  const [rightsChecked, setRightsChecked] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);

  const [t2iProvider, setT2iProvider] = useState<HeroPromptProvider>("openai");
  const [t2iPrompt, setT2iPrompt] = useState("");
  const [t2iMessage, setT2iMessage] = useState<string | null>(null);
  const [generatedRel, setGeneratedRel] = useState("");
  const [generationPrompt, setGenerationPrompt] = useState("");

  const previewUrl = useMemo(() => {
    if (mode === "generate" && generatedRel) return libraryImagePreviewUrl(generatedRel);
    if (libraryRel) return libraryImagePreviewUrl(libraryRel);
    if (libraryUrl.trim()) return libraryImagePreviewUrl(libraryUrl.trim());
    return "";
  }, [generatedRel, libraryRel, libraryUrl, mode]);

  const imageEditorHref = useMemo(() => {
    const rel = libraryRel || generatedRel;
    if (rel) {
      return withAppPathPrefix(`/tools/image-editor?rel=${encodeURIComponent(rel)}`);
    }
    return withAppPathPrefix("/tools/image-editor");
  }, [generatedRel, libraryRel]);

  const applyMatchReportPrompt = useCallback(() => {
    setT2iPrompt(buildMatchReportHeroPrompt(project, t2iProvider));
    setT2iMessage("Match report hero prompt filled from this fixture.");
  }, [project, t2iProvider]);

  const applyPreviewPrompt = useCallback(() => {
    setT2iPrompt(buildPreviewHeroPrompt(project, t2iProvider));
    setT2iMessage("Preview hero prompt filled from this fixture.");
  }, [project, t2iProvider]);

  const runGenerate = async () => {
    const promptText = t2iPrompt.trim();
    if (!promptText) throw new Error("Enter a prompt or use Match report hero / Preview hero.");
    setLocalBusy(true);
    setT2iMessage(null);
    setGeneratedRel("");
    try {
      if (t2iProvider === "openai") {
        const res = await fetch(studioApiPath("/api/openai/text-to-image"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptText, size: "1792x1024", quality: "standard" }),
        });
        const data = (await res.json()) as { error?: string; imageLibraryRel?: string };
        if (!res.ok || !data.imageLibraryRel?.trim()) throw new Error(data.error || "OpenAI text-to-image failed.");
        setGeneratedRel(data.imageLibraryRel.trim());
        setLibraryRel(data.imageLibraryRel.trim());
        setGenerationPrompt(promptText);
        setT2iMessage("Hero image generated and saved to Media Library.");
        setMode("generate");
        return;
      }
      if (t2iProvider === "higgsfield") {
        const res = await fetch(studioApiPath("/api/higgsfield/text-to-image"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptText, aspectRatio: "16:9" }),
        });
        const data = (await res.json()) as { error?: string; imageLibraryRel?: string };
        if (!res.ok || !data.imageLibraryRel?.trim()) throw new Error(data.error || "Higgsfield text-to-image failed.");
        setGeneratedRel(data.imageLibraryRel.trim());
        setLibraryRel(data.imageLibraryRel.trim());
        setGenerationPrompt(promptText);
        setT2iMessage("Hero image generated and saved to Media Library.");
        return;
      }
      if (promptText.length > RUNWAY_T2I_PROMPT_MAX) {
        throw new Error(`Runway max ${RUNWAY_T2I_PROMPT_MAX} chars — use Match report hero with Runway selected.`);
      }
      const startRes = await fetch(studioApiPath("/api/runway/text-to-image"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptText, ratio: "1280:720" }),
      });
      const startData = (await startRes.json()) as { error?: string; taskId?: string };
      if (!startRes.ok || !startData.taskId?.trim()) throw new Error(startData.error || "Runway text-to-image failed.");
      const norm = normalizeContentIdForFilename(`mr-hero-${project.id.slice(0, 12)}`);
      const contentId = isSafeContentId(norm) && norm.length > 0 ? norm : `mr-hero-${Date.now().toString(36)}`;
      for (let attempt = 0; attempt < 45; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));
        const impRes = await fetch(studioApiPath("/api/runway/import-task"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, taskId: startData.taskId, assetKind: "image" }),
        });
        const impData = (await impRes.json()) as { error?: string; backgroundImageRel?: string };
        if (impRes.ok && impData.backgroundImageRel?.trim()) {
          const rel = impData.backgroundImageRel.trim();
          setGeneratedRel(rel);
          setLibraryRel(rel);
          setGenerationPrompt(promptText);
          setT2iMessage("Runway hero saved to Media Library.");
          return;
        }
      }
      throw new Error("Runway image generation timed out.");
    } finally {
      setLocalBusy(false);
    }
  };

  const complete = async () => {
    setLocalError(null);
    const rel = libraryRel.trim();
    const url = rel ? libraryImagePreviewUrl(rel) : libraryUrl.trim();
    if (!url) throw new Error("Select or generate a hero image first.");
    if (!rightsChecked) throw new Error("Confirm rights before continuing.");
    const res = await fetch(studioApiPath("/api/match-report/image-intelligence"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        source: generationPrompt ? "generate" : "library",
        libraryUrl: url,
        libraryRel: rel || undefined,
        rightsChecked,
        generationPrompt: generationPrompt || undefined,
      }),
    });
    const data = (await res.json()) as { project?: MatchReportProject; error?: string };
    if (!res.ok || !data.project) throw new Error(data.error || "Image intelligence failed");
    onProjectChange(data.project);
  };

  const skip = async () => {
    setLocalError(null);
    const res = await fetch(studioApiPath("/api/match-report/image-intelligence"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, source: "skip" }),
    });
    const data = (await res.json()) as { project?: MatchReportProject; error?: string };
    if (!res.ok || !data.project) throw new Error(data.error || "Skip failed");
    onProjectChange(data.project);
  };

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Action failed");
    }
  };

  const advanceToMediaBuilder = async () => {
    setLocalError(null);
    const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(project.id)}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowStep: "media_builder", workflowPhase: "generation" }),
    });
    const data = (await res.json()) as { project?: MatchReportProject; error?: string };
    if (!res.ok || !data.project) throw new Error(data.error || "Continue failed");
    onProjectChange(data.project);
  };

  const pickFromLibrary = (relPath: string) => {
    setLibraryRel(relPath);
    setLibraryUrl("");
    setGeneratedRel("");
    setGenerationPrompt("");
    setMode("library");
  };

  const canComplete = Boolean(previewUrl) && rightsChecked && !localBusy && !busy;

  if (project.imageIntelligence?.hero?.url) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[color:var(--text-secondary)]">Hero image selected — social crop variants below.</p>
        <HeroPreviewGrid imageIntelligence={project.imageIntelligence} />
        <div className="flex flex-wrap gap-3">
          {onBack ? (
            <R365Button variant="ghost" onClick={onBack} disabled={busy}>
              ← Back
            </R365Button>
          ) : null}
          <R365Button onClick={() => run(advanceToMediaBuilder)} disabled={busy}>
            Continue to media builder
          </R365Button>
        </div>
        {error || localError ? <p className="text-sm text-red-300">{error || localError}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Image intelligence</p>
        <h3 className="mt-2 text-xl font-bold text-[color:var(--text-primary)]">Hero image + social crops</h3>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          Pick from Media Library, generate with Football365 hero prompts, or paste a URL. Open the{" "}
          <Link href={withAppPathPrefix("/tools/image-editor")} className="font-semibold text-emerald-300 underline">
            Image Editor
          </Link>{" "}
          to refine crops and exports.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["library", "generate", "url"] as SourceMode[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              mode === tab ? "bg-emerald-500/20 text-emerald-200" : "text-[color:var(--text-muted)]"
            }`}
            style={{ borderColor: "var(--border)" }}
          >
            {tab === "library" ? "Media Library" : tab === "generate" ? "Generate with AI" : "Paste URL"}
          </button>
        ))}
      </div>

      {mode === "library" ? (
        <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}>
          <div className="flex flex-wrap gap-2">
            <R365Button type="button" onClick={() => setPickerOpen(true)} disabled={localBusy || busy}>
              Browse Media Library
            </R365Button>
            <Link href={imageEditorHref}>
              <R365Button type="button" variant="ghost">
                Open in Image Editor →
              </R365Button>
            </Link>
          </div>
          {libraryRel ? (
            <p className="font-mono text-xs text-[color:var(--text-muted)] break-all">{libraryRel}</p>
          ) : (
            <p className="text-xs text-[color:var(--text-muted)]">No image selected yet.</p>
          )}
        </div>
      ) : null}

      {mode === "generate" ? (
        <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}>
          <p className="text-xs text-[color:var(--text-secondary)]">{F365_MATCH_REPORT_SPEC}</p>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Provider</span>
            <select
              className={inputClass}
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
              value={t2iProvider}
              onChange={(e) => setT2iProvider(e.target.value as HeroPromptProvider)}
            >
              <option value="openai">OpenAI Images</option>
              <option value="higgsfield">Higgsfield</option>
              <option value="runway">Runway Gen-4</option>
            </select>
          </label>
          <details className="text-xs text-[color:var(--text-muted)]">
            <summary className="cursor-pointer font-semibold text-[color:var(--text-secondary)]">Preview hero spec</summary>
            <p className="mt-2">{F365_PREVIEW_SPEC}</p>
          </details>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Report AI prompt</span>
            <textarea
              className={`${inputClass} min-h-[160px] font-mono text-xs leading-5`}
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
              value={t2iPrompt}
              onChange={(e) => setT2iPrompt(e.target.value)}
              placeholder="Use Match report hero or Preview hero to fill from this fixture…"
            />
          </label>
          {t2iProvider === "runway" && t2iPrompt.length > RUNWAY_T2I_PROMPT_MAX ? (
            <p className="text-xs text-amber-300">
              Prompt is {t2iPrompt.length} chars — Runway max is {RUNWAY_T2I_PROMPT_MAX}. Use Match report hero with Runway selected.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <R365Button type="button" variant="ghost" onClick={applyMatchReportPrompt} disabled={localBusy || busy}>
              Match report hero
            </R365Button>
            <R365Button type="button" variant="ghost" onClick={applyPreviewPrompt} disabled={localBusy || busy}>
              Preview hero
            </R365Button>
            <R365Button type="button" onClick={() => run(runGenerate)} disabled={localBusy || busy || !t2iPrompt.trim()}>
              {localBusy ? "Generating…" : "Text to image"}
            </R365Button>
          </div>
          {t2iMessage ? <p className="text-xs text-emerald-300">{t2iMessage}</p> : null}
        </div>
      ) : null}

      {mode === "url" ? (
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Image URL</span>
          <input
            className={inputClass}
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
            value={libraryUrl}
            onChange={(e) => {
              setLibraryUrl(e.target.value);
              setLibraryRel("");
            }}
            placeholder="https://…/hero.jpg or /api/file?rel=…"
          />
        </label>
      ) : null}

      {previewUrl ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Preview</p>
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Hero preview" className="aspect-video w-full object-cover" />
          </div>
          <p className="text-xs text-[color:var(--text-muted)]">
            Social crops (Instagram, Stories, YouTube thumb) are derived from this hero on save.
          </p>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
        <input type="checkbox" checked={rightsChecked} onChange={(e) => setRightsChecked(e.target.checked)} />
        Rights confirmed for editorial use
      </label>

      <div className="flex flex-wrap gap-3">
        {onBack ? (
          <R365Button variant="ghost" onClick={onBack} disabled={busy || localBusy}>
            ← Back
          </R365Button>
        ) : null}
        <R365Button onClick={() => run(complete)} disabled={!canComplete}>
          Complete
        </R365Button>
        <R365Button variant="ghost" onClick={() => run(skip)} disabled={busy || localBusy}>
          Skip (blocks publish)
        </R365Button>
      </div>

      {error || localError ? <p className="text-sm text-red-300">{error || localError}</p> : null}

      <LibraryImagePickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={pickFromLibrary} />
    </div>
  );
}
