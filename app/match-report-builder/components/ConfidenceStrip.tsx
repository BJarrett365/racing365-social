"use client";

import { editorialBriefChip } from "@/app/lib/match-report/editorial-governance";
import type { MatchReportProject } from "@/app/lib/match-report/types";
import { stepLabel } from "@/app/lib/match-report/workflow";

type Props = {
  project: MatchReportProject;
};

function countActiveLayers(project: MatchReportProject): number {
  let count = 0;
  if (project.layers.sixLogic) count += 1;
  if (project.layers.sport365Commentary) count += 1;
  if (project.layers.leagueTable) count += 1;
  if (project.layers.leagueSeasonStats) count += 1;
  if (project.layers.loopFeed) count += 1;
  if (project.layers.optaPlayerData) count += 1;
  if (project.layers.manualSources.length > 0) count += 1;
  if (project.layers.interviews.length > 0) count += 1;
  if (project.eventPicture) count += 1;
  if (project.playerIntelligence) count += 1;
  if (project.imageIntelligence?.hero?.url) count += 1;
  if (project.mediaOutputs) count += 1;
  return count;
}

export function ConfidenceStrip({ project }: Props) {
  const skipped = project.health.skippedLayers.map((row) => row.layer).join(", ");
  return (
    <div className="mrb-confidence-strip flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs shadow-[var(--shadow)]">
      <div className="space-y-1.5">
        <p className="font-bold text-[color:var(--text-primary)]">
          Confidence{" "}
          <span className="text-[color:var(--primary)]">{project.confidence}%</span>
          <span className="font-semibold text-[color:var(--text-secondary)]">
            {" "}
            · {countActiveLayers(project)} layers active
          </span>
        </p>
        <p className="mrb-confidence-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-[color:var(--text-secondary)]">
          <span className="mrb-editorial-chip">{editorialBriefChip(project.editorial)}</span>
          <span aria-hidden>·</span>
          <span>{stepLabel(project.workflowStep)}</span>
        </p>
      </div>
      {skipped ? (
        <p
          className="rounded-full border px-3 py-1 font-semibold"
          style={{
            borderColor: "color-mix(in srgb, var(--warning) 35%, var(--border-strong))",
            background: "var(--surface-elevated)",
            color: "var(--warning)",
          }}
        >
          Skipped: {skipped}
        </p>
      ) : null}
    </div>
  );
}
