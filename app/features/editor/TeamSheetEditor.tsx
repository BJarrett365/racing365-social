"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { applyTemplateWithPreferences } from "@/app/features/content/content-generator";
import { buildTeamLineUpAiCaption } from "@/app/lib/match-report/parse-sport365-lineups";
import { TEAM_LINE_UP_BRAND_STYLES } from "@/app/lib/team-line-up/brand-styles";
import { sport365ImportToTeamSheetBundle } from "@/app/lib/team-sheet/build-bundle";
import { TEAM_SHEET_VARIANTS } from "@/app/lib/team-sheet/build-bundle";
import type {
  FootballLineupStarter,
  GeneratedContent,
  TeamLineUpBrandStyle,
  TeamLineUpExportAspect,
  TeamLineUpTeamView,
  TeamSheetBundle,
  TeamSheetVariant,
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
const thClass = "pb-1 pr-1 font-semibold text-slate-500";

function bundleFromContent(content: GeneratedContent): TeamSheetBundle | null {
  const ts = content.templateSource;
  if (!ts || ts.format !== "team-sheet") return null;
  return ts.bundle;
}

function StarterTable({
  title,
  rows,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  rows: FootballLineupStarter[];
  onChange: (next: FootballLineupStarter[]) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  const setRow = (i: number, patch: Partial<FootballLineupStarter>) => {
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  return (
    <div className="rounded-lg border border-[#1f2d26] bg-black/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#22d3ee]">{title}</p>
        <button type="button" className={btnGhostSm} onClick={onAdd}>
          + Add player
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className={thClass}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Surname</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#1f2d26]/80">
                <td className="py-1 pr-1 align-top">
                  <input
                    type="number"
                    className={`${inputClass} w-12`}
                    value={Number.isFinite(r.n) ? r.n : 0}
                    onChange={(e) => setRow(i, { n: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="text"
                    className={inputClass}
                    value={r.name}
                    placeholder="Player name"
                    onChange={(e) => setRow(i, { name: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="text"
                    className={`${inputClass} min-w-[72px]`}
                    value={r.surname ?? ""}
                    placeholder="auto"
                    onChange={(e) => setRow(i, { surname: e.target.value })}
                  />
                </td>
                <td className="py-1 align-top">
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:underline"
                    onClick={() => onRemove(i)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TeamSheetEditor({
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

  const applyBundle = (next: TeamSheetBundle) => {
    setContent((prev) =>
      applyTemplateWithPreferences(prev, { format: "team-sheet", bundle: next }),
    );
  };

  const patch = (partial: Partial<TeamSheetBundle>) => {
    const next = { ...bundle, ...partial };
    if (partial.generateAiCaption || partial.teamView || partial.lineupStatus) {
      const side = next.teamView === "away" ? "away" : "home";
      next.aiCaption = buildTeamLineUpAiCaption(next.home, next.away, next.lineupStatus, side);
    }
    applyBundle(next);
  };

  const patchStarters = (sideKey: "home" | "away", starters: FootballLineupStarter[]) => {
    const side = sideKey === "home" ? bundle.home : bundle.away;
    patch({ [sideKey]: { ...side, starters } } as Partial<TeamSheetBundle>);
  };

  const reimportFromSport365 = async () => {
    setReimportBusy(true);
    setReimportError(null);
    try {
      const res = await fetch("/api/import/team-line-up/sport365", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: reimportUrl.trim() }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; data?: unknown };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "Import failed");
      }
      const imported = sport365ImportToTeamSheetBundle(
        bundle.id,
        json.data as Parameters<typeof sport365ImportToTeamSheetBundle>[1],
        bundle.brandStyle,
        { sheetVariant: bundle.sheetVariant, teamView: bundle.teamView },
      );
      applyBundle({
        ...imported,
        exportAspect: bundle.exportAspect,
        heroPlayerName: bundle.heroPlayerName,
        sceneEdits: bundle.sceneEdits,
        generateAiCaption: bundle.generateAiCaption,
      });
    } catch (e) {
      setReimportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setReimportBusy(false);
    }
  };

  const showHeroField =
    bundle.sheetVariant === "standard" ||
    bundle.sheetVariant === "split" ||
    bundle.sheetVariant === "hero";

  return (
    <div className="space-y-4 rounded-xl border border-[#1f2d26] bg-[#0a0e0c]/80 p-4">
      <h3 className="text-sm font-bold text-[#eab308]">Team Sheet controls</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelClass}>Layout</span>
          <select
            className={selectClass}
            value={bundle.sheetVariant}
            onChange={(e) => {
              const sheetVariant = e.target.value as TeamSheetVariant;
              patch({
                sheetVariant,
                ...(sheetVariant === "combined" ? { teamView: "both" as TeamLineUpTeamView } : {}),
              });
            }}
          >
            {TEAM_SHEET_VARIANTS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Brand style</span>
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
          <span className={labelClass}>Team view</span>
          <select
            className={selectClass}
            value={bundle.teamView}
            disabled={bundle.sheetVariant === "combined"}
            onChange={(e) => patch({ teamView: e.target.value as TeamLineUpTeamView })}
          >
            <option value="home">Home team sheet</option>
            <option value="away">Away team sheet</option>
            <option value="both">Home + away sheets</option>
          </select>
        </label>
        {showHeroField ? (
          <label className="block sm:col-span-2">
            <span className={labelClass}>Featured player</span>
            <input
              className={inputClass}
              value={bundle.heroPlayerName ?? ""}
              placeholder="Auto-picks main striker if blank"
              onChange={(e) => patch({ heroPlayerName: e.target.value })}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Upload a player image via Background image in the preview panel.
            </p>
          </label>
        ) : null}
        <label className="block">
          <span className={labelClass}>Export aspect</span>
          <select
            className={selectClass}
            value={bundle.exportAspect}
            onChange={(e) => patch({ exportAspect: e.target.value as TeamLineUpExportAspect })}
          >
            {EXPORT_ASPECTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Line-up status</span>
          <select
            className={selectClass}
            value={bundle.lineupStatus}
            onChange={(e) =>
              patch({ lineupStatus: e.target.value as TeamSheetBundle["lineupStatus"] })
            }
          >
            <option value="predicted">Predicted</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </label>
      </div>

      <StarterTable
        title={`${bundle.home.name} starting XI`}
        rows={bundle.home.starters}
        onChange={(next) => patchStarters("home", next)}
        onAdd={() =>
          patchStarters("home", [...bundle.home.starters, { n: 0, name: "", x: 50, y: 50 }])
        }
        onRemove={(i) => patchStarters("home", bundle.home.starters.filter((_, j) => j !== i))}
      />
      <StarterTable
        title={`${bundle.away.name} starting XI`}
        rows={bundle.away.starters}
        onChange={(next) => patchStarters("away", next)}
        onAdd={() =>
          patchStarters("away", [...bundle.away.starters, { n: 0, name: "", x: 50, y: 50 }])
        }
        onRemove={(i) => patchStarters("away", bundle.away.starters.filter((_, j) => j !== i))}
      />

      <div className="rounded-lg border border-[#1f2d26] bg-black/40 p-3">
        <p className="text-xs font-bold text-[#22d3ee]">Re-import from Sport365</p>
        {reimportError ? <p className="mt-2 text-xs text-red-400">{reimportError}</p> : null}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className={inputClass}
            value={reimportUrl}
            onChange={(e) => setReimportUrl(e.target.value)}
            placeholder="Sport365 match URL"
          />
          <button
            type="button"
            className={`${btnGhostSm} shrink-0 px-3 py-2`}
            disabled={reimportBusy || !reimportUrl.trim()}
            onClick={() => void reimportFromSport365()}
          >
            {reimportBusy ? "Importing…" : "Re-import"}
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={bundle.generateAiCaption ?? false}
          onChange={(e) => patch({ generateAiCaption: e.target.checked })}
        />
        Generate AI caption for social
      </label>
      {bundle.generateAiCaption ? (
        <label className="block">
          <span className={labelClass}>Social caption</span>
          <textarea
            className={`${inputClass} min-h-[96px]`}
            value={bundle.aiCaption ?? ""}
            onChange={(e) => patch({ aiCaption: e.target.value })}
          />
        </label>
      ) : null}
    </div>
  );
}
