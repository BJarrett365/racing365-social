import "server-only";

import { defaultLeagueTableUrl, shouldKeepWorldCupStandingsFresh } from "@/app/lib/match-report/league-table-defaults";
import { parseMatchReportLeagueTable } from "@/app/lib/match-report/parse-league-table";
import type { MatchReportProject } from "@/app/lib/match-report/types";
import { getMatchReportRepository } from "@/app/lib/match-report/store";

export { shouldKeepWorldCupStandingsFresh } from "@/app/lib/match-report/league-table-defaults";

type MatchReportRepository = ReturnType<typeof getMatchReportRepository>;

export async function fetchFreshLeagueTableForProject(
  project: MatchReportProject,
): Promise<Awaited<ReturnType<typeof parseMatchReportLeagueTable>>> {
  const sourceUrl = project.layers.leagueTable?.sourceUrl ?? defaultLeagueTableUrl(project.competition);
  return parseMatchReportLeagueTable(
    sourceUrl,
    project.homeTeam,
    project.awayTeam,
    project.layers.leagueTable?.tableView,
    project.competition,
  );
}

/** Pull latest Sport365 group standings for World Cup projects. */
export async function ensureFreshWorldCupStandings(
  repo: MatchReportRepository,
  project: MatchReportProject,
): Promise<MatchReportProject> {
  if (!shouldKeepWorldCupStandingsFresh(project)) return project;
  try {
    const leagueTable = await fetchFreshLeagueTableForProject(project);
    return repo.updateLeagueTable(project.id, leagueTable);
  } catch {
    return project;
  }
}

export async function ensureFreshWorldCupStandingsById(
  repo: MatchReportRepository,
  projectId: string,
): Promise<MatchReportProject | null> {
  const project = await repo.getProject(projectId);
  if (!project) return null;
  return ensureFreshWorldCupStandings(repo, project);
}
