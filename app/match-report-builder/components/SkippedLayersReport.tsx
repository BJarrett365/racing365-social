"use client";

import type { MatchReportProject } from "@/app/lib/match-report/types";

type Props = {
  project: MatchReportProject;
};

export function SkippedLayersReport({ project }: Props) {
  if (project.health.skippedLayers.length === 0) {
    return <p className="text-sm text-[color:var(--text-muted)]">No skipped layers.</p>;
  }
  return (
    <ul className="space-y-2 text-sm text-[color:var(--text-secondary)]">
      {project.health.skippedLayers.map((row) => (
        <li key={row.layer}>
          <span className="font-semibold text-[color:var(--text-primary)]">{row.layer}</span> — {row.reason} (−
          {row.confidencePenalty})
        </li>
      ))}
    </ul>
  );
}
