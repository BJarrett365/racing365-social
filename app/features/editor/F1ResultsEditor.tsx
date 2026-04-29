"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { R365Button } from "@/app/components/R365Button";
import { applyTemplateWithPreferences } from "@/app/features/content/content-generator";
import { EditorCollapsible } from "@/app/features/editor/EditorCollapsible";
import type { F1ResultsBundle, GeneratedContent, TemplateSource } from "@/types";

const input =
  "w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-2 py-1.5 text-sm text-white";
const label = "block text-[10px] font-semibold uppercase tracking-wide text-slate-500";

type Props = {
  bundle: F1ResultsBundle;
  content: GeneratedContent;
  setContent: Dispatch<SetStateAction<GeneratedContent | null>>;
  onAfterTemplateCommit?: () => void;
  templateSectionUnstyled?: boolean;
};

function commit(
  setContent: Dispatch<SetStateAction<GeneratedContent | null>>,
  prev: GeneratedContent | null,
  bundle: F1ResultsBundle,
  onAfter?: () => void,
) {
  const source: TemplateSource = { format: "f1-results", bundle };
  setContent(applyTemplateWithPreferences(prev, source));
  onAfter?.();
}

function mergePlanetF1ResultsImport(current: F1ResultsBundle, imported: F1ResultsBundle): F1ResultsBundle {
  return {
    ...imported,
    id: current.id,
    footerBrand: current.footerBrand,
    logoUrl: current.logoUrl,
    backgroundImageRel: current.backgroundImageRel,
    backgroundImageRelBySceneId: current.backgroundImageRelBySceneId,
    backgroundVideoRel: current.backgroundVideoRel,
    motionBackdropOpaqueOpacity: current.motionBackdropOpaqueOpacity,
    motionBackdropDimStrength: current.motionBackdropDimStrength,
    burnSubtitles: current.burnSubtitles,
    sceneEdits: current.sceneEdits,
  };
}

