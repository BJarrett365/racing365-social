"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { withAppPathPrefix, studioApiPath } from "@/app/lib/app-base-path";
import { BRAND_LABEL_BY_TARGET } from "@/app/lib/match-report/editorial-governance";
import type { EplScheduleRow } from "@/app/lib/match-report/premier-league-schedule";
import { EPL_BETWAY_UPCOMINGS_URL } from "@/app/lib/match-report/premier-league-schedule";
import type { ScheduleBrandDualStatus, ScheduleContentStatus } from "@/app/lib/match-report/schedule-brand-status";
import { SCHEDULE_EDITORIAL_BRANDS } from "@/app/lib/match-report/schedule-editorial-brands";
import type { MatchReportContentType, MatchReportTargetBrand } from "@/app/lib/match-report/types";
import type { Wc2026BrandReportStatus, Wc2026ScheduleRow } from "@/app/lib/match-report/wc2026-schedule";
import { MatchReportNav } from "@/app/match-report-builder/components/MatchReportNav";
import { Panel } from "@/app/components/Panel";

type CompetitionId = "wc2026" | "epl";
type ScheduleFixtureRow = Wc2026ScheduleRow | EplScheduleRow;

const BRAND_FILTER: Array<{ id: MatchReportTargetBrand | "all"; label: string }> = [
  { id: "all", label: "All brands" },
  ...SCHEDULE_EDITORIAL_BRANDS.map((id) => ({
    id,
    label: BRAND_LABEL_BY_TARGET[id],
  })),
];

const COMPETITION_TABS: Array<{ id: CompetitionId; label: string }> = [
  { id: "wc2026", label: "World Cup 2026" },
  { id: "epl", label: "Premier League" },
];

const COMPETITION_META: Record<
  CompetitionId,
  {
    apiPath: string;
    panelTitle: string;
    kicker: string;
    heading: string;
    description: ReactNode;
    betwayUrl: string;
    showGroupColumn: boolean;
    showGroupFilter: boolean;
    footerCli: string;
    footerNote: string;
  }
> = {
  wc2026: {
    apiPath: "/api/match-report/wc2026-schedule",
    panelTitle: "World Cup 2026 — Editorial schedule",
    kicker: "Football365 · TEAMtalk · Planet Football · Sport365",
    heading: "World Cup 2026 fixture schedule",
    description: (
      <>
        Official FIFA World Cup 2026 draw from{" "}
        <a
          href="https://www.betwayscores.com/football/world-cup-2026/263/upcomings"
          target="_blank"
          rel="noreferrer"
          className="text-sky-300 underline"
        >
          Betway Scores
        </a>
        . Track <strong className="text-[color:var(--text-primary)]">preview</strong> and{" "}
        <strong className="text-[color:var(--text-primary)]">report</strong> progress per brand. SixLogics IDs can be
        set manually or resolved from existing projects.
      </>
    ),
    betwayUrl: "https://www.betwayscores.com/football/world-cup-2026/263/upcomings",
    showGroupColumn: true,
    showGroupFilter: true,
    footerCli: "node scripts/seed-wc2026-schedule.mjs",
    footerNote: "Source: Betway Scores WC 2026 upcomings (104 fixtures incl. knockouts).",
  },
  epl: {
    apiPath: "/api/match-report/epl-schedule",
    panelTitle: "Premier League — Editorial schedule",
    kicker: "Football365 · TEAMtalk · Planet Football · Sport365",
    heading: "Premier League upcoming fixtures",
    description: (
      <>
        Upcoming Premier League fixtures from{" "}
        <a href={EPL_BETWAY_UPCOMINGS_URL} target="_blank" rel="noreferrer" className="text-sky-300 underline">
          Betway Scores
        </a>
        . Track preview and report status separately per brand. Betway only exposes a limited upcomings window — refresh
        regularly.
      </>
    ),
    betwayUrl: EPL_BETWAY_UPCOMINGS_URL,
    showGroupColumn: false,
    showGroupFilter: false,
    footerCli: "node scripts/seed-epl-schedule.mjs",
    footerNote: "Source: Betway Scores PL upcomings (limited window).",
  },
};

