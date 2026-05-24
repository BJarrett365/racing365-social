"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";
import type { ChartbeatImport } from "@/app/lib/language-studio/types";

const BRANDS = ["Football365", "TEAMtalk", "PlanetF1"];

export function PerformancePanel() {
  const [brand, setBrand] = useState("Football365");
  const [csvText, setCsvText] = useState("");
  const [imports, setImports] = useState<ChartbeatImport[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ profileId: string; name: string; score: number; pageViews: number }>>([]);
  const [unmatched, setUnmatched] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadImports = async () => {
    const res = await fetch(studioApiPath("/api/language/chartbeat/import"));
    const json = await res.json();
    if (res.ok) setImports(json.imports ?? []);
  };

  useEffect(() => {
    void loadImports();
  }, []);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setCsvText(await file.text());
  };

  const runImport = async () => {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch(studioApiPath("/api/language/chartbeat/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, brand }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");
      setSummary(
        `Imported ${json.import.rowCount} rows · ${json.matchedArticles} articles matched · ${json.profileUpdates} profiles updated · ${json.unmatchedRows} unmatched`,
      );
      setLeaderboard(json.leaderboard ?? []);
      setUnmatched(json.unmatchedRows ?? 0);
      await loadImports();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Performance" className="space-y-4 p-5">
      <div>
        <h2 className="text-xl font-bold text-white">Chartbeat performance</h2>
        <p className="mt-1 text-sm text-slate-400">
          Upload a Chartbeat top-pages CSV to score Content Creators and match rows to imported articles.
        </p>
      </div>

      {summary ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-600/20 p-3 text-sm font-semibold text-emerald-100">
          {summary}
        </p>
      ) : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm text-slate-300">
          Brand
          <select
            className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            {BRANDS.map((row) => (
              <option key={row} value={row}>
                {row}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300 md:col-span-2">
          Chartbeat CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-1 block w-full text-sm text-slate-300"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <textarea
        className="min-h-32 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 font-mono text-xs text-white"
        placeholder="Or paste CSV text here…"
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
      />

      <R365Button type="button" disabled={busy || !csvText.trim()} onClick={() => void runImport()}>
        {busy ? "Importing…" : "Import Chartbeat CSV"}
      </R365Button>

      {leaderboard.length ? (
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase text-slate-500">Content Creator leaderboard</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {leaderboard.map((row) => (
              <div key={row.profileId} className="rounded-lg border border-[#1f2d26] bg-black/20 p-3 text-sm text-slate-300">
                <p className="font-semibold text-white">
                  {row.name} · Score {row.score}
                </p>
                <p className="mt-1 text-xs text-slate-500">{row.pageViews.toLocaleString()} page views in import</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {unmatched > 0 ? (
        <p className="text-xs text-amber-300">{unmatched} row(s) could not be matched to Language Studio articles.</p>
      ) : null}

      {imports.length ? (
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase text-slate-500">Recent imports</h3>
          {imports.slice(0, 6).map((row) => (
            <div key={row.id} className="rounded-lg border border-[#1f2d26] bg-black/10 px-3 py-2 text-xs text-slate-400">
              {row.label} · {row.rowCount} rows · {row.matchedArticleCount} matched · {row.createdAt.slice(0, 10)}
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
