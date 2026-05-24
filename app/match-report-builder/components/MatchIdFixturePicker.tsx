"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { studioApiPath, withAppPathPrefix } from "@/app/lib/app-base-path";
import {
  formatScheduleFixtureLabel,
  SCHEDULE_COMPETITION_META,
  SCHEDULE_COMPETITION_TABS,
  type ScheduleCompetitionId,
  type ScheduleFixtureRow,
} from "@/app/lib/match-report/schedule-competitions";

type Props = {
  matchId: string;
  sportId: string;
  onMatchIdChange: (matchId: string) => void;
  onSportIdChange: (sportId: string) => void;
  initialCompetition?: ScheduleCompetitionId;
  initialBetwayId?: string;
};

const inputClass =
  "w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]";

export function MatchIdFixturePicker({
  matchId,
  sportId,
  onMatchIdChange,
  onSportIdChange,
  initialCompetition = "epl",
  initialBetwayId = "",
}: Props) {
  const [competition, setCompetition] = useState<ScheduleCompetitionId>(initialCompetition);
  const [groupFilter, setGroupFilter] = useState("all");
  const [rows, setRows] = useState<ScheduleFixtureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [entryMode, setEntryMode] = useState<"schedule" | "manual">("schedule");

  const meta = SCHEDULE_COMPETITION_META[competition];
  const competitionLabel =
    SCHEDULE_COMPETITION_TABS.find((tab) => tab.id === competition)?.label ?? "schedule";

  const loadSchedule = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const res = await fetch(studioApiPath(meta.apiPath));
      const data = (await res.json()) as { rows?: ScheduleFixtureRow[]; error?: string };
      if (!data.rows) throw new Error(data.error || "Failed to load schedule");
      setRows(data.rows);
    } catch (e) {
      setRows([]);
      setLoadError(e instanceof Error ? e.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [meta.apiPath]);

  useEffect(() => {
    setGroupFilter("all");
    setSelectedSlug("");
    void loadSchedule();
  }, [loadSchedule]);

  const groups = useMemo(
    () => [...new Set(rows.map((row) => row.group).filter(Boolean))].sort() as string[],
    [rows],
  );

  const filteredFixtures = useMemo(() => {
    return rows.filter((row) => {
      if (meta.showGroupFilter && groupFilter !== "all" && row.group !== groupFilter) return false;
      return true;
    });
  }, [rows, groupFilter, meta.showGroupFilter]);

  useEffect(() => {
    if (!matchId || selectedSlug) return;
    const match = rows.find((row) => row.sixLogicMatchId === matchId);
    if (match) {
      setSelectedSlug(match.slug);
      if (match.group) setGroupFilter(match.group);
    }
  }, [matchId, rows, selectedSlug]);

  useEffect(() => {
    if (!initialBetwayId || selectedSlug || !rows.length) return;
    const match = rows.find((row) => row.betwayMatchId === initialBetwayId);
    if (match) {
      setSelectedSlug(match.slug);
      if (match.group) setGroupFilter(match.group);
    }
  }, [initialBetwayId, rows, selectedSlug]);

  const selectedFixture = filteredFixtures.find((row) => row.slug === selectedSlug);

  const handleFixtureChange = (slug: string) => {
    setSelectedSlug(slug);
    if (!slug) return;
    const fixture = rows.find((row) => row.slug === slug);
    if (!fixture) return;
    onSportIdChange(fixture.sixLogicSportId || "1");
    if (fixture.sixLogicMatchId) {
      onMatchIdChange(fixture.sixLogicMatchId);
    } else {
      onMatchIdChange("");
    }
  };

  const handleManualMatchIdChange = (value: string) => {
    setSelectedSlug("");
    onMatchIdChange(value.replace(/\D/g, ""));
  };

  return (
    <div className="space-y-4 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Tournament</p>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Pick a fixture from the editorial schedule, or enter a SixLogics ID manually.
          </p>
        </div>
        <Link
          href={withAppPathPrefix("/match-report-builder/schedule")}
          className="text-xs font-semibold text-sky-300 underline"
        >
          Manage schedule IDs →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCHEDULE_COMPETITION_TABS.map((tab) => (
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

      <div
        className="rounded-xl border p-1"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        role="tablist"
        aria-label="How to choose a match"
      >
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          <button
            type="button"
            role="tab"
            aria-selected={entryMode === "schedule"}
            onClick={() => setEntryMode("schedule")}
            className={`rounded-lg px-4 py-3 text-left transition-colors ${
              entryMode === "schedule"
                ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-sm"
                : "text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            <span className="block text-sm font-bold">Pick from schedule</span>
            <span
              className={`mt-0.5 block text-xs leading-5 ${
                entryMode === "schedule" ? "text-[color:var(--accent-foreground)]/85" : "text-[color:var(--text-muted)]"
              }`}
            >
              Recommended — choose a fixture from {competitionLabel}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={entryMode === "manual"}
            onClick={() => setEntryMode("manual")}
            className={`rounded-lg px-4 py-3 text-left transition-colors ${
              entryMode === "manual"
                ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-sm"
                : "text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            <span className="block text-sm font-bold">Enter ID manually</span>
            <span
              className={`mt-0.5 block text-xs leading-5 ${
                entryMode === "manual" ? "text-[color:var(--accent-foreground)]/85" : "text-[color:var(--text-muted)]"
              }`}
            >
              Paste a SixLogics match ID if you already have it
            </span>
          </button>
        </div>
      </div>

      {entryMode === "schedule" ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs"
          style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))", background: "var(--accent-soft)" }}
        >
          <span className="font-semibold text-[color:var(--text-primary)]">
            {loading
              ? "Loading fixtures…"
              : loadError
                ? "Could not load schedule"
                : `${filteredFixtures.length} fixture${filteredFixtures.length === 1 ? "" : "s"} in ${competitionLabel}`}
          </span>
          <button
            type="button"
            onClick={() => void loadSchedule()}
            disabled={loading}
            className="font-semibold text-[color:var(--primary)] underline disabled:opacity-50"
          >
            Refresh list
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {meta.showGroupFilter && entryMode === "schedule" ? (
          <select
            className="rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="all">All groups</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                Group {group}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {entryMode === "schedule" ? (
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Fixture {filteredFixtures.length > 0 && !loading ? `(${filteredFixtures.length} available)` : ""}
          </span>
          <select
            className={`${inputClass} text-base font-medium`}
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
            value={selectedSlug}
            onChange={(e) => handleFixtureChange(e.target.value)}
            disabled={loading}
          >
            <option value="">{loading ? "Loading fixtures…" : "Select fixture…"}</option>
            {filteredFixtures.map((fixture) => (
              <option key={fixture.slug} value={fixture.slug}>
                {formatScheduleFixtureLabel(fixture)}
              </option>
            ))}
          </select>
          {loadError ? <p className="text-xs text-red-300">{loadError}</p> : null}
          {!loading && !loadError && filteredFixtures.length === 0 ? (
            <p className="text-xs text-amber-300">No fixtures in this filter. Try another group or refresh the schedule.</p>
          ) : null}
          {selectedFixture && !selectedFixture.sixLogicMatchId ? (
            <p
              className="rounded-xl border px-3 py-2 text-xs text-amber-100"
              style={{ borderColor: "rgba(251,191,36,0.35)", background: "rgba(120,53,15,0.25)" }}
            >
              This fixture has no SixLogics ID yet
              {selectedFixture.betwayMatchId ? (
                <>
                  {" "}
                  (Betway <span className="font-mono">{selectedFixture.betwayMatchId}</span>)
                </>
              ) : null}
              . Set it on{" "}
              <Link href={withAppPathPrefix("/match-report-builder/schedule")} className="font-semibold underline">
                Schedules
              </Link>{" "}
              or enter the ID manually below.
            </p>
          ) : null}
        </label>
      ) : null}

      <label className={`block space-y-2 ${entryMode === "schedule" ? "rounded-xl border border-dashed p-3" : ""}`}
        style={entryMode === "schedule" ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
      >
        <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          {entryMode === "manual" ? "Match ID" : "Match ID (optional override)"}
        </span>
        {entryMode === "schedule" ? (
          <p className="text-xs text-[color:var(--text-muted)]">
            Only needed if the fixture above is missing a SixLogics ID.
          </p>
        ) : null}
        <input
          className={inputClass}
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          value={matchId}
          onChange={(e) => handleManualMatchIdChange(e.target.value)}
          placeholder="e.g. 2990360"
          inputMode="numeric"
        />
      </label>

      <input type="hidden" name="sport_id" value={sportId} />
    </div>
  );
}
