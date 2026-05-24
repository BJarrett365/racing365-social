import { reconcilePlayerIntelligence } from "@/app/lib/match-report/reconcile-player-ratings";
import type { MatchReportProject, PlayerIntelligence, PlayerRatingEntry } from "@/app/lib/match-report/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sortRatings(entries: PlayerRatingEntry[]): PlayerRatingEntry[] {
  return [...entries].sort((a, b) => {
    const subA = a.isSubstitute ? 1 : 0;
    const subB = b.isSubstitute ? 1 : 0;
    if (subA !== subB) return subA - subB;
    return b.rating - a.rating;
  });
}

function renderTeamTable(
  teamName: string,
  entries: PlayerRatingEntry[],
  manOfTheMatch?: string,
): string {
  if (entries.length === 0) return "";
  const motmKey = manOfTheMatch?.trim().toLowerCase() ?? "";
  const rows = sortRatings(entries)
    .map((entry) => {
      const isMotm = motmKey && entry.name.trim().toLowerCase() === motmKey;
      return `<tr>
  <td>${escapeHtml(entry.name)}${isMotm ? " (MOTM)" : ""}${entry.isSubstitute ? " (Sub)" : ""}</td>
  <td>${escapeHtml(entry.position?.trim() || "—")}</td>
  <td>${entry.rating.toFixed(1)}</td>
  <td>${escapeHtml(entry.justification)}</td>
</tr>`;
    })
    .join("\n");

  return `<h2>${escapeHtml(teamName)} player ratings</h2>
<table>
  <thead>
    <tr><th>Player</th><th>Pos</th><th>Rating</th><th>Comment</th></tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>`;
}

export function renderPlayerRatingsHtml(
  intelligence: PlayerIntelligence,
  project?: MatchReportProject,
): string {
  const resolved = project ? reconcilePlayerIntelligence(project, intelligence) : intelligence;
  const home = resolved.ratings.filter((row) => row.team === "home");
  const away = resolved.ratings.filter((row) => row.team === "away");
  const blocks = [
    renderTeamTable(resolved.homeTeam, home, resolved.manOfTheMatch),
    renderTeamTable(resolved.awayTeam, away, resolved.manOfTheMatch),
  ].filter(Boolean);
  if (blocks.length === 0) return "";
  const motm = resolved.manOfTheMatch?.trim();
  return `${motm ? `<p><strong>Man of the match:</strong> ${escapeHtml(motm)}</p>\n` : ""}${blocks.join("\n\n")}`;
}
