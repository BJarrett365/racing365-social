"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { R365Button } from "@/app/components/R365Button";
import { sanitizeSport365Scorers } from "@/app/lib/match-report/parse-sport365-match-page-summary";
import { PLANET_FOOTBALL_TABLE_VIEWS, type PlanetFootballTableViewId } from "@/app/lib/planet-football-table-views";
import {
  PLANET_FOOTBALL_DISPLAY_BRANDS,
  type PlanetFootballDisplayBrand,
} from "@/app/lib/planet-football-table-brands";
import type { PlanetFootballGroupTableSnapshot, PlanetFootballTableBundle, PlanetFootballTableRow } from "@/types";

type ParsedData = {
  source: "Sport365";
  sourceUrl: string;
  competition: string;
  updatedAt?: string;
  format?: "league" | "group_stage";
  groupCode?: string;
  rows: PlanetFootballTableRow[];
};

type ImportResponse = {
  success?: boolean;
  error?: string;
  format?: "league" | "group_stage";
  data?: ParsedData;
  groupTables?: PlanetFootballGroupTableSnapshot[];
  selectedGroupCode?: string;
  matchContext?: PlanetFootballTableBundle["matchContext"];
  matchImportWarning?: string;
};

async function fetchMatchSummary(url: string): Promise<PlanetFootballTableBundle["matchContext"] | undefined> {
  const res = await fetch("/api/import/planet-football/match-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url.trim() }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    matchContext?: PlanetFootballTableBundle["matchContext"];
    error?: string;
  };
  if (!res.ok || !json.success || !json.matchContext) return undefined;
  return json.matchContext;
}

const DEFAULT_URL =
  "https://www.sport365.com/football/world-cup/group-stage/usa-vs-paraguay/1-4109485";

