"use client";

import { useMemo } from "react";
import type { ManualSource, MatchReportProject } from "@/app/lib/match-report/types";
import { groupLoopFeedManualSourcesByTeam } from "@/app/lib/match-report/extract-manual-sources-from-loop-feed";
import { groupLoopFeedSourcesByAuthor } from "@/app/lib/match-report/manual-source-reporter-picker";
import {
  formatReporterAffiliationBadge,
  reporterRoleLabel,
  type LoopFeedPriorityReporterRow,
} from "@/app/lib/tools/loop-feed-priority-reporters-shared";

type Props = {
  project: MatchReportProject;
  reporters?: LoopFeedPriorityReporterRow[];
  maxAuthors?: number;
};

function sourcePreviewExcerpt(row: ManualSource): string {
  return row.excerpt.replace(/\s+/g, " ").slice(0, 160);
}

function authorKindLabel(kind: "journalist" | "club" | "other"): string {
  if (kind === "club") return "Club";
  if (kind === "journalist") return "Journalist";
  return "Other";
}

export function LoopFeedManualSourcesByTeam({ project, reporters = [], maxAuthors = 8 }: Props) {
  const groups = useMemo(
    () =>
      groupLoopFeedManualSourcesByTeam({
        manualSources: project.layers.manualSources,
        loopFeed: project.layers.loopFeed,
        homeTeam: project.homeTeam,
        awayTeam: project.awayTeam,
      }),
    [project],
  );

  const visibleGroups = groups.filter((group) => group.sources.length > 0 || group.postCount > 0 || group.error);
  if (visibleGroups.length === 0) return null;

  return (
    <div className={`grid gap-4 ${visibleGroups.length > 1 ? "md:grid-cols-2" : ""}`}>
      {visibleGroups.map((group) => {
        const count = group.sources.length > 0 ? group.sources.length : group.postCount;
        const authorGroups =
          group.sources.length > 0 ? groupLoopFeedSourcesByAuthor(group.sources, reporters, group.teamLabel) : [];
        const journalistCount = authorGroups.filter((row) => row.kind === "journalist").length;

        return (
          <div
            key={group.sideLabel}
            className="space-y-3 rounded-xl border p-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[color:var(--primary)]">
                  {group.teamLabel}
                </p>
                {authorGroups.length > 0 ? (
                  <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">
                    {journalistCount} journalist{journalistCount === 1 ? "" : "s"}
                    {authorGroups.some((row) => row.kind === "club") ? " · club account" : ""}
                  </p>
                ) : null}
              </div>
              <p className="text-xs font-semibold text-[color:var(--text-muted)]">
                {group.error ? group.error : `${count} Loop Feed source${count === 1 ? "" : "s"}`}
              </p>
            </div>

            {authorGroups.length > 0 ? (
              <div className="space-y-3">
                {authorGroups.slice(0, maxAuthors).map((authorGroup) => {
                  const latest = authorGroup.sources[0];
                  const badge = authorGroup.reporter
                    ? formatReporterAffiliationBadge(authorGroup.reporter)
                    : null;
                  const role = authorGroup.reporter
                    ? reporterRoleLabel(authorGroup.reporter.roleCategory)
                    : authorKindLabel(authorGroup.kind);

                  return (
                    <div
                      key={`${authorGroup.kind}-${authorGroup.authorLabel}-${authorGroup.handle ?? ""}`}
                      className="rounded-lg border px-3 py-2"
                      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                          {authorGroup.authorLabel}
                          {authorGroup.handle ? (
                            <span className="font-normal text-[color:var(--text-muted)]"> · @{authorGroup.handle}</span>
                          ) : null}
                        </p>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                          {authorGroup.sources.length} post{authorGroup.sources.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      {authorGroup.sources[0]?.journalistProfileId ? (
                        <span className="mt-1 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                          Content Creator matched
                        </span>
                      ) : null}
                      <p className="mt-1 text-[11px] text-sky-300">
                        {[role, badge].filter(Boolean).join(" · ")}
                      </p>
                      {latest ? (
                        <p className="mt-2 line-clamp-2 text-xs text-[color:var(--text-secondary)]">
                          {sourcePreviewExcerpt(latest)}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                {authorGroups.length > maxAuthors ? (
                  <p className="text-xs text-[color:var(--text-muted)]">
                    + {authorGroups.length - maxAuthors} more author{authorGroups.length - maxAuthors === 1 ? "" : "s"}{" "}
                    for {group.teamLabel}
                  </p>
                ) : null}
              </div>
            ) : group.postCount > 0 ? (
              <p className="text-xs text-[color:var(--text-secondary)]">
                {group.postCount} post{group.postCount === 1 ? "" : "s"} ready — click Continue to convert to editorial
                sources.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
