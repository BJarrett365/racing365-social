"use client";

import { R365Button } from "@/app/components/R365Button";
import { editorialBriefChip } from "@/app/lib/match-report/editorial-governance";
import {
  buildFoundationImportPreview,
  buildMatchFoundationSummary,
} from "@/app/lib/match-report/normalise-sixlogics";
import type { MatchReportProject } from "@/app/lib/match-report/types";

type Props = {
  project: MatchReportProject;
  onContinue: () => void;
  onStartOver: () => void;
  onBack?: () => void;
  loading?: boolean;
};

export function FoundationSummary({ project, onContinue, onStartOver, onBack, loading }: Props) {
  const foundation = project.layers.sixLogic;
  const summary = foundation ? buildMatchFoundationSummary(foundation) : project.displayLabel;
  const preview = foundation ? buildFoundationImportPreview(foundation) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Foundation ready</p>
        <h2 className="mt-2 text-2xl font-black text-white">{project.displayLabel}</h2>
        <p className="mt-2 text-sm text-slate-300">{summary}</p>
        <p
          className="mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-emerald-200"
          style={{ borderColor: "rgba(52,211,153,0.35)", background: "rgba(16,185,129,0.08)" }}
        >
          {editorialBriefChip(project.editorial)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Confidence" value={`${project.confidence}%`} />
        <StatCard label="Competition" value={project.competition} />
        <StatCard label="Match ID" value={`${project.sportId} / ${project.matchId}`} />
      </div>

      {preview ? (
        <>
          <section
            className="rounded-2xl border p-4"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
              Match details
            </h3>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {preview.matchDetails.map((row) => (
                <div key={row.label}>
                  <dt className="text-[color:var(--text-muted)]">{row.label}</dt>
                  <dd className="font-medium text-[color:var(--text-primary)]">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {preview.venueDetails.length > 0 ? (
            <section
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
                Venue & attendance
              </h3>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {preview.venueDetails.map((row) => (
                  <div key={row.label}>
                    <dt className="text-[color:var(--text-muted)]">{row.label}</dt>
                    <dd className="font-medium text-[color:var(--text-primary)]">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {preview.coaches.length > 0 ? (
            <section
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
                Coaches
              </h3>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                {preview.coaches.map((row) => (
                  <div key={row.team}>
                    <dt className="text-[color:var(--text-muted)]">{row.team}</dt>
                    <dd className="font-medium text-[color:var(--text-primary)]">{row.name}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section
            className="rounded-2xl border p-4"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
              SixLogics core
            </h3>
            <p className="mt-2 text-sm font-semibold text-emerald-300">Imported from SportCC fixture feed</p>
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">
              Lineups, events, and match metadata below will feed the Event Intelligence Object.
            </p>
          </section>

          {preview.eventBreakdown.length > 0 ? (
            <section
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
                Match events
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {preview.eventBreakdown.map((row) => (
                  <span
                    key={row.label}
                    className="rounded-full border px-3 py-1 text-xs font-semibold text-[color:var(--text-secondary)]"
                    style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
                  >
                    {row.label}: {row.count}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {preview.keyMoments.length > 0 ? (
            <section
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
                Key moments from feed
              </h3>
              <ul className="mt-3 space-y-2">
                {preview.keyMoments.map((moment, idx) => (
                  <li
                    key={`${moment.minute ?? "na"}-${idx}`}
                    className="rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
                  >
                    <span className="font-semibold text-[color:var(--text-primary)]">
                      {moment.minute !== undefined ? `${moment.minute}'` : "—"}
                    </span>
                    <span className="text-[color:var(--text-secondary)]"> · {moment.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section
            className="rounded-2xl border p-4"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
              Lineups
            </h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {preview.lineups.map((lineup) => (
                <div
                  key={lineup.side}
                  className="rounded-xl border p-3"
                  style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
                >
                  <p className="font-semibold text-[color:var(--text-primary)]">{lineup.teamName}</p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {lineup.formation ? `Formation ${lineup.formation}` : "Formation not listed"}
                    {lineup.substituteCount > 0 ? ` · ${lineup.substituteCount} subs on bench` : ""}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-[color:var(--text-secondary)]">
                    {lineup.starters.map((player) => (
                      <li key={player}>{player}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <p className="text-sm text-[color:var(--text-muted)]">{preview.commentaryNote}</p>
        </>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {onBack ? (
          <R365Button variant="ghost" onClick={onBack} disabled={loading}>
            ← Back to Match ID
          </R365Button>
        ) : null}
        <R365Button onClick={onContinue} disabled={loading}>
          {loading ? "Continuing…" : "Continue to import data"}
        </R365Button>
        <R365Button variant="ghost" onClick={onStartOver}>
          Start over
        </R365Button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-bold text-[color:var(--text-primary)]">{value}</p>
    </div>
  );
}