function statusLabel(status: ScheduleContentStatus): string {
  if (status === "complete") return "Complete";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

function statusClass(status: ScheduleContentStatus): string {
  if (status === "complete") return "text-emerald-300 bg-emerald-500/15 border-emerald-500/30";
  if (status === "in_progress") return "text-amber-200 bg-amber-500/15 border-amber-500/30";
  return "text-[color:var(--text-muted)] bg-[var(--surface-muted)] border-[color:var(--border)]";
}

function actionLabel(status: ScheduleContentStatus): string {
  if (status === "complete") return "Open";
  if (status === "in_progress") return "Continue";
  return "Start";
}

export function FootballScheduleClient() {
  const [competition, setCompetition] = useState<CompetitionId>("wc2026");
  const [rows, setRows] = useState<ScheduleFixtureRow[]>([]);
  const [brand, setBrand] = useState<MatchReportTargetBrand | "all">("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editSixId, setEditSixId] = useState("");

  const meta = COMPETITION_META[competition];

  const loadSchedule = useCallback(async () => {
    setError(null);
    setLoading(true);
    const res = await fetch(studioApiPath(meta.apiPath));
    const data = (await res.json()) as { rows?: ScheduleFixtureRow[]; error?: string };
    if (!data.rows) throw new Error(data.error || "Failed to load schedule");
    setRows(data.rows);
  }, [meta.apiPath]);

  useEffect(() => {
    setGroupFilter("all");
    setEditingSlug(null);
    setEditSixId("");
    loadSchedule()
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [loadSchedule]);

  const groups = useMemo(
    () => [...new Set(rows.map((f) => f.group).filter(Boolean))].sort() as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((f) => {
      if (meta.showGroupFilter && groupFilter !== "all" && f.group !== groupFilter) return false;
      if (brand !== "all" && !f.targetBrands.includes(brand)) return false;
      return true;
    });
  }, [rows, brand, groupFilter, meta.showGroupFilter]);

  const builderHref = (
    f: ScheduleFixtureRow,
    targetBrand: MatchReportTargetBrand,
    contentType: MatchReportContentType,
    projectId?: string,
  ) => {
    if (projectId) {
      return withAppPathPrefix(`/match-report-builder?project=${encodeURIComponent(projectId)}`);
    }
    const params = new URLSearchParams();
    if (f.sixLogicMatchId) params.set("match_id", f.sixLogicMatchId);
    else if (f.betwayMatchId) params.set("betway_id", f.betwayMatchId);
    params.set("sport_id", f.sixLogicSportId);
    params.set("brand", targetBrand);
    params.set("competition", competition);
    if (contentType === "match_preview") params.set("content_type", "match_preview");
    return withAppPathPrefix(`/match-report-builder?${params.toString()}`);
  };

  const brandDual = (f: ScheduleFixtureRow, targetBrand: MatchReportTargetBrand): ScheduleBrandDualStatus | undefined =>
    f.brandDualStatuses?.find((row) => row.brand === targetBrand);

  const brandReport = (f: ScheduleFixtureRow, targetBrand: MatchReportTargetBrand) =>
    f.brandReports.find((row) => row.brand === targetBrand);

  const runAction = async (action: "sync" | "resolve" | "fetch-betway") => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(studioApiPath(`${meta.apiPath}?action=${action}`), {
        method: "POST",
      });
      const data = (await res.json()) as {
        rows?: ScheduleFixtureRow[];
        error?: string;
        betwayIds?: number;
        imported?: number;
      };
      if (!res.ok) throw new Error(data.error || `${action} failed`);
      if (data.rows) setRows(data.rows);
      else await loadSchedule();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusy(null);
    }
  };

  const saveSixLogicId = async (slug: string) => {
    setBusy(`save-${slug}`);
    setError(null);
    try {
      const res = await fetch(studioApiPath(meta.apiPath), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, sixLogicMatchId: editSixId.trim() || null }),
      });
      const data = (await res.json()) as { rows?: ScheduleFixtureRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.rows) setRows(data.rows);
      setEditingSlug(null);
      setEditSixId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const visibleBrands = (f: ScheduleFixtureRow) => (brand === "all" ? f.targetBrands : [brand]);

  const renderStatusChip = (label: string, status: ScheduleContentStatus) => (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(status)}`}
    >
      {label} · {statusLabel(status)}
    </span>
  );

  const renderActionLink = (
    f: ScheduleFixtureRow,
    targetBrand: MatchReportTargetBrand,
    contentType: MatchReportContentType,
    status: ScheduleContentStatus,
    projectId?: string,
    tone: "sky" | "emerald" = "emerald",
  ) => {
    const colors =
      tone === "sky"
        ? { text: "text-sky-300", border: "rgba(56,189,248,0.35)", hover: "hover:bg-sky-500/10" }
        : { text: "text-emerald-300", border: "rgba(52,211,153,0.35)", hover: "hover:bg-emerald-500/10" };
    const prefix = contentType === "match_preview" ? "Preview" : "Report";
    return (
      <Link
        href={builderHref(f, targetBrand, contentType, projectId)}
        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colors.text} ${colors.hover}`}
        style={{ borderColor: colors.border }}
      >
        {BRAND_LABEL_BY_TARGET[targetBrand]} · {prefix} · {actionLabel(status)}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <MatchReportNav active="schedule" />
      <Panel title={meta.panelTitle}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {COMPETITION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCompetition(tab.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  competition === tab.id
                    ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                    : "text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
                style={competition !== tab.id ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">{meta.kicker}</p>
            <h2 className="mt-2 text-2xl font-black text-[color:var(--text-primary)]">{meta.heading}</h2>
            <p className="mt-2 max-w-3xl text-sm text-[color:var(--text-secondary)]">{meta.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => runAction("fetch-betway")}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
              style={{ borderColor: "rgba(52,211,153,0.35)" }}
            >
              {busy === "fetch-betway" ? "Fetching Betway…" : "Refresh from Betway Scores"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => runAction("sync")}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/10 disabled:opacity-50"
              style={{ borderColor: "rgba(56,189,248,0.35)" }}
            >
              {busy === "sync" ? "Syncing…" : "Sync calendar"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => runAction("resolve")}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/10 disabled:opacity-50"
              style={{ borderColor: "rgba(167,139,250,0.35)" }}
            >
              {busy === "resolve" ? "Resolving…" : "Resolve SixLogics IDs from projects"}
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {BRAND_FILTER.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setBrand(row.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  brand === row.id ? "bg-emerald-500/20 text-emerald-200" : "text-[color:var(--text-muted)]"
                }`}
                style={{ borderColor: "var(--border)" }}
              >
                {row.label}
              </button>
            ))}
            {meta.showGroupFilter ? (
              <select
                className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option value="all">All groups</option>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    Group {g}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {loading ? <p className="text-sm text-[color:var(--text-muted)]">Loading schedule…</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          {!loading && !error ? (
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border)" }}>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    {meta.showGroupColumn ? <th className="px-3 py-2">Grp</th> : null}
                    <th className="px-3 py-2">Match</th>
                    <th className="px-3 py-2">SixLogics ID</th>
                    <th className="px-3 py-2">Betway ID</th>
                    {brand !== "all" ? (
                      <>
                        <th className="px-3 py-2">Preview</th>
                        <th className="px-3 py-2">Report</th>
                      </>
                    ) : (
                      <th className="px-3 py-2">Preview / Report status</th>
                    )}
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.slug} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-2 whitespace-nowrap text-[color:var(--text-secondary)]">{f.date}</td>
                      {meta.showGroupColumn ? <td className="px-3 py-2 font-bold">{f.group ?? "—"}</td> : null}
                      <td className="px-3 py-2">
                        {f.homeTeam} vs {f.awayTeam}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {editingSlug === f.slug ? (
                          <div className="flex items-center gap-1">
                            <input
                              className="w-24 rounded border px-1.5 py-0.5 text-xs"
                              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                              value={editSixId}
                              onChange={(e) => setEditSixId(e.target.value.replace(/\D/g, ""))}
                              placeholder="ID"
                            />
                            <button
                              type="button"
                              className="text-emerald-300"
                              disabled={busy === `save-${f.slug}`}
                              onClick={() => saveSixLogicId(f.slug)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="text-[color:var(--text-muted)]"
                              onClick={() => {
                                setEditingSlug(null);
                                setEditSixId("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="hover:text-emerald-300"
                            title="Click to edit"
                            onClick={() => {
                              setEditingSlug(f.slug);
                              setEditSixId(f.sixLogicMatchId ?? "");
                            }}
                          >
                            {f.sixLogicMatchId ?? "—"}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{f.betwayMatchId ?? "—"}</td>
                      {brand !== "all" ? (
                        <>
                          <td className="px-3 py-2">
                            {renderStatusChip(
                              "Preview",
                              brandDual(f, brand)?.preview.status ??
                                (brandReport(f, brand)?.status === "complete" ? "complete" : "not_started"),
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {renderStatusChip(
                              "Report",
                              brandDual(f, brand)?.report.status ?? brandReport(f, brand)?.status ?? "not_started",
                            )}
                          </td>
                        </>
                      ) : (
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            {visibleBrands(f).map((b) => {
                              const dual = brandDual(f, b);
                              const legacyReport = brandReport(f, b);
                              const previewStatus = dual?.preview.status ?? "not_started";
                              const reportStatus = dual?.report.status ?? legacyReport?.status ?? "not_started";
                              return (
                                <div key={b} className="flex flex-wrap gap-1">
                                  {renderStatusChip(`${BRAND_LABEL_BY_TARGET[b]} preview`, previewStatus)}
                                  {renderStatusChip(`${BRAND_LABEL_BY_TARGET[b]} report`, reportStatus)}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {visibleBrands(f).map((b) => {
                            const dual = brandDual(f, b);
                            const legacyReport = brandReport(f, b);
                            const previewStatus = dual?.preview.status ?? "not_started";
                            const reportStatus = dual?.report.status ?? legacyReport?.status ?? "not_started";
                            return (
                              <div key={b} className="flex flex-wrap gap-1">
                                {renderActionLink(
                                  f,
                                  b,
                                  "match_preview",
                                  previewStatus,
                                  dual?.preview.projectId,
                                  "sky",
                                )}
                                {renderActionLink(
                                  f,
                                  b,
                                  "match_report",
                                  reportStatus,
                                  dual?.report.projectId ?? legacyReport?.projectId,
                                  "emerald",
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <p className="text-xs text-[color:var(--text-muted)]">
            {filtered.length} fixtures shown · CLI: <code className="text-[10px]">{meta.footerCli}</code> ·{" "}
            {meta.footerNote}
          </p>
        </div>
      </Panel>
    </div>
  );
}
