"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { R365Button } from "@/app/components/R365Button";
import { PLANET_FOOTBALL_TABLE_VIEWS, type PlanetFootballTableViewId } from "@/app/lib/planet-football-table-views";

type ParsedRow = {
  position: number;
  team: string;
  logoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsDifference: string;
  points: number;
};

type ParsedData = {
  source: "Sport365";
  sourceUrl: string;
  competition: string;
  updatedAt?: string;
  imageUrl?: string;
  rows: ParsedRow[];
};

export function PlanetFootballTableNewButton({
  editorBasePath = "/editor",
}: {
  editorBasePath?: "/editor" | "/landscape/editor";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("https://www.football365.com/premier-league/table");
  const [tableView, setTableView] = useState<PlanetFootballTableViewId>(PLANET_FOOTBALL_TABLE_VIEWS[0]!.id);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedData | null>(null);

  const parse = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/import/planet-football/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), tableView }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; data?: ParsedData };
      if (!res.ok || !json.success || !json.data) throw new Error(json.error || "Parse failed");
      setPreview(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/templates/planet-football/table-short/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: preview }),
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
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">New Planet Football table template</h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Paste a Sport365 or Football365 Premier League table URL, parse rows, then create an editable Shorts template.</p>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sport365 / Football365 table URL
              <input className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white" value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Football mode
              <select
                className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
                value={tableView}
                onChange={(e) => setTableView(e.target.value as PlanetFootballTableViewId)}
              >
                {PLANET_FOOTBALL_TABLE_VIEWS.map((view) => (
                  <option key={view.id} value={view.id}>{view.label}</option>
                ))}
              </select>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <R365Button type="button" variant="ghost" onClick={() => void parse()} disabled={busy}>
                {busy ? "Parsing..." : "Import from URL"}
              </R365Button>
              {preview ? (
                <R365Button type="button" onClick={() => void create()} disabled={busy}>
                  {busy ? "Creating..." : "Create template"}
                </R365Button>
              ) : null}
            </div>
            {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
            {preview ? (
              <div className="mt-3 rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3">
                <p className="text-sm text-slate-200">{preview.competition}</p>
                <p className="text-xs text-slate-500">
                  {preview.rows.length} rows parsed · {preview.rows.filter((row) => row.logoUrl).length} logo URLs stored
                </p>
                <div className="mt-2 max-h-40 overflow-y-auto text-xs text-slate-300">
                  {preview.rows.slice(0, 12).map((r) => (
                    <p key={`${r.position}-${r.team}`}>{r.position}. {r.team} - PTS {r.points}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
