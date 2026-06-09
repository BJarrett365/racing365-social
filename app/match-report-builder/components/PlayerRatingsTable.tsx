"use client";

import {
  normalizePlayerName,
  reconcilePlayerIntelligence,
} from "@/app/lib/match-report/reconcile-player-ratings";
import type { MatchReportProject, PlayerIntelligence, PlayerRatingEntry } from "@/app/lib/match-report/types";

function buildPositionIndex(project: MatchReportProject): Map<string, string> {
  const map = new Map<string, string>();
  for (const player of project.layers.optaPlayerData?.players ?? []) {
    if (player.position) map.set(`${player.team}:${normalizePlayerName(player.name)}`, player.position);
  }
  for (const side of ["home", "away"] as const) {
    const lineup = project.layers.sixLogic?.lineups?.[side];
    if (!lineup) continue;
    for (const player of [...lineup.starters, ...lineup.substitutes]) {
      if (player.position) map.set(`${side}:${normalizePlayerName(player.name)}`, player.position);
    }
  }
  return map;
}

function resolvePosition(
  entry: PlayerRatingEntry,
  positionIndex: Map<string, string>,
): string {
  if (entry.position?.trim()) return entry.position.trim();
  return positionIndex.get(`${entry.team}:${normalizePlayerName(entry.name)}`) ?? "—";
}

function ratingTone(rating: number): string {
  if (rating >= 8) return "text-emerald-300";
  if (rating >= 7) return "text-sky-300";
  if (rating >= 6) return "text-amber-300";
  return "text-red-300";
}

function sortRatings(entries: PlayerRatingEntry[]): PlayerRatingEntry[] {
  return [...entries].sort((a, b) => {
    const subA = a.isSubstitute ? 1 : 0;
    const subB = b.isSubstitute ? 1 : 0;
    if (subA !== subB) return subA - subB;
    return b.rating - a.rating;
  });
}

function TeamRatingsTable({
  teamName,
  entries,
  manOfTheMatch,
  positionIndex,
}: {
  teamName: string;
  entries: PlayerRatingEntry[];
  manOfTheMatch?: string;
  positionIndex: Map<string, string>;
}) {
  if (entries.length === 0) return null;
  const motmKey = manOfTheMatch ? normalizePlayerName(manOfTheMatch) : "";

  return (
    <section
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
    >
      <div
        className="border-b px-4 py-2.5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <h4 className="text-sm font-bold text-[color:var(--text-primary)]">{teamName}</h4>
        <p className="text-xs text-[color:var(--text-muted)]">{entries.length} players rated</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-[color:var(--text-muted)]"
              style={{ borderColor: "var(--border)" }}
            >
              <th className="px-4 py-2.5 font-semibold">Player</th>
              <th className="px-3 py-2.5 font-semibold">Pos</th>
              <th className="px-3 py-2.5 font-semibold">Rating</th>
              <th className="px-4 py-2.5 font-semibold">Comment</th>
            </tr>
          </thead>
          <tbody>
            {sortRatings(entries).map((entry) => {
              const isMotm = motmKey && normalizePlayerName(entry.name) === motmKey;
              return (
                <tr
                  key={`${entry.team}-${entry.name}`}
                  className="border-b align-top last:border-b-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-4 py-3 font-medium text-[color:var(--text-primary)]">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {entry.name}
                      {isMotm ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200"
                          style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)" }}
                        >
                          MOTM
                        </span>
                      ) : null}
                      {entry.isSubstitute ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                          Sub
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs font-semibold text-[color:var(--text-secondary)]">
                    {resolvePosition(entry, positionIndex)}
                  </td>
                  <td className={`px-3 py-3 text-base font-black tabular-nums ${ratingTone(entry.rating)}`}>
                    {entry.rating.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-xs leading-5 text-[color:var(--text-secondary)]">
                    {entry.justification}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type Props = {
  intelligence: PlayerIntelligence;
  project: MatchReportProject;
};

export function PlayerRatingsTable({ intelligence, project }: Props) {
  const reconciled = reconcilePlayerIntelligence(project, intelligence);
  const positionIndex = buildPositionIndex(project);
  const homeRatings = reconciled.ratings.filter((row) => row.team === "home");
  const awayRatings = reconciled.ratings.filter((row) => row.team === "away");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-emerald-300">
          {reconciled.ratings.length} ratings generated
        </span>
        {reconciled.manOfTheMatch ? (
          <span className="text-[color:var(--text-secondary)]">
            · MOTM <span className="font-semibold text-[color:var(--text-primary)]">{reconciled.manOfTheMatch}</span>
          </span>
        ) : null}
        {reconciled.usedOptaRatings ? (
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300"
            style={{ borderColor: "rgba(56,189,248,0.35)", background: "rgba(14,165,233,0.1)" }}
          >
            WhoScored / Opta
          </span>
        ) : null}
      </div>

      <TeamRatingsTable
        teamName={reconciled.homeTeam}
        entries={homeRatings}
        manOfTheMatch={reconciled.manOfTheMatch}
        positionIndex={positionIndex}
      />
      <TeamRatingsTable
        teamName={reconciled.awayTeam}
        entries={awayRatings}
        manOfTheMatch={reconciled.manOfTheMatch}
        positionIndex={positionIndex}
      />
    </div>
  );
}
