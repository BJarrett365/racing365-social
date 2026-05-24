"use client";

import { useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";
import { isWorldCupCompetition, formatStandingsUpdatedAt } from "@/app/lib/match-report/league-table-defaults";
import type { LeagueTableIntelligence, MatchReportProject } from "@/app/lib/match-report/types";

type Props = {
  project: MatchReportProject;
  onProjectChange: (project: MatchReportProject) => void;
  compact?: boolean;
};

function groupSummary(table: LeagueTableIntelligence): string {
  if (table.format !== "group_stage") return `${table.rows.length} teams · ${table.competition}`;
  const group = table.groupCode ? `Group ${table.groupCode}` : "Group stage";
  const home = table.homeTeamRow
    ? `${table.homeTeamRow.team} ${table.homeTeamRow.position}${table.homeTeamRow.position === 1 ? "st" : "th"}`
    : null;
  const away = table.awayTeamRow
    ? `${table.awayTeamRow.team} ${table.awayTeamRow.position}${table.awayTeamRow.position === 1 ? "st" : "th"}`
    : null;
  return [group, home, away].filter(Boolean).join(" · ");
}

export function WorldCupStandingsRefresh({ project, onProjectChange, compact }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isWorldCupCompetition(project.competition)) return null;

  const table = project.layers.leagueTable;
  const updatedAt = formatStandingsUpdatedAt(table?.importedAt);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath("/api/match-report/refresh/league-table"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = (await res.json()) as { project?: MatchReportProject; error?: string };
      if (!res.ok || !data.project) throw new Error(data.error || "Refresh failed");
      onProjectChange(data.project);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${compact ? "text-xs" : "text-sm"}`}
      style={{ borderColor: "rgba(56,189,248,0.35)", background: "rgba(14,116,144,0.12)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-sky-200">World Cup group standings</p>
          <p className="mt-1 text-[color:var(--text-secondary)]">
            Live from{" "}
            <a
              href="https://www.sport365.com/football/world-cup/group-stage#/standings"
              className="font-semibold text-sky-300 underline"
              target="_blank"
              rel="noreferrer"
            >
              Sport365
            </a>
            . Refreshes automatically before Build Picture, player ratings, and report generation.
          </p>
          {table ? (
            <p className="mt-2 text-[color:var(--text-secondary)]">
              Last updated {updatedAt}
              {table.groupCode ? ` · ${groupSummary(table)}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-[color:var(--text-secondary)]">Not imported yet — refresh pulls all 12 groups now.</p>
          )}
        </div>
        <R365Button variant="ghost" onClick={() => void refresh()} disabled={refreshing} className="shrink-0">
          {refreshing ? "Refreshing…" : table ? "Refresh now" : "Import live tables"}
        </R365Button>
      </div>
      {error ? <p className="mt-2 text-red-300">{error}</p> : null}
    </div>
  );
}
