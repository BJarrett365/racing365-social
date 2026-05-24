"use client";

import { useMemo } from "react";
import { R365Button } from "@/app/components/R365Button";
import { editorialBriefChip } from "@/app/lib/match-report/editorial-governance";
import { buildImportLayerSummaries } from "@/app/lib/match-report/import-layer-summaries";
import type { MatchReportProject } from "@/app/lib/match-report/types";
import { ImportStatusCard } from "@/app/match-report-builder/components/ImportStepUi";
import { WorldCupStandingsRefresh } from "@/app/match-report-builder/components/WorldCupStandingsRefresh";

type Props = {
  project: MatchReportProject;
  onContinue: () => void;
  onStartOver: () => void;
  onBack?: () => void;
  onProjectChange?: (project: MatchReportProject) => void;
};

export function EventPictureSummary({ project, onContinue, onStartOver, onBack, onProjectChange }: Props) {
  const picture = project.eventPicture;
  const layerSummaries = useMemo(
    () => picture?.layerSummaries ?? buildImportLayerSummaries(project),
    [picture?.layerSummaries, project],
  );

  if (!picture) return null;

  return (
    <div className="space-y-6">
      <WorldCupStandingsRefresh
        project={project}
        onProjectChange={onProjectChange ?? (() => undefined)}
        compact
      />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Event picture ready</p>
        <h2 className="mt-2 text-2xl font-black text-white">{picture.headlineAngle}</h2>
        <p
          className="mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-emerald-200"
          style={{ borderColor: "rgba(52,211,153,0.35)", background: "rgba(16,185,129,0.08)" }}
        >
          {editorialBriefChip(project.editorial)} · confidence {project.confidence}%
        </p>
      </div>

      {layerSummaries.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Import context used
            </h3>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Summaries from each imported section — carried forward for Player Intelligence and report generation.
            </p>
          </div>
          {layerSummaries.map((row) => (
            <ImportStatusCard key={row.layer} variant={row.skipped ? "warning" : "success"} title={row.title}>
              <p>{row.summary}</p>
              {row.digestExcerpt ? (
                <p className="mt-2 text-xs leading-5 text-[color:var(--text-secondary)]">{row.digestExcerpt}</p>
              ) : null}
            </ImportStatusCard>
          ))}
        </section>
      ) : null}

      {picture.standfirstHooks.length > 0 ? (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Standfirst hooks</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--text-secondary)]">
            {picture.standfirstHooks.map((hook) => (
              <li key={hook}>{hook}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Key moments</h3>
        <ul className="mt-3 space-y-3">
          {picture.keyMoments.map((moment, idx) => (
            <li
              key={`${moment.title}-${idx}`}
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
            >
              <p className="font-semibold text-[color:var(--text-primary)]">
                {moment.minute !== undefined ? `${moment.minute}' · ` : ""}
                {moment.title}
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{moment.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      {picture.narrativeThreads.length > 0 ? (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Narrative threads</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--text-secondary)]">
            {picture.narrativeThreads.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {onBack ? (
          <R365Button variant="ghost" onClick={onBack}>
            ← Back to import data
          </R365Button>
        ) : null}
        <R365Button onClick={onContinue}>Continue to Player Intelligence</R365Button>
        <R365Button variant="ghost" onClick={onStartOver}>
          Start over
        </R365Button>
      </div>
    </div>
  );
}
