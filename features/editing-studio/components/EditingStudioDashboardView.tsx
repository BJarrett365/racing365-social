"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Panel } from "@/app/components/Panel";
import { parseApiJson } from "@/app/lib/parse-api-json";
import { EditingStudioBetwaySchedulePanel } from "@/features/editing-studio/components/EditingStudioBetwaySchedulePanel";
import { EditingStudioNavTabs } from "@/features/editing-studio/components/EditingStudioNavTabs";
import { scheduleBrandSelectOptions } from "@/app/lib/match-report/schedule-editorial-brands";
import { EPL_BETWAY_UPCOMINGS_URL, EPL_COMPETITION } from "@/app/lib/match-report/premier-league-schedule";
import { BETWAY_WC2026_UPCOMINGS_URL } from "@/app/lib/match-report/betway-wc2026-constants";
import { WC2026_COMPETITION } from "@/app/lib/match-report/wc2026-schedule";
import { EditingStudioDashboardSkeleton } from "@/features/editing-studio/components/EditingStudioDashboardSkeleton";
import { EditingStudioErrorDisplay } from "@/features/editing-studio/components/EditingStudioErrorDisplay";
import { EditingStudioPageFrame } from "@/features/editing-studio/components/EditingStudioPageFrame";
import type { EditingProject, PlatformType } from "@/features/editing-studio/types/domain";
import {
  filterEditingProjects,
  isDraftBucket,
  isPublishedBucket,
  isScheduledBucket,
  sortByUpdatedDesc,
  uniqueBrands,
  type DashboardFilters,
} from "@/features/editing-studio/utils/dashboard-filters";
import { EDITING_STUDIO_PLATFORM_FILTERS, EDITING_STUDIO_STATUS_FILTERS } from "@/features/editing-studio/utils/filter-options";
import { formatContentTypeLabel, formatPlatformLabel, formatStatusLabel } from "@/features/editing-studio/utils/display-labels";
import { editingStudioThumbnailSrc, resolveEditingStudioThumbnailRel } from "@/features/editing-studio/utils/project-thumbnail";
import { getEditingProjectDisplayTitle } from "@/features/editing-studio/utils/project-display";
import { editingStudioNewProjectPath, editingStudioProjectPath } from "@/features/editing-studio/utils/routes";

const inputClass =
  "mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]";
const inputStyle = { borderColor: "var(--border)" } as const;

const btnPrimary =
  "inline-flex items-center justify-center rounded-lg border border-transparent bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-hover)]";
const btnGhost =
  "inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]";
const btnGhostStyle = { borderColor: "var(--border)", background: "var(--surface)" } as const;
const btnDisabled =
  "inline-flex cursor-not-allowed items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold opacity-50";