export function F1ResultsEditor({
  bundle,
  content,
  setContent,
  onAfterTemplateCommit,
  templateSectionUnstyled = false,
}: Props) {
  const push = (next: F1ResultsBundle) => {
    commit(setContent, content, next, onAfterTemplateCommit);
  };

  const [planetUrl, setPlanetUrl] = useState(
    "https://www.planetf1.com/results/japanese-grand-prix",
  );
  const [planetBusy, setPlanetBusy] = useState(false);
  const [planetErr, setPlanetErr] = useState<string | null>(null);

  const importFromPlanetF1 = async () => {
    setPlanetBusy(true);
    setPlanetErr(null);
    try {
      const res = await fetch("/api/planetf1-f1-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: planetUrl.trim(), mode: "race" }),
      });
      const json = (await res.json()) as { ok?: boolean; bundle?: F1ResultsBundle; error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Import failed");
      }
      if (!json.bundle) {
        throw new Error("No bundle in response");
      }
      push(mergePlanetF1ResultsImport(bundle, json.bundle));
    } catch (e) {
      setPlanetErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setPlanetBusy(false);
    }
  };

  const addDriver = () => {
    const nextPos =
      bundle.drivers.reduce((m, d) => (d.position > m ? d.position : m), 0) + 1;
    push({
      ...bundle,
      drivers: [
        ...bundle.drivers,
        {
          position: nextPos,
          name: "NEW DRIVER",
          team: "TEAM",
          time: "—",
          stops: 1,
          teamColor: "#64748b",
        },
      ],
    });
  };

  const removeDriver = (index: number) => {
    push({ ...bundle, drivers: bundle.drivers.filter((_, i) => i !== index) });
  };

  const sortedDrivers = useMemo(
    () => [...bundle.drivers].sort((a, b) => a.position - b.position),
    [bundle.drivers],
  );

  const reorderDriver = (sortedIndex: number, direction: -1 | 1) => {
    const sorted = [...bundle.drivers].sort((a, b) => a.position - b.position);
    const j = sortedIndex + direction;
    if (j < 0 || j >= sorted.length) return;
    const next = [...sorted];
    [next[sortedIndex], next[j]] = [next[j]!, next[sortedIndex]!];
    const renumbered = next.map((d, idx) => ({ ...d, position: idx + 1 }));
    push({ ...bundle, drivers: renumbered });
  };

  const patchDriver = (position: number, patch: Partial<(typeof sortedDrivers)[0]>) => {
    const drivers = [...bundle.drivers];
    const idx = drivers.findIndex((row) => row.position === position);
    if (idx < 0) return;
    drivers[idx] = { ...drivers[idx]!, ...patch };
    push({ ...bundle, drivers });
  };

  const per = Math.max(1, bundle.rowsPerPage ?? 11);
  const p1 = sortedDrivers.slice(0, per).length;
  const p2 = sortedDrivers.length - p1;
  const fl = bundle.fastestLap;

  return (
    <EditorCollapsible title="Template data — F1 Race Results" unstyled={templateSectionUnstyled}>
      <p className="mb-3 text-xs text-amber-200/90">
        Portrait <strong className="text-slate-300">1080×1350</strong> — intro, two results pages (
        {per} rows max per page; <strong className="text-slate-300">{p1}</strong> on page 1,{" "}
        <strong className="text-slate-300">{p2}</strong> on page 2), then outro with{" "}
        <strong className="text-slate-300">fastest lap</strong>. Use{" "}
        <strong className="text-[#eab308]">Render scenes</strong> after edits.
      </p>
      <div className="mb-4 rounded-lg border border-[#eab308]/25 bg-[#0f1411]/90 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Import from PlanetF1
        </p>
        <p className="mb-2 text-[11px] text-slate-400">
          Paste a results URL (e.g. <span className="text-slate-500">planetf1.com/results/…</span>). Imports race
          classification and fastest-lap block when available.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className={`${label} min-w-0 flex-1`}>
            PlanetF1 URL
            <input
              className={`${input} mt-1 font-mono text-[11px]`}
              value={planetUrl}
              onChange={(e) => setPlanetUrl(e.target.value)}
              placeholder="https://www.planetf1.com/results/…"
            />
          </label>
          <R365Button type="button" onClick={() => void importFromPlanetF1()} disabled={planetBusy}>
            {planetBusy ? "Importing…" : "Import results"}
          </R365Button>
        </div>
        {planetErr ? (
          <p className="mt-2 text-[11px] text-red-400" role="alert">
            {planetErr}
          </p>
        ) : null}
      </div>
      <div className="space-y-3">
        <label className={label}>
          Main title
          <input
            className={`${input} mt-1 font-bold tracking-wide`}
            value={bundle.title}
            onChange={(e) => push({ ...bundle, title: e.target.value })}
          />
        </label>
        <label className={label}>
          Subtitle (e.g. JAPANESE GP)
          <input
            className={`${input} mt-1`}
            value={bundle.subtitle}
            onChange={(e) => push({ ...bundle, subtitle: e.target.value })}
          />
        </label>
        <label className={label}>
          Rows per results slide
          <input
            type="number"
            min={6}
            max={16}
            className={`${input} mt-1 w-28`}
            value={bundle.rowsPerPage ?? 11}
            onChange={(e) => push({ ...bundle, rowsPerPage: Math.max(6, Number(e.target.value) || 11) })}
          />
        </label>
        <label className={`${label} block`}>
          Intro line (intro slide)
          <input
            className={`${input} mt-1`}
            value={bundle.introLine ?? ""}
            onChange={(e) => push({ ...bundle, introLine: e.target.value })}
            placeholder="Classification — full race results."
          />
        </label>
        <label className={`${label} block`}>
          Outro line (above fastest lap on outro slide)
          <input
            className={`${input} mt-1`}
            value={bundle.outroLine ?? ""}
            onChange={(e) => push({ ...bundle, outroLine: e.target.value })}
          />
        </label>
        <label className={label}>
          Footer brand text
          <input
            className={`${input} mt-1`}
            value={bundle.footerBrand ?? ""}
            onChange={(e) => push({ ...bundle, footerBrand: e.target.value })}
            placeholder="PLANETF1.com"
          />
        </label>
        <label className={label}>
          Logo image URL (optional)
          <input
            className={`${input} mt-1 font-mono text-xs`}
            value={bundle.logoUrl ?? ""}
            onChange={(e) => push({ ...bundle, logoUrl: e.target.value })}
            placeholder="/grid/reference/logo.png or https://…"
          />
        </label>
      </div>

      <p className={`${label} mt-6 !mb-2`}>Results ({bundle.drivers.length})</p>
      <p className="mb-2 text-[10px] text-slate-500">
        Order by position. <strong className="text-slate-400">Pos label</strong> e.g. <code className="text-slate-600">R</code> for
        retired (shown instead of position number). Use <strong className="text-slate-400">Up / Down</strong> to reorder; positions
        renumber 1–{sortedDrivers.length}.
      </p>
      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {sortedDrivers.map((d, i) => (
          <div
            key={`${d.position}-${d.name}-${i}`}
            className="rounded-lg border border-[#1f2d26] bg-[#0d1410] p-2 grid gap-2 sm:grid-cols-6"
          >
            <div className={`${label} sm:col-span-6 flex flex-wrap items-center justify-between gap-2 border-b border-[#1f2d26] pb-2`}>
              <span className="text-[11px] text-slate-400">Row {i + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Move up"
                  disabled={i === 0}
                  className="rounded border border-[#1f2d26] bg-[#121a16] px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-[#1a2620] disabled:cursor-not-allowed disabled:opacity-30"
                  onClick={() => reorderDriver(i, -1)}
                >
                  ↑ Up
                </button>
                <button
                  type="button"
                  title="Move down"
                  disabled={i >= sortedDrivers.length - 1}
                  className="rounded border border-[#1f2d26] bg-[#121a16] px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-[#1a2620] disabled:cursor-not-allowed disabled:opacity-30"
                  onClick={() => reorderDriver(i, 1)}
                >
                  ↓ Down
                </button>
              </div>
            </div>
            <label className={label}>
              Pos #
              <input
                type="number"
                className={`${input} mt-1 w-full`}
                value={d.position}
                onChange={(e) => patchDriver(d.position, { position: Number(e.target.value) || 1 })}
              />
            </label>
            <label className={label}>
              Pos label
              <input
                className={`${input} mt-1 font-mono text-xs`}
                value={d.positionLabel ?? ""}
                onChange={(e) =>
                  patchDriver(d.position, { positionLabel: e.target.value.trim() || undefined })
                }
                placeholder="R"
              />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Name
              <input
                className={`${input} mt-1`}
                value={d.name}
                onChange={(e) => patchDriver(d.position, { name: e.target.value })}
              />
            </label>
            <label className={label}>
              Team
              <input
                className={`${input} mt-1`}
                value={d.team}
                onChange={(e) => patchDriver(d.position, { team: e.target.value })}
              />
            </label>
            <label className={label}>
              Time
              <input
                className={`${input} mt-1 font-mono text-xs`}
                value={d.time}
                onChange={(e) => patchDriver(d.position, { time: e.target.value })}
              />
            </label>
            <label className={label}>
              Stops
              <input
                className={`${input} mt-1 font-mono text-xs`}
                value={d.stops}
                onChange={(e) => patchDriver(d.position, { stops: e.target.value })}
              />
            </label>
            <label className={label}>
              Team colour
              <input
                className={`${input} mt-1 font-mono text-xs`}
                value={d.teamColor}
                onChange={(e) => patchDriver(d.position, { teamColor: e.target.value })}
                placeholder="#00D2BE"
              />
            </label>
            <label className={`${label} sm:col-span-6`}>
              Headshot (URL or <code className="text-slate-500">/grid/drivers/…</code>)
              <input
                className={`${input} mt-1 font-mono text-xs`}
                value={d.image ?? ""}
                onChange={(e) => patchDriver(d.position, { image: e.target.value })}
              />
            </label>
            <div className="sm:col-span-6 flex justify-end">
              <button
                type="button"
                className="text-xs text-red-400/90 hover:underline"
                onClick={() => {
                  const idx = bundle.drivers.findIndex((row) => row.position === d.position);
                  if (idx >= 0) removeDriver(idx);
                }}
              >
                Remove row
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 w-full rounded-lg border border-[#22c55e]/40 bg-[#14532d]/25 px-3 py-2 text-sm font-semibold text-[#86efac] hover:bg-[#14532d]/45"
        onClick={() => addDriver()}
      >
        + Add driver
      </button>

      <p className={`${label} mt-8 !mb-2`}>Fastest lap (outro slide)</p>
      <div className="space-y-2 rounded-lg border border-[#1f2d26] bg-[#0d1410] p-3">
        <label className={label}>
          Driver name
          <input
            className={`${input} mt-1`}
            value={fl.driverName}
            onChange={(e) => push({ ...bundle, fastestLap: { ...fl, driverName: e.target.value } })}
          />
        </label>
        <label className={label}>
          Team
          <input
            className={`${input} mt-1`}
            value={fl.team}
            onChange={(e) => push({ ...bundle, fastestLap: { ...fl, team: e.target.value } })}
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className={label}>
            Time
            <input
              className={`${input} mt-1 font-mono text-xs`}
              value={fl.time}
              onChange={(e) => push({ ...bundle, fastestLap: { ...fl, time: e.target.value } })}
            />
          </label>
          <label className={label}>
            Stops
            <input
              className={`${input} mt-1 font-mono text-xs`}
              value={fl.stops}
              onChange={(e) => push({ ...bundle, fastestLap: { ...fl, stops: e.target.value } })}
            />
          </label>
          <label className={label}>
            Team colour
            <input
              className={`${input} mt-1 font-mono text-xs`}
              value={fl.teamColor}
              onChange={(e) => push({ ...bundle, fastestLap: { ...fl, teamColor: e.target.value } })}
            />
          </label>
        </div>
        <label className={label}>
          Headshot (optional)
          <input
            className={`${input} mt-1 font-mono text-xs`}
            value={fl.image ?? ""}
            onChange={(e) => push({ ...bundle, fastestLap: { ...fl, image: e.target.value } })}
          />
        </label>
      </div>
    </EditorCollapsible>
  );
}
