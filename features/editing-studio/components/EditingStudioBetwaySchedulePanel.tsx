"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { studioApiPath, withAppPathPrefix } from "@/app/lib/app-base-path";
import { parseApiJson } from "@/app/lib/parse-api-json";
import { BRAND_LABEL_BY_TARGET } from "@/app/lib/match-report/editorial-governance";
import type { MatchReportTargetBrand } from "@/app/lib/match-report/types";
import { SCHEDULE_EDITORIAL_BRANDS } from "@/app/lib/match-report/schedule-editorial-brands";
import type { Wc2026BrandReportStatus } from "@/app/lib/match-report/wc2026-schedule";
import { editingStudioNewFromFixturePath } from "@/features/editing-studio/utils/fixture-routes";

type ScheduleFixtureRow = {
  slug: string;
  date: string;
  kickoffIso: string;
  group?: string;
  homeTeam: string;
  awayTeam: string;
  betwayMatchId?: string | null;
  sixLogicSportId: string;
  sixLogicMatchId?: string | null;
  targetBrands: MatchReportTargetBrand[];
  brandReports: Wc2026BrandReportStatus[];
};

type Props = {
  title: string;
  description: string;
  apiPath: string;
  betwaySourceUrl: string;
  competitionLabel: string;
  matchReportSchedulePath?: string;
  showGroupFilter?: boolean;
};

const BRAND_FILTER: Array<{ id: MatchReportTargetBrand | "all"; label: string }> = [
  { id: "all", label: "All brands" },
  ...SCHEDULE_EDITORIAL_BRANDS.map((id) => ({
    id,
    label: BRAND_LABEL_BY_TARGET[id],
  })),
];

export function EditingStudioBetwaySchedulePanel({
  title,
  description,
  apiPath,
  betwaySourceUrl,
  competitionLabel,
  matchReportSchedulePath,
  showGroupFilter = true,
}: Props) {
  const [rows, setRows] = useState<ScheduleFixtureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [brand, setBrand] = useState<MatchReportTargetBrand | "all">("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(studioApiPath(apiPath), { cache: "no-store" });
    const data = await parseApiJson<{ rows?: ScheduleFixtureRow[]; error?: string }>(res);
    if (!res.ok || !data.rows) throw new Error(data.error || `Failed to load ${competitionLabel} schedule`);
    setRows(data.rows);
  }, [apiPath, competitionLabel]);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [load]);

  const groups = useMemo(() => [...new Set(rows.map((r) => r.group).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (showGroupFilter && groupFilter !== "all" && row.group !== groupFilter) return false;
      if (brand !== "all" && !row.targetBrands.includes(brand)) return false;
      if (!q) return true;
      return (
        row.homeTeam.toLowerCase().includes(q) ||
        row.awayTeam.toLowerCase().includes(q) ||
        String(row.betwayMatchId ?? "").includes(q)
      );
    });
  }, [rows, brand, groupFilter, search, showGroupFilter]);

  const refreshFromBetway = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath(`${apiPath}?action=fetch-betway`), { method: "POST" });
      const data = await parseApiJson<{ rows?: ScheduleFixtureRow[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Betway refresh failed");
      if (data.rows) setRows(data.rows);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Betway refresh failed");
    } finally {
      setBusy(false);
    }
  };

  const visibleBrands = (row: ScheduleFixtureRow) => (brand === "all" ? row.targetBrands : [brand]);

  return (
    <Panel title={title}>
      <div className="space-y-4">
        <p className="text-sm text-[color:var(--text-secondary)]">{description}</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void refreshFromBetway()}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
            style={{ borderColor: "rgba(52,211,153,0.35)" }}
          >
            {busy ? "Refreshing…" : "Refresh from Betway"}
          </button>
          <a
            href={betwaySourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            style={{ borderColor: "var(--border)" }}
          >
            Betway listing ↗
          </a>
          {matchReportSchedulePath ? (
            <Link
              href={withAppPathPrefix(matchReportSchedulePath)}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              style={{ borderColor: "var(--border)" }}
            >
              Match report schedule →
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {BRAND_FILTER.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setBrand(row.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                brand === row.id ? "bg-emerald-500/20 text-emerald-200" : "text-[color:var(--text-muted)]"
              }`}
              style={{ borderColor: "var(--border)" }}
            >
              {row.label}
            </button>
          ))}
          {showGroupFilter && groups.length > 1 ? (
            <select
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value="all">All groups / stages</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          ) : null}
          <input
            className="min-w-[160px] flex-1 rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
            placeholder="Search teams or Betway ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? <p className="text-sm text-[color:var(--text-muted)]">Loading fixtures…</p> : null}
        {error ? (
          <p className="rounded-lg border px-3 py-2 text-sm text-red-300" style={{ borderColor: "rgba(248,113,113,0.35)" }}>
            {error}
          </p>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">
            No fixtures loaded yet. Click <strong>Refresh from Betway</strong> or run{" "}
            <code className="text-xs">node scripts/seed-epl-schedule.mjs</code>.
          </p>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <div className="max-h-[520px] overflow-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  {showGroupFilter ? <th className="px-3 py-2">Grp</th> : null}
                  <th className="px-3 py-2">Match</th>
                  <th className="px-3 py-2">Betway ID</th>
                  <th className="px-3 py-2">Create post</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.slug} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-[color:var(--text-secondary)]">{row.date}</td>
                    {showGroupFilter ? <td className="px-3 py-2 text-xs font-bold">{row.group ?? "—"}</td> : null}
                    <td className="px-3 py-2">
                      {row.homeTeam} vs {row.awayTeam}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.betwayMatchId ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {visibleBrands(row).map((b) => (
                          <Link
                            key={b}
                            href={editingStudioNewFromFixturePath({
                              slug: row.slug,
                              homeTeam: row.homeTeam,
                              awayTeam: row.awayTeam,
                              kickoffIso: row.kickoffIso,
                              betwayMatchId: row.betwayMatchId,
                              brand: b,
                              competition: competitionLabel,
                            })}
                            className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300 hover:bg-sky-500/10"
                            style={{ borderColor: "rgba(56,189,248,0.35)" }}
                          >
                            {BRAND_LABEL_BY_TARGET[b]}
                          </Link>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <p className="text-xs text-[color:var(--text-muted)]">
            {filtered.length} of {rows.length} fixtures · Betway IDs: {rows.filter((r) => r.betwayMatchId).length}/
            {rows.length}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