function ProjectThumb({ project }: { project: EditingProject }) {
  const rel = resolveEditingStudioThumbnailRel(project);
  if (!rel) {
    return (
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded border text-[10px] text-[color:var(--text-muted)]"
        style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
      >
        —
      </div>
    );
  }
  if (/\.(mp4|webm|mov)$/i.test(rel)) {
    return (
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded border text-xs font-semibold text-[color:var(--text-muted)]"
        style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
      >
        Video
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={editingStudioThumbnailSrc(rel)}
      alt=""
      className="h-14 w-14 shrink-0 rounded border object-cover"
      style={{ borderColor: "var(--border)" }}
    />
  );
}

function ProjectCompactCard({ project }: { project: EditingProject }) {
  return (
    <Link
      href={editingStudioProjectPath(project.id)}
      className="block rounded-lg border p-3 transition hover:bg-[var(--surface-hover)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex gap-3">
        <ProjectThumb project={project} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[color:var(--text-primary)]">{getEditingProjectDisplayTitle(project)}</p>
          <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
            {new Date(project.updatedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function EditingStudioDashboardView() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const tab = searchParams.get("tab") === "fixtures" ? "fixtures" : "projects";
  const tabSearch = searchParams.toString();

  const [allProjects, setAllProjects] = useState<EditingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    search: "",
    status: "all",
    brand: "all",
    platform: "all",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/editing-studio/projects?includeArchived=1", { cache: "no-store" });
      const data = await parseApiJson<{ projects?: EditingProject[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to load projects");
      setAllProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setAllProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      sortByUpdatedDesc(
        filterEditingProjects(allProjects, filters, { excludeArchived: !showArchived }),
      ),
    [allProjects, filters, showArchived],
  );

  const brandOptions = useMemo(() => {
    const fromProjects = uniqueBrands(allProjects);
    const catalog = scheduleBrandSelectOptions().map((o) => o.value);
    return [...new Set([...catalog, ...fromProjects])].sort((a, b) => a.localeCompare(b, "en"));
  }, [allProjects]);

  const draftCount = useMemo(() => filtered.filter(isDraftBucket).length, [filtered]);
  const scheduledCount = useMemo(() => filtered.filter(isScheduledBucket).length, [filtered]);
  const publishedCount = useMemo(() => filtered.filter(isPublishedBucket).length, [filtered]);

  const recentDrafts = useMemo(
    () => sortByUpdatedDesc(filtered.filter(isDraftBucket)).slice(0, 5),
    [filtered],
  );
  const recentScheduled = useMemo(
    () => sortByUpdatedDesc(filtered.filter(isScheduledBucket)).slice(0, 5),
    [filtered],
  );
  const recentPublished = useMemo(
    () => sortByUpdatedDesc(filtered.filter(isPublishedBucket)).slice(0, 5),
    [filtered],
  );

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.brand !== "all" ||
    filters.platform !== "all" ||
    showArchived;

  const fixturePanels = (
    <>
      <EditingStudioBetwaySchedulePanel
        title="Premier League — upcoming fixtures"
        description={`Upcoming Premier League fixtures from Betway Scores. Create social posts per brand for ${EPL_COMPETITION} matches.`}
        apiPath="/api/match-report/epl-schedule"
        betwaySourceUrl={EPL_BETWAY_UPCOMINGS_URL}
        competitionLabel={EPL_COMPETITION}
        showGroupFilter={false}
      />
      <EditingStudioBetwaySchedulePanel
        title="World Cup 2026 — fixture schedule"
        description="All fixtures from Betway Scores. Create social posts per brand or open the match report workflow."
        apiPath="/api/match-report/wc2026-schedule"
        betwaySourceUrl={BETWAY_WC2026_UPCOMINGS_URL}
        competitionLabel={WC2026_COMPETITION}
        matchReportSchedulePath="/match-report-builder/schedule"
      />
    </>
  );

  if (loading && allProjects.length === 0) {
    return (
      <EditingStudioPageFrame
        title="Dashboard"
        description="World Cup 2026 and Premier League fixture calendars plus editorial workflow for social and promo posts."
      >
        <EditingStudioNavTabs search={tabSearch ? `?${tabSearch}` : ""} />
        {tab === "fixtures" ? fixturePanels : <EditingStudioDashboardSkeleton />}
      </EditingStudioPageFrame>
    );
  }

  return (
    <EditingStudioPageFrame
      title="Dashboard"
      description="World Cup 2026 and Premier League fixture calendars plus editorial workflow for social and promo posts."
    >
      <EditingStudioNavTabs search={tabSearch ? `?${tabSearch}` : ""} />

      {tab === "fixtures" ? (
        fixturePanels
      ) : (
        <>
      {error ? (
        <div className="mb-6">
          <EditingStudioErrorDisplay message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      {/* Quick actions */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link href={`${editingStudioNewProjectPath()}?mode=url`} className={btnPrimary}>
          Create from URL
        </Link>
        <Link href={editingStudioNewProjectPath()} className={btnGhost} style={btnGhostStyle}>
          Create manually
        </Link>
        <span className={btnDisabled} style={btnGhostStyle} title="Feed integration coming soon">
          Create from feed item
        </span>
        <span className={btnDisabled} style={btnGhostStyle} title="Asset library picker coming soon">
          Create from asset library
        </span>
      </div>

      {/* Summary stats */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div
          className="rounded-xl border px-4 py-3"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Drafts &amp; review
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-[color:var(--text-primary)]">{draftCount}</p>
        </div>
        <div
          className="rounded-xl border px-4 py-3"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">Scheduled</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-[color:var(--text-primary)]">{scheduledCount}</p>
        </div>
        <div
          className="rounded-xl border px-4 py-3"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">Published</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-[color:var(--text-primary)]">{publishedCount}</p>
        </div>
      </div>

      {/* Recent strips */}
      <div className="mb-10 grid gap-4 xl:grid-cols-3">
        <Panel title="Recent drafts">
          {recentDrafts.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No draft or in-review items in this view.</p>
          ) : (
            <ul className="space-y-2">
              {recentDrafts.map((p) => (
                <li key={p.id}>
                  <ProjectCompactCard project={p} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Scheduled">
          {recentScheduled.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">Nothing scheduled in this view.</p>
          ) : (
            <ul className="space-y-2">
              {recentScheduled.map((p) => (
                <li key={p.id}>
                  <ProjectCompactCard project={p} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Published">
          {recentPublished.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No published items in this view.</p>
          ) : (
            <ul className="space-y-2">
              {recentPublished.map((p) => (
                <li key={p.id}>
                  <ProjectCompactCard project={p} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Filters */}
      <Panel title="Search & filters">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Search
            <input
              className={inputClass}
              style={inputStyle}
              value={filters.search}
              placeholder="Title, description, brand…"
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Status
            <select
              className={inputClass}
              style={inputStyle}
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value as DashboardFilters["status"],
                }))
              }
            >
              <option value="all">All statuses</option>
              {EDITING_STUDIO_STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {formatStatusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Brand
            <select
              className={inputClass}
              style={inputStyle}
              value={filters.brand}
              onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value }))}
            >
              <option value="all">All brands</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Platform
            <select
              className={inputClass}
              style={inputStyle}
              value={filters.platform}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  platform: e.target.value as "all" | PlatformType,
                }))
              }
            >
              <option value="all">All platforms</option>
              {EDITING_STUDIO_PLATFORM_FILTERS.map((p) => (
                <option key={p} value={p}>
                  {formatPlatformLabel(p)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-secondary)]">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived projects
        </label>
        {hasActiveFilters ? (
          <button
            type="button"
            className="mt-3 text-sm font-medium text-[color:var(--accent)] hover:underline"
            onClick={() => {
              setFilters({ search: "", status: "all", brand: "all", platform: "all" });
              setShowArchived(false);
            }}
          >
            Clear filters
          </button>
        ) : null}
      </Panel>

      {/* Main list */}
      <div className="mt-8">
        <Panel title="All matching projects">
          {loading && allProjects.length > 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">Refreshing…</p>
          ) : null}
          {filtered.length === 0 ? (
            <div
              className="rounded-lg border border-dashed py-12 text-center"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="font-semibold text-[color:var(--text-primary)]">
                {allProjects.length === 0 ? "No projects yet" : "No projects match your filters"}
              </p>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                {allProjects.length === 0
                  ? "Create a project using the actions above."
                  : "Try clearing filters or widening search."}
              </p>
              {allProjects.length === 0 ? (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Link href={`${editingStudioNewProjectPath()}?mode=url`} className={btnPrimary}>
                    Create from URL
                  </Link>
                  <Link href={editingStudioNewProjectPath()} className={btnGhost} style={btnGhostStyle}>
                    Create manually
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div
                className={`hidden overflow-x-auto transition-opacity md:block ${loading && allProjects.length > 0 ? "opacity-60" : ""}`}
              >
                <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wide text-[color:var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
                      <th className="py-2 pr-3 font-semibold">Preview</th>
                      <th className="py-2 pr-3 font-semibold">Title</th>
                      <th className="py-2 pr-3 font-semibold">Brand</th>
                      <th className="py-2 pr-3 font-semibold">Content</th>
                      <th className="py-2 pr-3 font-semibold">Platforms</th>
                      <th className="py-2 pr-3 font-semibold">Status</th>
                      <th className="py-2 font-semibold">Last edited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b transition hover:bg-[var(--surface-hover)]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <td className="py-3 pr-3 align-middle">
                          <ProjectThumb project={p} />
                        </td>
                        <td className="py-3 pr-3 align-middle">
                          <Link
                            href={editingStudioProjectPath(p.id)}
                            className="font-medium text-[color:var(--accent)] hover:underline"
                          >
                            {getEditingProjectDisplayTitle(p)}
                          </Link>
                        </td>
                        <td className="py-3 pr-3 align-middle text-[color:var(--text-secondary)]">
                          {p.brand ?? "—"}
                        </td>
                        <td className="py-3 pr-3 align-middle text-[color:var(--text-secondary)]">
                          {formatContentTypeLabel(p.contentType)}
                        </td>
                        <td className="py-3 pr-3 align-middle text-xs text-[color:var(--text-secondary)]">
                          {p.platforms.map(formatPlatformLabel).join(", ")}
                        </td>
                        <td className="py-3 pr-3 align-middle">
                          <span className="rounded border px-2 py-0.5 text-xs font-medium" style={{ borderColor: "var(--border)" }}>
                            {formatStatusLabel(p.status)}
                          </span>
                        </td>
                        <td className="py-3 align-middle text-xs tabular-nums text-[color:var(--text-muted)]">
                          {new Date(p.updatedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="space-y-3 md:hidden">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={editingStudioProjectPath(p.id)}
                      className="block rounded-lg border p-4 transition hover:bg-[var(--surface-hover)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex gap-3">
                        <ProjectThumb project={p} />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-semibold text-[color:var(--text-primary)]">{getEditingProjectDisplayTitle(p)}</p>
                          <p className="text-xs text-[color:var(--text-secondary)]">
                            {p.brand ?? "—"} · {formatContentTypeLabel(p.contentType)}
                          </p>
                          <p className="text-xs text-[color:var(--text-muted)]">
                            {p.platforms.map(formatPlatformLabel).join(", ")}
                          </p>
                          <p className="text-xs">
                            <span className="rounded border px-2 py-0.5" style={{ borderColor: "var(--border)" }}>
                              {formatStatusLabel(p.status)}
                            </span>
                            <span className="ml-2 text-[color:var(--text-muted)]">
                              {new Date(p.updatedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>
        </>
      )}
    </EditingStudioPageFrame>
  );
}
