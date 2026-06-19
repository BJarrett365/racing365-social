"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { applyTemplateWithPreferences } from "@/app/features/content/content-generator";
import { buildScoreLineCaption, displayScoreLineStatus } from "@/app/lib/score-line/build-bundle";
import { TEAM_LINE_UP_BRAND_STYLES } from "@/app/lib/team-line-up/brand-styles";
import type {
  GeneratedContent,
  ScoreLineBundle,
  Sport365MatchContext,
  TeamLineUpBrandStyle,
  TeamLineUpExportAspect,
} from "@/types";

const EXPORT_ASPECTS: { id: TeamLineUpExportAspect; label: string }[] = [
  { id: "landscape", label: "Landscape 1920×1080" },
  { id: "portrait", label: "Social portrait 1080×1350" },
  { id: "story", label: "Story 1080×1920" },
  { id: "social", label: "Social 1080×1350" },
];

const inputClass =
  "w-full rounded border border-[#1f2d26] bg-[#0a0e0c] px-2 py-1.5 text-sm text-white";
const selectClass = `${inputClass} cursor-pointer [color-scheme:dark]`;
const labelClass = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";
const btnGhostSm =
  "rounded border border-[#1f2d26] px-2 py-1 text-xs text-slate-300 hover:border-[#22d3ee]/50";

function bundleFromContent(content: GeneratedContent): ScoreLineBundle | null {
  const ts = content.templateSource;
  if (!ts || ts.format !== "score-line") return null;
  return ts.bundle;
}

export function ScoreLineEditor({
  content,
  setContent,
}: {
  content: GeneratedContent;
  setContent: Dispatch<SetStateAction<GeneratedContent | null>>;
}) {
  const bundle = bundleFromContent(content);
  const [reimportUrl, setReimportUrl] = useState(bundle?.sourceUrl ?? "");
  const [reimportBusy, setReimportBusy] = useState(false);
  const [reimportError, setReimportError] = useState<string | null>(null);

  if (!bundle) return null;

  const applyBundle = (next: ScoreLineBundle) => {
    setContent((prev) =>
      applyTemplateWithPreferences(prev, { format: "score-line", bundle: next }),
    );
  };

  const patch = (partial: Partial<ScoreLineBundle>) => {
    const next = { ...bundle, ...partial };
    if (partial.matchContext || partial.generateAiCaption) {
      next.aiCaption = buildScoreLineCaption(next.matchContext);
    }
    applyBundle(next);
  };

  const patchMatch = (partial: Partial<Sport365MatchContext>) => {
    patch({ matchContext: { ...bundle.matchContext, ...partial } });
  };

  const reimportFromSport365 = async () => {
    setReimportBusy(true);
    setReimportError(null);
    try {
      const res = await fetch("/api/import/planet-football/match-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: reimportUrl.trim() }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        matchContext?: Sport365MatchContext;
      };
      if (!res.ok || !json.success || !json.matchContext) {
        throw new Error(json.error || "Import failed");
      }
      applyBundle({
        ...bundle,
        sourceUrl: reimportUrl.trim(),
        matchContext: json.matchContext,
        statusDisplay: displayScoreLineStatus(json.matchContext.statusLabel, json.matchContext.status),
        aiCaption: buildScoreLineCaption(json.matchContext),
      });
    } catch (e) {
      setReimportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setReimportBusy(false);
    }
  };

  const ctx = bundle.matchContext;
  const statusDisplay =
    bundle.statusDisplay?.trim() ||
    displayScoreLineStatus(ctx.statusLabel, ctx.status);

  return (
    <div className="space-y-4 rounded-xl border border-[#1f2d26] bg-[#0a0e0c]/80 p-4">
      <h3 className="text-sm font-bold text-[#eab308]">Score Line controls</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Brand</span>
          <select
            className={selectClass}
            value={bundle.brandStyle}
            onChange={(e) => patch({ brandStyle: e.target.value as TeamLineUpBrandStyle })}
          >
            {TEAM_LINE_UP_BRAND_STYLES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Export size</span>
          <select
            className={selectClass}
            value={bundle.exportAspect ?? "portrait"}
            onChange={(e) => patch({ exportAspect: e.target.value as TeamLineUpExportAspect })}
          >
            {EXPORT_ASPECTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Status ribbon</span>
          <input
            className={inputClass}
            value={statusDisplay}
            onChange={(e) => patch({ statusDisplay: e.target.value })}
            placeholder="FULL TIME"
          />
        </label>
        <label className="block">
          <span className={labelClass}>Home score</span>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={ctx.homeScore}
            onChange={(e) => patchMatch({ homeScore: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Away score</span>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={ctx.awayScore}
            onChange={(e) => patchMatch({ awayScore: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Competition</span>
          <input
            className={inputClass}
            value={bundle.competition ?? ""}
            onChange={(e) => patch({ competition: e.target.value })}
          />
        </label>
      </div>

      <div className="rounded-lg border border-[#1f2d26] bg-black/40 p-3">
        <p className="text-xs font-bold text-[#22d3ee]">Re-import from Sport365</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className={`${inputClass} min-w-0 flex-1`}
            value={reimportUrl}
            onChange={(e) => setReimportUrl(e.target.value)}
            placeholder="https://www.sport365.com/football/..."
          />
          <button
            type="button"
            className={btnGhostSm}
            disabled={reimportBusy || !reimportUrl.trim()}
            onClick={() => void reimportFromSport365()}
          >
            {reimportBusy ? "Importing…" : "Refresh score"}
          </button>
        </div>
        {reimportError ? <p className="mt-2 text-xs text-red-400">{reimportError}</p> : null}
        <p className="mt-2 text-[10px] text-slate-500">
          Upload a hero player image via Background image in the editor panel.
        </p>
      </div>
    </div>
  );
}
