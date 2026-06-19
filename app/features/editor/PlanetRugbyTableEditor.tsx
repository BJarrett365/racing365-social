"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { applyTemplateWithPreferences } from "@/app/features/content/content-generator";
import { EditorCollapsible } from "@/app/features/editor/EditorCollapsible";
import { PLANET_FOOTBALL_TABLE_VIEWS, type PlanetFootballTableViewId } from "@/app/lib/planet-football-table-views";
import {
  applySport365CardContentMode,
  SPORT365_CARD_CONTENT_OPTIONS,
  sport365CardContentModeFromBundle,
  type Sport365CardContentMode,
} from "@/app/lib/sport365-card-content-mode";
import { hasLegacySport365ScorerRows, sanitizeSport365Scorers } from "@/app/lib/match-report/parse-sport365-match-page-summary";
import {
  PLANET_FOOTBALL_DISPLAY_BRANDS,
  leagueTableBrandAccentColor,
  normalizePlanetFootballDisplayBrand,
  planetFootballBrandDefaults,
} from "@/app/lib/planet-football-table-brands";
import type {
  GeneratedContent,
  PlanetFootballDisplayBrand,
  PlanetFootballTableBundle,
  PlanetRugbyTableBackgroundStyle,
  PlanetRugbyTableBundle,
  PlanetRugbyTableColumnKey,
  PlanetRugbyTableDisplayMode,
  PlanetRugbyTablePosition,
  PlanetRugbyTemplateStyle,
  TemplateSource,
} from "@/types";

const input = "w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-2 py-1.5 text-sm text-white";
const label = "block text-[10px] font-semibold uppercase tracking-wide text-slate-500";
const COLUMN_OPTIONS: { key: PlanetRugbyTableColumnKey; label: string }[] = [
  { key: "position", label: "#" },
  { key: "team", label: "TEAM" },
  { key: "played", label: "P" },
  { key: "won", label: "W" },
  { key: "drawn", label: "D" },
  { key: "lost", label: "L" },
  { key: "pointsDifference", label: "PD" },
  { key: "points", label: "PTS" },
];
const BACKGROUND_OPTIONS: {
  value: PlanetRugbyTableBackgroundStyle;
  label: string;
  opacity: number;
}[] = [
  { value: "solid", label: "Solid", opacity: 0.82 },
  { value: "balanced", label: "Balanced", opacity: 0.58 },
  { value: "clear", label: "Clear", opacity: 0.32 },
];
type Props = {
  bundle: PlanetRugbyTableBundle;
  content: GeneratedContent;
  setContent: Dispatch<SetStateAction<GeneratedContent | null>>;
  onAfterTemplateCommit?: () => void;
  onSaveBrowserDraft?: () => void;
  templateSectionUnstyled?: boolean;
  brand?: "rugby" | "football";
};

function commit(
  setContent: Dispatch<SetStateAction<GeneratedContent | null>>,
  bundle: PlanetRugbyTableBundle,
  brand: "rugby" | "football",
  onAfter?: () => void,
) {
  const source: TemplateSource =
    brand === "football"
      ? { format: "planet-football-table", bundle: bundle as unknown as PlanetFootballTableBundle }
      : { format: "planet-rugby-table", bundle: bundle as PlanetRugbyTableBundle };
  setContent((prev) => applyTemplateWithPreferences(prev, source));
  onAfter?.();
}

