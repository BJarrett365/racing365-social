"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Panel } from "@/app/components/Panel";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { EditorialCalendarEvent } from "@/app/lib/editorial-calendar/types";
import {
  anchorForToday,
  dayKey,
  isSameMonth,
  rangeLabel,
  snapAnchorForView,
  stepAnchor,
  visibleDays,
  visibleRange,
  yearMonthSummaries,
  WEEKDAY_LABELS,
  type CalendarView,
} from "@/features/editing-studio/components/calendar/calendar-view-utils";
import { EditorialCalendarEventDrawer } from "@/features/editing-studio/components/calendar/EditorialCalendarEventDrawer";
import { EditingStudioErrorDisplay } from "@/features/editing-studio/components/EditingStudioErrorDisplay";
import { EditingStudioNavTabs } from "@/features/editing-studio/components/EditingStudioNavTabs";
import { EditingStudioPageFrame } from "@/features/editing-studio/components/EditingStudioPageFrame";
import { scheduleBrandSelectOptions } from "@/app/lib/match-report/schedule-editorial-brands";
import { editingStudioNewProjectPath } from "@/features/editing-studio/utils/routes";

const inputClass =
  "mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]";
const inputStyle = { borderColor: "var(--border)" } as const;

const btnPrimary =
  "inline-flex items-center justify-center rounded-lg border border-transparent bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-hover)]";
const btnGhost =
  "inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]";
const btnGhostStyle = { borderColor: "var(--border)", background: "var(--surface)" } as const;

const CALENDAR_VIEWS: CalendarView[] = ["month", "week", "day", "year"];

function parseCalendarView(raw: string | null): CalendarView {
  if (raw === "week" || raw === "day" || raw === "year" || raw === "month") return raw;
  return "month";
}

function eventSportColor(sport: EditorialCalendarEvent["sport"]): string {
  switch (sport) {
    case "football":
      return "border-l-emerald-500";
    case "f1":
      return "border-l-red-500";
    case "horse_racing":
      return "border-l-amber-500";
    default:
      return "border-l-slate-400";
  }
}

