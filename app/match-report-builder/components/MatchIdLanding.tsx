"use client";

import { FormEvent, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { editorialBriefChip } from "@/app/lib/match-report/editorial-governance";
import { matchReportFormatLabel, resolveReportScope } from "@/app/lib/match-report/match-report-format";
import type { ScheduleCompetitionId } from "@/app/lib/match-report/schedule-competitions";
import type { EditorialProfile, MatchReportFormat, MatchReportScope } from "@/app/lib/match-report/types";
import { MatchIdFixturePicker } from "@/app/match-report-builder/components/MatchIdFixturePicker";

const OUTPUT_TILES = [
  "Headline",
  "Report",
  "Ratings",
  "Hero image",
  "Timeline",
  "Line-ups",
  "Fact-checked",
  "Social crops",
];

type Props = {
  editorial: EditorialProfile;
  awayEditorial?: EditorialProfile | null;
  reportFormat: MatchReportFormat;
  onBack: () => void;
  onSubmit: (input: { matchId: string; sportId: string; reportScope: MatchReportScope }) => void;
  loading?: boolean;
  error?: string | null;
  initialMatchId?: string;
  initialSportId?: string;
  initialBetwayId?: string;
  initialCompetition?: ScheduleCompetitionId;
};

export function MatchIdLanding({
  editorial,
  awayEditorial,
  reportFormat,
  onBack,
  onSubmit,
  loading,
  error,
  initialMatchId = "",
  initialSportId = "1",
  initialBetwayId = "",
  initialCompetition = "epl",
}: Props) {
  const [matchId, setMatchId] = useState(initialMatchId);
  const [sportId, setSportId] = useState(initialSportId);
  const [reportScope, setReportScope] = useState<MatchReportScope>(
    reportFormat === "live_first_half" ? "first_half" : "full",
  );
  const scopeLocked = reportFormat === "live_first_half";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      matchId: matchId.trim(),
      sportId: sportId.trim() || "1",
      reportScope: resolveReportScope(reportFormat, reportScope),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Step 3</p>
        <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">Football reports, written by AI</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Select a fixture from the tournament schedule or enter a SixLogics match ID manually. Schedule deep-links can
          pre-fill IDs via <code className="text-xs">?match_id=&amp;sport_id=</code>.
        </p>
        {initialBetwayId && !initialMatchId ? (
          <p
            className="mt-3 rounded-xl border px-4 py-3 text-sm text-amber-100"
            style={{ borderColor: "rgba(251,191,36,0.35)", background: "rgba(120,53,15,0.25)" }}
          >
            Betway fixture ID <span className="font-mono">{initialBetwayId}</span> was passed from the schedule. A
            SixLogics match ID is still required to import foundation data — pick the fixture below or enter it
            manually.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <p
            className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-sky-200"
            style={{ borderColor: "rgba(56,189,248,0.35)", background: "rgba(14,116,144,0.12)" }}
          >
            {matchReportFormatLabel(reportFormat)}
          </p>
          <p
            className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-emerald-200"
            style={{ borderColor: "rgba(52,211,153,0.35)", background: "rgba(16,185,129,0.08)" }}
          >
            {awayEditorial ? `Home · ${editorialBriefChip(editorial)}` : editorialBriefChip(editorial)}
          </p>
          {awayEditorial ? (
            <p
              className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-emerald-200"
              style={{ borderColor: "rgba(52,211,153,0.35)", background: "rgba(16,185,129,0.08)" }}
            >
              Away · {editorialBriefChip(awayEditorial)}
            </p>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <MatchIdFixturePicker
          matchId={matchId}
          sportId={sportId}
          onMatchIdChange={setMatchId}
          onSportIdChange={setSportId}
          initialCompetition={initialCompetition}
          initialBetwayId={initialBetwayId}
        />

        <div className={`grid gap-3 ${scopeLocked ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-[180px_1fr_auto]"}`}>
          {!scopeLocked ? (
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                Report scope
              </span>
              <select
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]"
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                value={reportScope}
                onChange={(e) => setReportScope(e.target.value as MatchReportScope)}
              >
                <option value="full">Full match</option>
                <option value="first_half">1st half (0–45)</option>
              </select>
            </label>
          ) : (
            <p
              className="rounded-xl border px-4 py-3 text-sm text-[color:var(--text-secondary)] md:self-end"
              style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
            >
              Scope locked to <strong className="text-[color:var(--text-primary)]">first half (0–45)</strong> for live /
              HT reports.
            </p>
          )}
          <div className={`flex items-end ${scopeLocked ? "" : "md:col-span-2 md:justify-end"}`}>
            <R365Button type="submit" disabled={!matchId || loading} className="w-full md:w-auto">
              {loading ? "Loading match data…" : "Import →"}
            </R365Button>
          </div>
        </div>
      </form>

      {error ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm text-red-200"
          style={{ borderColor: "rgba(248,113,113,0.35)", background: "rgba(127,29,29,0.25)" }}
        >
          {error}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">What you get</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OUTPUT_TILES.map((tile) => (
            <div
              key={tile}
              className="rounded-2xl border px-4 py-5 text-sm font-semibold text-[color:var(--text-primary)]"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              {tile}
            </div>
          ))}
        </div>
      </div>

      <div>
        <R365Button variant="ghost" onClick={onBack}>
          ← Back
        </R365Button>
      </div>
    </div>
  );
}
