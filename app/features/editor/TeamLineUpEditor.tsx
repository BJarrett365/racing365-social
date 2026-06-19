"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { applyTemplateWithPreferences } from "@/app/features/content/content-generator";
import { buildTeamLineUpAiCaption } from "@/app/lib/match-report/parse-sport365-lineups";
import { TEAM_LINE_UP_BRAND_STYLES } from "@/app/lib/team-line-up/brand-styles";
import { layoutStartersFromFormation } from "@/app/lib/team-line-up/formation-layout";
import { sideColorsFromKit } from "@/app/lib/team-line-up/kit-database";
import { sport365ImportToTeamLineUpBundle } from "@/app/lib/team-line-up/build-bundle";
import type {
  FootballLineupStarter,
  GeneratedContent,
  TeamLineUpBrandStyle,
  TeamLineUpBundle,
  TeamLineUpExportAspect,
  TeamLineUpTeamView,
} from "@/types";

const FORMATIONS = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "3-4-3", "5-3-2", "4-1-4-1"] as const;
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

function bundleFromContent(content: GeneratedContent): TeamLineUpBundle | null {
  const ts = content.templateSource;
  if (!ts || ts.format !== "team-line-up") return null;
  return ts.bundle;
}

function relayoutSide(
  side: TeamLineUpBundle["home"],
  formation: string,
): TeamLineUpBundle["home"] {
  const players = side.starters.map((s, i) => ({
    n: s.n,
    name: s.name,
    gk: s.gk,
    a_pos: i + 1,
  }));
  return {
    ...side,
    formation,
    starters: layoutStartersFromFormation(formation, players),
  };
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
              <th className={thClass}>GK</th>
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
                <td className="py-1 pr-1 align-middle text-center">
                  <input
                    type="checkbox"
                    checked={Boolean(r.gk)}
                    onChange={(e) => setRow(i, { gk: e.target.checked })}
                    className="h-4 w-4 accent-[#22d3ee]"
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

export function TeamLineUpEditor({
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

  const applyBundle = (next: TeamLineUpBundle) => {
    setContent((prev) =>
      applyTemplateWithPreferences(prev, { format: "team-line-up", bundle: next }),
    );
  };

  const patch = (partial: Partial<TeamLineUpBundle>) => {
    const next = { ...bundle, ...partial };
    if (partial.generateAiCaption || partial.teamView || partial.lineupStatus) {
      const side = next.teamView === "away" ? "away" : "home";
      next.aiCaption = buildTeamLineUpAiCaption(next.home, next.away, next.lineupStatus, side);
    }
    applyBundle(next);
  };

  const patchFormation = (sideKey: "home" | "away", formation: string) => {
    const side = sideKey === "home" ? bundle.home : bundle.away;
    const nextSide = relayoutSide(side, formation);
    const colors = sideColorsFromKit(
      nextSide.name,
      sideKey === "home" ? bundle.homeKitSlot : bundle.awayKitSlot,
      { competition: bundle.competition ?? bundle.league },
    );
    patch({
      [sideKey]: { ...nextSide, ...colors },
    } as Partial<TeamLineUpBundle>);
  };

  const patchStarters = (sideKey: "home" | "away", starters: FootballLineupStarter[]) => {
    const side = sideKey === "home" ? bundle.home : bundle.away;
    patch({ [sideKey]: { ...side, starters } } as Partial<TeamLineUpBundle>);
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
      const imported = sport365ImportToTeamLineUpBundle(bundle.id, json.data as Parameters<typeof sport365ImportToTeamLineUpBundle>[1], bundle.brandStyle);
      applyBundle({
        ...imported,
        teamView: bundle.teamView,
        exportAspect: bundle.exportAspect,
        introLine: bundle.introLine,
        outroLine: bundle.outroLine,
        sceneEdits: bundle.sceneEdits,
        generateAiCaption: bundle.generateAiCaption,
      });
    } catch (e) {
      setReimportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setReimportBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#1f2d26] bg-[#0a0e0c]/80 p-4">
      <h3 className="text-sm font-bold text-[#eab308]">Team Line-Up controls</h3>
      <div className="grid gap-3 sm:grid-cols-2">
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
            onChange={(e) => patch({ teamView: e.target.value as TeamLineUpTeamView })}
          >
            <option value="home">Intro · Home · Outro</option>
            <option value="away">Intro · Away · Outro</option>
            <option value="both">Intro · Home · Away · Combined · Outro</option>
          </select>
        </label>
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
              patch({ lineupStatus: e.target.value as TeamLineUpBundle["lineupStatus"] })
            }
          >
            <option value="predicted">Predicted</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>{bundle.home.name} formation</span>
          <select
            className={selectClass}
            value={bundle.home.formation}
            onChange={(e) => patchFormation("home", e.target.value)}
          >
            {FORMATIONS.map((f) => (
              <option key={`h-${f}`} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>{bundle.away.name} formation</span>
          <select
            className={selectClass}
            value={bundle.away.formation}
            onChange={(e) => patchFormation("away", e.target.value)}
          >
            {FORMATIONS.map((f) => (
              <option key={`a-${f}`} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Intro slide line</span>
          <input
            className={inputClass}
            value={bundle.introLine ?? "Line-ups"}
            onChange={(e) => patch({ introLine: e.target.value })}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Outro slide line</span>
          <input
            className={inputClass}
            value={bundle.outroLine ?? ""}
            placeholder="For more coverage, head to SPORT365"
            onChange={(e) => patch({ outroLine: e.target.value })}
          />
        </label>
      </div>

      <StarterTable
        title={`${bundle.home.name} starters (${bundle.home.formation})`}
        rows={bundle.home.starters}
        onChange={(next) => patchStarters("home", next)}
        onAdd={() =>
          patchStarters("home", [
            ...bundle.home.starters,
            { n: 0, name: "", x: 50, y: 50 },
          ])
        }
        onRemove={(i) => patchStarters("home", bundle.home.starters.filter((_, j) => j !== i))}
      />
      <StarterTable
        title={`${bundle.away.name} starters (${bundle.away.formation})`}
        rows={bundle.away.starters}
        onChange={(next) => patchStarters("away", next)}
        onAdd={() =>
          patchStarters("away", [
            ...bundle.away.starters,
            { n: 0, name: "", x: 50, y: 50 },
          ])
        }
        onRemove={(i) => patchStarters("away", bundle.away.starters.filter((_, j) => j !== i))}
      />

      <div className="rounded-lg border border-[#1f2d26] bg-black/40 p-3">
        <p className="text-xs font-bold text-[#22d3ee]">Re-import from Sport365</p>
        <p className="mt-1 text-xs text-slate-500">
          Refresh formations and line-ups from Match Centre. Your intro/outro and export settings are kept.
        </p>
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
      <p className="text-xs text-slate-500">
        Match: {bundle.home.name} vs {bundle.away.name} · Kits {bundle.homeKitSlot}/{bundle.awayKitSlot}
        {bundle.sourceUrl ? (
          <>
            {" "}
            ·{" "}
            <a href={bundle.sourceUrl} className="text-[#38bdf8] hover:underline" target="_blank" rel="noreferrer">
              Sport365 source
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}