export function PlanetRugbyTableEditor({
  bundle,
  setContent,
  onAfterTemplateCommit,
  onSaveBrowserDraft,
  templateSectionUnstyled = false,
  brand = "rugby",
}: Props) {
  const brandName = brand === "football" ? "Sport365" : "Planet Rugby";
  const defaultImportUrl =
    brand === "football"
      ? "https://www.sport365.com/football/world-cup/group-stage/usa-vs-paraguay/1-4109485"
      : "https://www.planetrugby.com/tournament/premiership/table";
  const importRoute = brand === "football" ? "/api/import/planet-football/table" : "/api/import/planet-rugby/table";
  const push = (next: PlanetRugbyTableBundle) => commit(setContent, next, brand, onAfterTemplateCommit);
  const applyStylePreset = (nextStyle: PlanetRugbyTemplateStyle) => {
    if (nextStyle === "bottom-four") {
      push({
        ...bundle,
        tableStyle: nextStyle,
        tableMode: "bottom-battle",
        bottomRows: 4,
        tablePosition: "bottom-left",
      });
      return;
    }
    if (nextStyle === "top-five") {
      push({
        ...bundle,
        tableStyle: nextStyle,
        tableMode: "top-half",
        tablePosition: "middle-left",
      });
      return;
    }
    if (nextStyle === "full-block-background") {
      push({
        ...bundle,
        tableStyle: nextStyle,
        tableMode: "full-table",
        tablePosition: "bottom-left",
      });
      return;
    }
    push({ ...bundle, tableStyle: nextStyle });
  };
  const applyBackgroundStyle = (nextStyle: PlanetRugbyTableBackgroundStyle) => {
    const preset = BACKGROUND_OPTIONS.find((option) => option.value === nextStyle);
    push({
      ...bundle,
      tableBackgroundStyle: nextStyle,
      tablePanelOpacity: preset?.opacity ?? bundle.tablePanelOpacity ?? 0.58,
    });
  };
  const [importUrl, setImportUrl] = useState(bundle.table.sourceUrl || defaultImportUrl);
  const [footballTableView, setFootballTableView] = useState<PlanetFootballTableViewId>(PLANET_FOOTBALL_TABLE_VIEWS[0]!.id);
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);

  const footballBundle = brand === "football" ? (bundle as unknown as PlanetFootballTableBundle) : null;
  const groupTables = footballBundle?.groupTables ?? [];
  const matchBackfillAttempted = useRef<string | null>(null);

  const applyFootballMatchContext = (matchContext: PlanetFootballTableBundle["matchContext"], sourceUrl?: string) => {
    if (!matchContext?.homeTeam) return;
    const fb = bundle as unknown as PlanetFootballTableBundle;
    const withMatch: PlanetFootballTableBundle = {
      ...fb,
      displayBrand: normalizePlanetFootballDisplayBrand(fb.displayBrand),
      highlightColor: fb.highlightColor ?? planetFootballBrandDefaults(normalizePlanetFootballDisplayBrand(fb.displayBrand)).highlightColor,
      matchContext: {
        ...matchContext,
        scorers: sanitizeSport365Scorers(matchContext.scorers ?? []),
      },
      includeCommentaryInAi: fb.includeCommentaryInAi ?? true,
      brandLogoScale: fb.brandLogoScale ?? 1.85,
      table: {
        ...(fb.table as PlanetFootballTableBundle["table"]),
        sourceUrl: sourceUrl?.trim() || fb.table.sourceUrl,
      },
    };
    push(
      applySport365CardContentMode(
        withMatch,
        sport365CardContentModeFromBundle(withMatch),
      ) as unknown as PlanetRugbyTableBundle,
    );
  };

  const loadMatchSummary = async (url: string) => {
    setImportBusy(true);
    setImportErr(null);
    try {
      const res = await fetch("/api/import/planet-football/match-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        matchContext?: PlanetFootballTableBundle["matchContext"];
      };
      if (!res.ok || !json.success || !json.matchContext) {
        throw new Error(json.error || "Could not load match score");
      }
      applyFootballMatchContext(json.matchContext, url);
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : "Could not load match score");
    } finally {
      setImportBusy(false);
    }
  };

  useEffect(() => {
    if (brand !== "football") return;
    const url = (importUrl || footballBundle?.table.sourceUrl || "").trim();
    if (!/-vs-/i.test(url)) return;
    const hasMatch = Boolean(footballBundle?.matchContext?.homeTeam);
    const needsLegacyRepair = hasLegacySport365ScorerRows(footballBundle?.matchContext?.scorers ?? []);
    if (hasMatch && !needsLegacyRepair) return;
    const key = `${needsLegacyRepair ? "legacy" : "missing"}:${footballBundle?.id ?? "new"}:${url}`;
    if (matchBackfillAttempted.current === key) return;
    matchBackfillAttempted.current = key;

    let cancelled = false;
    void (async () => {
      setImportBusy(true);
      setImportErr(null);
      try {
        const res = await fetch("/api/import/planet-football/match-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          error?: string;
          matchContext?: PlanetFootballTableBundle["matchContext"];
        };
        if (cancelled) return;
        if (!res.ok || !json.success || !json.matchContext) {
          throw new Error(json.error || "Could not load match score");
        }
        applyFootballMatchContext(json.matchContext, url);
      } catch (e) {
        if (!cancelled) setImportErr(e instanceof Error ? e.message : "Could not load match score");
      } finally {
        if (!cancelled) setImportBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    brand,
    footballBundle?.id,
    footballBundle?.matchContext?.homeTeam,
    footballBundle?.matchContext?.scorers,
    footballBundle?.table.sourceUrl,
    importUrl,
  ]);

  const importTable = async (selectedGroupCode?: string) => {
    setImportBusy(true);
    setImportErr(null);
    try {
      const res = await fetch(importRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: importUrl.trim(),
          tableView: brand === "football" ? footballTableView : undefined,
          ...(selectedGroupCode ? { selectedGroupCode } : {}),
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: PlanetRugbyTableBundle["table"];
        groupTables?: PlanetFootballTableBundle["groupTables"];
        selectedGroupCode?: string;
        matchContext?: PlanetFootballTableBundle["matchContext"];
      };
      if (!res.ok || !json.success || !json.data) throw new Error(json.error || "Import failed");
      const tableData = json.data as unknown as PlanetFootballTableBundle["table"];
      const hasMatch = Boolean(json.matchContext?.homeTeam);
      const fb = brand === "football" ? (bundle as unknown as PlanetFootballTableBundle) : null;
      const currentDisplay = normalizePlanetFootballDisplayBrand(fb?.displayBrand);
      const brandDefaults = planetFootballBrandDefaults(currentDisplay);
      const withFootballFields =
        brand === "football"
          ? applySport365CardContentMode(
              {
                ...(bundle as unknown as PlanetFootballTableBundle),
                displayBrand: currentDisplay,
                groupTables: json.groupTables,
                selectedGroupCode: json.selectedGroupCode ?? tableData.groupCode,
                highlightColor: fb?.highlightColor ?? brandDefaults.highlightColor,
                matchContext: json.matchContext ?? fb?.matchContext,
                includeCommentaryInAi: fb?.includeCommentaryInAi ?? true,
                brandLogoScale: fb?.brandLogoScale ?? 1.85,
                table: { ...tableData, sourceUrl: importUrl.trim() || tableData.sourceUrl },
              },
              hasMatch || fb?.matchContext
                ? sport365CardContentModeFromBundle({
                    ...(bundle as unknown as PlanetFootballTableBundle),
                    matchContext: json.matchContext ?? fb?.matchContext,
                  })
                : "table-only",
            )
          : null;
      const nextBundle = {
        ...bundle,
        ...(withFootballFields ?? {}),
        ...(brand !== "football"
          ? {
              table: tableData,
            }
          : {}),
        headline: tableData.competition,
        outroLine: brand === "football" ? (fb?.outroLine ?? brandDefaults.outroLine) : bundle.outroLine,
      } as unknown as PlanetRugbyTableBundle;
      push(nextBundle);
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportBusy(false);
    }
  };

  const selectDisplayGroup = (groupCode: string) => {
    if (!footballBundle?.groupTables?.length) return;
    const group = footballBundle.groupTables.find((row) => row.groupCode === groupCode);
    if (!group) return;
    push({
      ...bundle,
      selectedGroupCode: groupCode,
      table: {
        ...(bundle.table as unknown as PlanetFootballTableBundle["table"]),
        groupCode,
        competition: `${group.groupName} · ${bundle.table.competition.split(" · ").pop() ?? "Sport365"}`,
        rows: group.rows,
      },
      headline: `${group.groupName} standings`,
    } as unknown as PlanetRugbyTableBundle);
  };

  const mode = (bundle.tableMode ?? "full-table") as PlanetRugbyTableDisplayMode;
  const hiddenColumns = bundle.hiddenColumns ?? [];

  const applyDisplayBrand = (nextBrand: PlanetFootballDisplayBrand) => {
    const defaults = planetFootballBrandDefaults(nextBrand);
    push({
      ...(bundle as unknown as PlanetFootballTableBundle),
      displayBrand: nextBrand,
      highlightColor: defaults.highlightColor,
      outroLine: defaults.outroLine,
      burnSubtitles: defaults.burnSubtitles,
    } as unknown as PlanetRugbyTableBundle);
  };

  const activeDisplayBrand =
    brand === "football" ? normalizePlanetFootballDisplayBrand(footballBundle?.displayBrand) : null;

  return (
    <EditorCollapsible title={`Template data — ${brandName} Table`} unstyled={templateSectionUnstyled}>
      <div className="space-y-3">
        <p className="text-xs text-amber-200/90">
          {brandName} table Shorts. Import standings from Sport365, pick a group if needed, then adjust display and styling.
        </p>
        {brand === "football" && activeDisplayBrand ? (
          <div className="rounded-lg border border-[#1f2d26] bg-black/30 p-3">
            <p className={label}>Brand style</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLANET_FOOTBALL_DISPLAY_BRANDS.map((b) => {
                const accent = leagueTableBrandAccentColor(b.id);
                const active = activeDisplayBrand === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    className="rounded-lg border px-3 py-2 text-xs font-bold transition-colors"
                    style={{
                      borderColor: active ? accent : "rgba(255,255,255,0.14)",
                      background: active ? `${accent}22` : "rgba(0,0,0,0.35)",
                      color: active ? accent : "rgba(255,255,255,0.82)",
                      boxShadow: active ? `0 0 0 1px ${accent}55` : undefined,
                    }}
                    onClick={() => applyDisplayBrand(b.id)}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] font-normal normal-case tracking-normal text-slate-500">
              Logo, accent colour, score line, table highlights, and subtitle outline follow the selected brand.
            </p>
          </div>
        ) : null}
        <div className="rounded-lg border border-[#1f2d26] bg-black/25 p-3 space-y-2">
          <label className={label}>
            Sport365 {brand === "football" ? "URL" : "table URL"}
            <input className={`${input} mt-1 font-mono text-[11px]`} value={importUrl} onChange={(e) => setImportUrl(e.target.value)} />
          </label>
          {brand === "football" && groupTables.length === 0 ? (
            <label className={label}>
              League table view (Premier League only)
              <select className={`${input} mt-1`} value={footballTableView} onChange={(e) => setFootballTableView(e.target.value as PlanetFootballTableViewId)}>
                {PLANET_FOOTBALL_TABLE_VIEWS.map((view) => (
                  <option key={view.id} value={view.id}>{view.label}</option>
                ))}
              </select>
            </label>
          ) : null}
          {brand === "football" && groupTables.length > 0 ? (
            <label className={label}>
              Display group
              <select
                className={`${input} mt-1`}
                value={
                  footballBundle?.selectedGroupCode ??
                  footballBundle?.table.groupCode ??
                  groupTables[0]?.groupCode ??
                  ""
                }
                onChange={(e) => selectDisplayGroup(e.target.value)}
              >
                {groupTables.map((group) => (
                  <option key={group.groupCode} value={group.groupCode}>
                    {group.groupName} ({group.rows.length} teams)
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <R365Button type="button" onClick={() => void importTable()} disabled={importBusy}>
            {importBusy ? "Importing from Sport365…" : "Import from Sport365"}
          </R365Button>
          {importErr ? <p className="text-xs text-red-400">{importErr}</p> : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={label}>
            Intro text
            <input
              className={`${input} mt-1`}
              value={bundle.introLine ?? ""}
              onChange={(e) => push({ ...bundle, introLine: e.target.value })}
              placeholder={`${bundle.table.competition || "Competition"} latest table`}
            />
          </label>
          <label className={label}>
            Headline
            <input className={`${input} mt-1`} value={bundle.headline ?? ""} onChange={(e) => push({ ...bundle, headline: e.target.value })} />
          </label>
          <label className={label}>
            Subtitle
            <input className={`${input} mt-1`} value={bundle.subtitle ?? ""} onChange={(e) => push({ ...bundle, subtitle: e.target.value })} />
          </label>
          <label className={label}>
            Outro text
            <input
              className={`${input} mt-1`}
              value={bundle.outroLine ?? ""}
              onChange={(e) => push({ ...bundle, outroLine: e.target.value })}
              placeholder="For more rugby coverage, head to PlanetRugby.com"
            />
          </label>
          <label className={label}>
            Template source style
            <select className={`${input} mt-1`} value={bundle.tableStyle ?? "standard-image-overlay"} onChange={(e) => applyStylePreset(e.target.value as PlanetRugbyTemplateStyle)}>
              <option value="standard-image-overlay">Standard Image Overlay</option>
              <option value="bottom-four">Bottom Four</option>
              <option value="top-five">Top Five</option>
              <option value="full-block-background">Full Block Background</option>
            </select>
          </label>
          <label className={label}>
            {brand === "football" ? "On-screen content" : "Table mode"}
            {brand === "football" ? (
              <select
                className={`${input} mt-1`}
                value={sport365CardContentModeFromBundle(footballBundle ?? (bundle as unknown as PlanetFootballTableBundle))}
                disabled={!footballBundle?.matchContext?.homeTeam}
                onChange={(e) =>
                  push(
                    applySport365CardContentMode(
                      bundle as unknown as PlanetFootballTableBundle,
                      e.target.value as Sport365CardContentMode,
                    ) as unknown as PlanetRugbyTableBundle,
                  )
                }
              >
                {SPORT365_CARD_CONTENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <select className={`${input} mt-1`} value={mode} onChange={(e) => push({ ...bundle, tableMode: e.target.value as PlanetRugbyTableDisplayMode })}>
                <option value="full-table">Full Table</option>
                <option value="top-half">Top Half</option>
                <option value="bottom-half">Bottom Half</option>
                <option value="head-to-head">Head-to-Head Team v Team</option>
                <option value="playoff-race">Playoff Race</option>
                <option value="bottom-battle">Relegation / Bottom Battle</option>
              </select>
            )}
            {brand === "football" && !footballBundle?.matchContext?.homeTeam ? (
              <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-amber-400/90">
                Import a match URL to enable score line and scorers.
              </span>
            ) : null}
          </label>
          {brand === "football" ? null : (
          <>
          <label className={label}>
            Playoff rows
            <select className={`${input} mt-1`} value={bundle.playoffRows ?? 4} onChange={(e) => push({ ...bundle, playoffRows: Number(e.target.value) as 4 | 6 | 8 })}>
              <option value={4}>Top 4</option>
              <option value={6}>Top 6</option>
              <option value={8}>Top 8</option>
            </select>
          </label>
          <label className={label}>
            Bottom battle rows
            <select className={`${input} mt-1`} value={bundle.bottomRows ?? 4} onChange={(e) => push({ ...bundle, bottomRows: Number(e.target.value) as 4 | 6 })}>
              <option value={4}>Bottom 4</option>
              <option value={6}>Bottom 6</option>
            </select>
          </label>
          <label className={label}>
            Team A
            <select className={`${input} mt-1`} value={bundle.selectedTeamA ?? ""} onChange={(e) => push({ ...bundle, selectedTeamA: e.target.value })}>
              <option value="">Select team</option>
              {bundle.table.rows.map((r) => (
                <option key={`a-${r.team}`} value={r.team}>{r.team}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Team B
            <select className={`${input} mt-1`} value={bundle.selectedTeamB ?? ""} onChange={(e) => push({ ...bundle, selectedTeamB: e.target.value })}>
              <option value="">Select team</option>
              {bundle.table.rows.map((r) => (
                <option key={`b-${r.team}`} value={r.team}>{r.team}</option>
              ))}
            </select>
          </label>
          </>
          )}
          <label className={label}>
            Highlight color
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                className="h-9 w-11 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
                value={bundle.highlightColor ?? "#f5c542"}
                onChange={(e) => push({ ...bundle, highlightColor: e.target.value })}
              />
              <input
                className={`${input} font-mono text-xs`}
                value={bundle.highlightColor ?? "#f5c542"}
                onChange={(e) => push({ ...bundle, highlightColor: e.target.value })}
                placeholder="#f5c542"
              />
            </div>
          </label>
          <label className={label}>
            Font size
            <div className="mt-1 flex items-center gap-3">
              <span className="w-12 text-xs font-semibold text-slate-300">{Math.round((bundle.fontSize ?? 1) * 100)}%</span>
              <input
                type="range"
                min={0.75}
                max={1.4}
                step={0.01}
                className="flex-1 accent-emerald-300"
                value={bundle.fontSize ?? 1}
                onChange={(e) => push({ ...bundle, fontSize: Number(e.target.value) })}
              />
            </div>
          </label>
          <label className={label}>
            Row spacing scale
            <input type="number" step={0.05} min={0.8} max={1.6} className={`${input} mt-1`} value={bundle.rowSpacing ?? 1} onChange={(e) => push({ ...bundle, rowSpacing: Number(e.target.value) || 1 })} />
          </label>
          <label className={label}>
            Table position
            <select className={`${input} mt-1`} value={bundle.tablePosition ?? "lower-left"} onChange={(e) => push({ ...bundle, tablePosition: e.target.value as PlanetRugbyTablePosition })}>
              <option value="high-left">High Left</option>
              <option value="middle-left">Middle Left</option>
              <option value="low-left">Low Left</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="high-right">High Right</option>
              <option value="middle-right">Middle Right</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="center">Center</option>
              <option value="left">Legacy Left</option>
              <option value="lower-left">Legacy Lower-left</option>
            </select>
          </label>
          <label className={label}>
            Table width
            <div className="mt-1 flex items-center gap-3">
              <span className="w-12 text-xs font-semibold text-slate-300">{Math.round(bundle.tableWidthPercent ?? 94)}%</span>
              <input
                type="range"
                min={45}
                max={100}
                step={1}
                className="flex-1 accent-emerald-300"
                value={bundle.tableWidthPercent ?? 94}
                onChange={(e) => push({ ...bundle, tableWidthPercent: Number(e.target.value) })}
              />
            </div>
          </label>
          <label className={label}>
            Table height
            <div className="mt-1 flex items-center gap-3">
              <span className="w-12 text-xs font-semibold text-slate-300">{Math.round(bundle.tableHeightPercent ?? 72)}%</span>
              <input
                type="range"
                min={28}
                max={88}
                step={1}
                className="flex-1 accent-emerald-300"
                value={bundle.tableHeightPercent ?? 72}
                onChange={(e) => push({ ...bundle, tableHeightPercent: Number(e.target.value) })}
              />
            </div>
          </label>
          <div className="rounded-lg border border-[#1f2d26] bg-black/20 p-3 sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Table background</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {BACKGROUND_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
                  <input
                    type="radio"
                    name="planet-rugby-table-background"
                    checked={(bundle.tableBackgroundStyle ?? "balanced") === option.value}
                    onChange={() => applyBackgroundStyle(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="w-20 text-xs font-semibold text-slate-300">
                {Math.round((1 - (bundle.tablePanelOpacity ?? 0.58)) * 100)}% clear
              </span>
              <input
                aria-label="Table transparency"
                type="range"
                min={0.15}
                max={0.9}
                step={0.01}
                className="flex-1 accent-emerald-300"
                value={bundle.tablePanelOpacity ?? 0.58}
                onChange={(e) => push({ ...bundle, tablePanelOpacity: Number(e.target.value) })}
              />
            </div>
          </div>
          <label className={label}>
            Overlay strength
            <div className="mt-1 flex items-center gap-3">
              <span className="w-12 text-xs font-semibold text-slate-300">{Math.round((bundle.overlayStrength ?? 0.55) * 100)}%</span>
              <input
                type="range"
                min={0.2}
                max={0.9}
                step={0.01}
                className="flex-1 accent-emerald-300"
                value={bundle.overlayStrength ?? 0.55}
                onChange={(e) => push({ ...bundle, overlayStrength: Number(e.target.value) })}
              />
            </div>
          </label>
          <label className={label}>
            Background blur
            <div className="mt-1 flex items-center gap-3">
              <span className="w-12 text-xs font-semibold text-slate-300">{Math.round(bundle.backgroundBlur ?? 0)}px</span>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                className="flex-1 accent-emerald-300"
                value={bundle.backgroundBlur ?? 0}
                onChange={(e) => push({ ...bundle, backgroundBlur: Number(e.target.value) })}
              />
            </div>
          </label>
          <label className={label}>
            Background image URL
            <input className={`${input} mt-1`} value={bundle.backgroundImageUrl ?? ""} onChange={(e) => push({ ...bundle, backgroundImageUrl: e.target.value })} />
          </label>
          <label className={`${label} flex items-center gap-2 pt-5`}>
            <input
              type="checkbox"
              checked={bundle.showLogo !== false}
              onChange={(e) => push({ ...bundle, showLogo: e.target.checked ? true : false })}
            />
            {brand === "football" ? "Show brand logo" : "Show PR corner mark"}
          </label>
          {brand === "football" ? (
            <div className="rounded-lg border border-[#1f2d26] bg-black/25 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Match result (Sport365)</p>
              {footballBundle?.matchContext ? (
                <>
                  <p className="text-sm font-semibold text-white">
                    {footballBundle.matchContext.homeTeam} {footballBundle.matchContext.homeScore}–
                    {footballBundle.matchContext.awayScore} {footballBundle.matchContext.awayTeam}
                    {footballBundle.matchContext.statusLabel || footballBundle.matchContext.status
                      ? ` · ${footballBundle.matchContext.statusLabel ?? footballBundle.matchContext.status}`
                      : ""}
                  </p>
                  {sanitizeSport365Scorers(footballBundle.matchContext.scorers).length > 0 ? (
                    <p className="text-[11px] leading-snug text-slate-400">
                      Goal scorers:{" "}
                      {sanitizeSport365Scorers(footballBundle.matchContext.scorers)
                        .map(
                          (s) =>
                            `${s.player}${s.type === "own_goal" ? " (OG)" : ""} ${s.minuteLabel}`,
                        )
                        .join(" · ")}
                    </p>
                  ) : null}
                  <p className="text-[11px] leading-snug text-slate-500">
                    Use <span className="text-slate-300">On-screen content</span> above to show the table, score line,
                    and scorers on the card.
                  </p>
                  <label className="flex items-center gap-2 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={footballBundle.includeCommentaryInAi !== false}
                      onChange={(e) =>
                        push({ ...bundle, includeCommentaryInAi: e.target.checked } as unknown as PlanetRugbyTableBundle)
                      }
                    />
                    Include commentary in AI script
                  </label>
                  <label className={label}>
                    Sport365 logo size
                    <div className="mt-1 flex items-center gap-3">
                      <span className="w-12 text-xs font-semibold text-slate-300">
                        {Math.round((footballBundle.brandLogoScale ?? 1.85) * 100)}%
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={2.5}
                        step={0.05}
                        className="flex-1 accent-emerald-300"
                        value={footballBundle.brandLogoScale ?? 1.85}
                        onChange={(e) =>
                          push({
                            ...bundle,
                            brandLogoScale: Number(e.target.value) || 1.85,
                          } as unknown as PlanetRugbyTableBundle)
                        }
                      />
                    </div>
                  </label>
                </>
              ) : (
                <>
                  <p className="text-[11px] leading-snug text-amber-400/90">
                    No match score loaded yet. Use a match URL (with <code className="text-amber-200">-vs-</code> in the
                    path) and import — score, scorers and commentary load automatically.
                  </p>
                  <R365Button type="button" variant="ghost" disabled={importBusy} onClick={() => void loadMatchSummary(importUrl)}>
                    {importBusy ? "Loading match…" : "Load match score & scorers"}
                  </R365Button>
                </>
              )}
            </div>
          ) : null}
          <label className={label}>
            Intro duration
            <input type="number" step={0.1} min={1} max={10} className={`${input} mt-1`} value={bundle.introDurationSec ?? 2.2} onChange={(e) => push({ ...bundle, introDurationSec: Number(e.target.value) || 2.2 })} />
          </label>
          <label className={label}>
            Table scene duration
            <input type="number" step={0.1} min={1} max={12} className={`${input} mt-1`} value={bundle.mainDurationSec ?? 4.6} onChange={(e) => push({ ...bundle, mainDurationSec: Number(e.target.value) || 4.6 })} />
          </label>
          <label className={label}>
            Outro duration
            <input type="number" step={0.1} min={1} max={10} className={`${input} mt-1`} value={bundle.outroDurationSec ?? 2.2} onChange={(e) => push({ ...bundle, outroDurationSec: Number(e.target.value) || 2.2 })} />
          </label>
          <label className={`${label} flex items-center gap-2 pt-5`}>
            <input type="checkbox" checked={bundle.voiceoverEnabled !== false} onChange={(e) => push({ ...bundle, voiceoverEnabled: e.target.checked })} />
            Voiceover on
          </label>
        </div>
        <div className="rounded-lg border border-[#1f2d26] bg-black/25 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Show / hide columns</p>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
              <input
                type="checkbox"
                checked={bundle.showTeamLogos !== false}
                onChange={(e) => push({ ...bundle, showTeamLogos: e.target.checked ? true : false })}
              />
              Show club crests in table
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {COLUMN_OPTIONS.map((c) => {
              const shown = !hiddenColumns.includes(c.key);
              return (
                <label key={c.key} className="flex items-center gap-1 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={shown}
                    onChange={(e) => {
                      const nextHidden = e.target.checked
                        ? hiddenColumns.filter((k) => k !== c.key)
                        : [...hiddenColumns, c.key];
                      push({ ...bundle, hiddenColumns: nextHidden });
                    }}
                  />
                  {c.label}
                </label>
              );
            })}
          </div>
        </div>
        <div className="rounded-lg border border-[#1f2d26] bg-black/25 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Table rows (manual correction)</p>
          <p className="mt-1 text-[10px] leading-snug text-slate-500">
            Values here are what renders after you click Render scenes (sorted by #). Other modes (playoff, bottom battle, etc.) still slice from this list.
          </p>
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
            {bundle.table.rows.map((r, idx) => (
              <div key={`${r.position}-${r.team}-${idx}`} className="grid grid-cols-12 gap-1">
                <input className={`${input} col-span-1`} value={r.position} onChange={(e) => {
                  const next = [...bundle.table.rows];
                  next[idx] = { ...next[idx]!, position: Number(e.target.value) || 0 };
                  push({ ...bundle, table: { ...bundle.table, rows: next } });
                }} />
                <input className={`${input} col-span-4`} value={r.team} onChange={(e) => {
                  const next = [...bundle.table.rows];
                  next[idx] = { ...next[idx]!, team: e.target.value };
                  push({ ...bundle, table: { ...bundle.table, rows: next } });
                }} />
                <input className={`${input} col-span-1`} value={r.played} onChange={(e) => {
                  const next = [...bundle.table.rows];
                  next[idx] = { ...next[idx]!, played: Number(e.target.value) || 0 };
                  push({ ...bundle, table: { ...bundle.table, rows: next } });
                }} />
                <input className={`${input} col-span-1`} value={r.won} onChange={(e) => {
                  const next = [...bundle.table.rows];
                  next[idx] = { ...next[idx]!, won: Number(e.target.value) || 0 };
                  push({ ...bundle, table: { ...bundle.table, rows: next } });
                }} />
                <input className={`${input} col-span-1`} value={r.drawn} onChange={(e) => {
                  const next = [...bundle.table.rows];
                  next[idx] = { ...next[idx]!, drawn: Number(e.target.value) || 0 };
                  push({ ...bundle, table: { ...bundle.table, rows: next } });
                }} />
                <input className={`${input} col-span-1`} value={r.lost} onChange={(e) => {
                  const next = [...bundle.table.rows];
                  next[idx] = { ...next[idx]!, lost: Number(e.target.value) || 0 };
                  push({ ...bundle, table: { ...bundle.table, rows: next } });
                }} />
                <input className={`${input} col-span-2`} value={r.pointsDifference} onChange={(e) => {
                  const next = [...bundle.table.rows];
                  next[idx] = { ...next[idx]!, pointsDifference: e.target.value };
                  push({ ...bundle, table: { ...bundle.table, rows: next } });
                }} />
                <input className={`${input} col-span-1`} value={r.points} onChange={(e) => {
                  const next = [...bundle.table.rows];
                  next[idx] = { ...next[idx]!, points: Number(e.target.value) || 0 };
                  push({ ...bundle, table: { ...bundle.table, rows: next } });
                }} />
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-[#1f2d26] pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Club crest URLs (import fills team-icons; edit to override)
            </p>
            <p className="mt-1 text-[10px] leading-snug text-slate-500">
              Full paths wrap below — narrow single-line fields can hide the filename in some browsers.
            </p>
            <div className="mt-2 max-h-56 space-y-3 overflow-y-auto pr-1">
              {bundle.table.rows.map((r, idx) => (
                <div key={`logo-${r.team}-${idx}`} className="min-w-0 border-b border-[#1f2d26]/60 pb-3 last:border-b-0 last:pb-0">
                  <div className="truncate text-xs font-medium text-slate-200" title={r.team}>
                    {r.team}
                  </div>
                  <textarea
                    rows={2}
                    spellCheck={false}
                    className={`${input} mt-1 min-h-[3.25rem] w-full min-w-0 resize-y font-mono text-[11px] leading-snug break-all`}
                    placeholder="https://www.planetrugby.com/content/themes/planet2/img/png/team-icons/example-club.png"
                    title={r.logoUrl ?? ""}
                    value={r.logoUrl ?? ""}
                    onChange={(e) => {
                      const next = [...bundle.table.rows];
                      next[idx] = { ...next[idx]!, logoUrl: e.target.value };
                      push({ ...bundle, table: { ...bundle.table, rows: next } });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        {onSaveBrowserDraft ? (
          <div className="rounded-lg border border-[#1f2d26] bg-black/25 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-400">
                Save this table data now so row/column changes persist in this browser.
              </p>
              <R365Button
                type="button"
                variant="ghost"
                onClick={() => onSaveBrowserDraft()}
              >
                Save
              </R365Button>
            </div>
          </div>
        ) : null}
      </div>
    </EditorCollapsible>
  );
}