export function PlanetFootballTableNewButton({
  editorBasePath = "/editor",
}: {
  editorBasePath?: "/editor" | "/landscape/editor";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(DEFAULT_URL);
  const [tableView, setTableView] = useState<PlanetFootballTableViewId>(PLANET_FOOTBALL_TABLE_VIEWS[0]!.id);
  const [displayBrand, setDisplayBrand] = useState<PlanetFootballDisplayBrand>("sport365");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedData | null>(null);
  const [groupTables, setGroupTables] = useState<PlanetFootballGroupTableSnapshot[]>([]);
  const [selectedGroupCode, setSelectedGroupCode] = useState<string>("");
  const [matchContext, setMatchContext] = useState<PlanetFootballTableBundle["matchContext"]>();
  const [matchImportWarning, setMatchImportWarning] = useState<string | null>(null);

  const parse = async (groupCode?: string) => {
    setBusy(true);
    setError(null);
    setMatchImportWarning(null);
    try {
      const trimmedUrl = url.trim();
      const res = await fetch("/api/import/planet-football/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmedUrl,
          tableView,
          ...(groupCode ? { selectedGroupCode: groupCode } : {}),
        }),
      });
      const json = (await res.json()) as ImportResponse;
      if (!res.ok || !json.success || !json.data) throw new Error(json.error || "Parse failed");

      let importedMatch = json.matchContext;
      if (!importedMatch?.homeTeam && /-vs-/i.test(trimmedUrl)) {
        importedMatch = await fetchMatchSummary(trimmedUrl);
      }

      setPreview(json.data);
      setGroupTables(json.groupTables ?? []);
      setSelectedGroupCode(json.selectedGroupCode ?? json.data.groupCode ?? "");
      setMatchContext(importedMatch);
      if (!importedMatch?.homeTeam && /-vs-/i.test(trimmedUrl)) {
        setMatchImportWarning(json.matchImportWarning ?? "Could not load match score from Sport365.");
      } else if (json.matchImportWarning) {
        setMatchImportWarning(json.matchImportWarning);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setBusy(false);
    }
  };

  const selectGroup = async (groupCode: string) => {
    setSelectedGroupCode(groupCode);
    const cached = groupTables.find((group) => group.groupCode === groupCode);
    if (cached && preview) {
      setPreview({
        ...preview,
        groupCode,
        competition: `${cached.groupName} · ${preview.competition.split(" · ").pop() ?? "Sport365"}`,
        rows: cached.rows,
      });
      return;
    }
    await parse(groupCode);
  };

  const create = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/templates/planet-football/table-short/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: preview,
          groupTables: groupTables.length > 0 ? groupTables : undefined,
          selectedGroupCode: selectedGroupCode || preview.groupCode,
          matchContext,
          displayBrand,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; editorPath?: string };
      if (!res.ok || !json.success || !json.editorPath) throw new Error(json.error || "Create failed");
      const path = json.editorPath.startsWith("/editor/")
        ? json.editorPath.replace("/editor", editorBasePath)
        : json.editorPath;
      setOpen(false);
      router.push(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <R365Button type="button" onClick={() => setOpen(true)} disabled={busy}>
        New template
      </R365Button>
      {open ? (
        <div className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <div className="ui-modal w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">New Sport365 table template</h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Paste a Sport365 URL — league standings, World Cup group stage, or a match page. All groups import; pick
              which table to display.
            </p>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sport365 URL
              <input
                className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={DEFAULT_URL}
              />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Brand style
              <select
                className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
                value={displayBrand}
                onChange={(e) => setDisplayBrand(e.target.value as PlanetFootballDisplayBrand)}
              >
                {PLANET_FOOTBALL_DISPLAY_BRANDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-1 text-[11px] text-slate-500">
              Sets on-screen colours, logo, outro copy, and{" "}
              <strong className="font-semibold text-slate-400">burned subtitle</strong> outline colour (FFmpeg).
            </p>
            {groupTables.length === 0 ? (
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                League table view (Premier League only)
                <select
                  className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
                  value={tableView}
                  onChange={(e) => setTableView(e.target.value as PlanetFootballTableViewId)}
                >
                  {PLANET_FOOTBALL_TABLE_VIEWS.map((view) => (
                    <option key={view.id} value={view.id}>
                      {view.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <R365Button type="button" variant="ghost" onClick={() => void parse()} disabled={busy}>
                {busy ? "Importing from Sport365…" : "Import from Sport365"}
              </R365Button>
              {preview ? (
                <R365Button type="button" onClick={() => void create()} disabled={busy}>
                  {busy ? "Creating…" : "Create template"}
                </R365Button>
              ) : null}
            </div>
            {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
            {groupTables.length > 0 ? (
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Display group
                <select
                  className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
                  value={selectedGroupCode}
                  onChange={(e) => void selectGroup(e.target.value)}
                  disabled={busy}
                >
                  {groupTables.map((group) => (
                    <option key={group.groupCode} value={group.groupCode}>
                      {group.groupName} ({group.rows.length} teams)
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {preview ? (
              <div className="mt-3 rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3">
                {matchContext ? (
                  <div className="mb-3 rounded-md border border-[#BD33B5]/40 bg-[#BD33B5]/15 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#BD33B5]">Match result</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {matchContext.homeTeam}{" "}
                      <span className="tabular-nums text-[#BD33B5]">
                        {matchContext.homeScore}–{matchContext.awayScore}
                      </span>{" "}
                      {matchContext.awayTeam}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      {matchContext.statusLabel ?? matchContext.status ?? "Full time"}
                    </p>
                    {sanitizeSport365Scorers(matchContext.scorers).length > 0 ? (
                      <ul className="mt-2 space-y-0.5 text-[11px] text-slate-400">
                        {sanitizeSport365Scorers(matchContext.scorers).map((s, i) => (
                          <li key={`${s.player}-${s.minuteLabel}-${i}`}>
                            {s.minuteLabel} {s.player}
                            {s.type === "own_goal" ? " (OG)" : ""} · {s.team}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                <p className="text-sm font-semibold text-[#BD33B5]">Sport365 · {preview.competition}</p>
                <p className="text-xs text-slate-500">
                  {preview.rows.length} rows
                  {groupTables.length > 0 ? ` · ${groupTables.length} groups imported` : ""}
                </p>
                {!matchContext && matchImportWarning ? (
                  <p className="mt-2 text-[11px] text-amber-400/90">{matchImportWarning}</p>
                ) : null}
                <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-slate-300">
                  {preview.rows.map((r) => (
                    <li key={`${r.position}-${r.team}`}>
                      {r.position}. {r.team} — {r.points} pts
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