function EventList({
  events,
  onSelect,
}: {
  events: EditorialCalendarEvent[];
  onSelect: (event: EditorialCalendarEvent) => void;
}) {
  return (
    <ul className="space-y-1">
      {events.map((event) => (
        <li key={event.id}>
          <button
            type="button"
            onClick={() => onSelect(event)}
            className={`w-full rounded border-l-4 px-2 py-1 text-left text-[11px] font-medium transition hover:bg-[var(--surface-hover)] ${eventSportColor(event.sport)}`}
            style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
          >
            <span className="block truncate text-[color:var(--text-primary)]">{event.title}</span>
            <span className="text-[color:var(--text-muted)]">
              {new Date(event.startAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              {event.matchPhase ? ` · ${event.matchPhase.replace(/_/g, " ")}` : ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function EditorialCalendarClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkEventId = searchParams.get("eventId")?.trim() ?? "";
  const viewParam = searchParams.get("view");

  const [view, setView] = useState<CalendarView>(() => parseCalendarView(viewParam));
  const [anchorDate, setAnchorDate] = useState(() => snapAnchorForView(parseCalendarView(viewParam), new Date()));
  const [events, setEvents] = useState<EditorialCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EditorialCalendarEvent | null>(null);
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [competitionFilter, setCompetitionFilter] = useState<string>("all");

  const range = useMemo(() => visibleRange(view, anchorDate), [view, anchorDate]);
  const catalogBrandOptions = useMemo(() => scheduleBrandSelectOptions(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() });
      if (sportFilter !== "all") q.set("sport", sportFilter);
      if (brandFilter !== "all") q.set("brand", brandFilter);
      if (competitionFilter !== "all") q.set("competition", competitionFilter);
      const res = await fetch(`/api/editing-studio/calendar?${q.toString()}`);
      const data = await parseApiJson<{ events: EditorialCalendarEvent[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to load calendar");
      setEvents(data.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, sportFilter, brandFilter, competitionFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!deepLinkEventId || events.length === 0) return;
    const match = events.find((event) => event.id === deepLinkEventId);
    if (match) setSelected(match);
  }, [deepLinkEventId, events]);

  const syncFixtures = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/editing-studio/calendar/sync-fixtures", { method: "POST" });
      const data = await parseApiJson<{ total?: number; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [load]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EditorialCalendarEvent[]>();
    for (const event of events) {
      const key = event.startAt.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    }
    return map;
  }, [events]);

  const competitionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const event of events) {
      if (event.competition) set.add(event.competition);
    }
    return [...set].sort();
  }, [events]);

  const headerLabel = rangeLabel(view, anchorDate);
  const monthAnchor = snapAnchorForView("month", anchorDate);

  const changeView = (next: CalendarView) => {
    setView(next);
    setAnchorDate((prev) => snapAnchorForView(next, prev));
    const q = new URLSearchParams(searchParams.toString());
    q.set("view", next);
    router.replace(`?${q.toString()}`, { scroll: false });
  };

  const renderDayCell = (day: Date, opts?: { muted?: boolean; minHeight?: string }) => {
    const key = dayKey(day);
    const dayEvents = eventsByDay.get(key) ?? [];
    const isToday = dayKey(new Date()) === key;
    return (
      <div
        key={key}
        className={`${opts?.minHeight ?? "min-h-[8rem]"} rounded-xl border p-2 ${opts?.muted ? "opacity-50" : ""}`}
        style={{
          borderColor: isToday ? "var(--accent)" : "var(--border)",
          background: "var(--surface)",
        }}
      >
        <p className="mb-2 text-xs font-bold text-[color:var(--text-secondary)]">
          {day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
        </p>
        <EventList events={dayEvents} onSelect={setSelected} />
      </div>
    );
  };

  return (
    <EditingStudioPageFrame
      title="Editorial calendar"
      description="Multi-sport fixture and editorial schedule. Click an event to create content by phase — Pre-match, Live, or Report / Post."
      actions={
        <>
          <button type="button" className={btnGhost} style={btnGhostStyle} onClick={() => void syncFixtures()} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync WC & EPL fixtures"}
          </button>
          <Link href={editingStudioNewProjectPath()} className={btnPrimary}>
            New project
          </Link>
        </>
      }
    >
      <EditingStudioNavTabs />

      {error ? (
        <div className="mb-4">
          <EditingStudioErrorDisplay message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      <Panel title="Filters">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Sport
            <select className={inputClass} style={inputStyle} value={sportFilter} onChange={(e) => setSportFilter(e.target.value)}>
              <option value="all">All sports</option>
              <option value="football">Football</option>
              <option value="f1">F1</option>
              <option value="horse_racing">Horse racing</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Brand
            <select className={inputClass} style={inputStyle} value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
              <option value="all">All brands</option>
              {catalogBrandOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Competition
            <select
              className={inputClass}
              style={inputStyle}
              value={competitionFilter}
              onChange={(e) => setCompetitionFilter(e.target.value)}
            >
              <option value="all">All competitions</option>
              {competitionOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            View
            <select
              className={inputClass}
              style={inputStyle}
              value={view}
              onChange={(e) => changeView(e.target.value as CalendarView)}
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
              <option value="year">Year</option>
            </select>
          </label>
        </div>
      </Panel>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{headerLabel}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={btnGhost}
            style={btnGhostStyle}
            onClick={() => setAnchorDate((d) => stepAnchor(view, d, -1))}
          >
            Previous
          </button>
          <button type="button" className={btnGhost} style={btnGhostStyle} onClick={() => setAnchorDate(anchorForToday(view))}>
            Today
          </button>
          <button
            type="button"
            className={btnGhost}
            style={btnGhostStyle}
            onClick={() => setAnchorDate((d) => stepAnchor(view, d, 1))}
          >
            Next
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[color:var(--text-muted)]">Loading calendar…</p>
      ) : view === "year" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {yearMonthSummaries(anchorDate).map(({ monthIndex, monthStart, label }) => {
            let count = 0;
            for (const [key, list] of eventsByDay) {
              const d = new Date(`${key}T12:00:00`);
              if (d.getFullYear() === monthStart.getFullYear() && d.getMonth() === monthIndex) {
                count += list.length;
              }
            }
            return (
              <button
                key={monthIndex}
                type="button"
                onClick={() => {
                  setAnchorDate(monthStart);
                  changeView("month");
                }}
                className="rounded-xl border p-4 text-left transition hover:border-[color:var(--accent)]"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <p className="text-sm font-black text-[color:var(--text-primary)]">{label}</p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {count === 0 ? "No events" : `${count} event${count === 1 ? "" : "s"}`}
                </p>
              </button>
            );
          })}
        </div>
      ) : view === "day" ? (
        renderDayCell(snapAnchorForView("day", anchorDate), { minHeight: "min-h-[16rem]" })
      ) : view === "week" ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">{visibleDays("week", anchorDate).map((day) => renderDayCell(day))}</div>
      ) : (
        <>
          <div className="mb-2 grid grid-cols-7 gap-2">
            {WEEKDAY_LABELS.map((label) => (
              <p key={label} className="text-center text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                {label}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {visibleDays("month", anchorDate).map((day) =>
              renderDayCell(day, { muted: !isSameMonth(day, monthAnchor) }),
            )}
          </div>
        </>
      )}

      {selected ? <EditorialCalendarEventDrawer event={selected} onClose={() => setSelected(null)} /> : null}
    </EditingStudioPageFrame>
  );
}
