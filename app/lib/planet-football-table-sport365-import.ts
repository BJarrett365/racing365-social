import {
  resolveSport365StageRef,
  type Sport365StageRef,
} from "@/app/lib/match-report/fetch-sport365-competition-page";
import { fetchSport365MatchPageHtml } from "@/app/lib/match-report/fetch-sport365-match-page";
import {
  parseSport365MatchPageSummaryFromHtml,
  type Sport365MatchPageSummary,
} from "@/app/lib/match-report/parse-sport365-match-page-summary";
import type { GroupTableSnapshot, LeagueTableRowSnapshot } from "@/app/lib/match-report/types";
import {
  isWorldCupGroupStageImport,
  parseSport365GroupStandings,
} from "@/app/lib/match-report/parse-sport365-group-standings";
import type { PlanetFootballParsedTable } from "@/app/lib/planet-football-table-parser";
import type { PlanetFootballTableRow } from "@/types";

export type PlanetFootballGroupTableOption = {
  groupCode: string;
  groupName: string;
  rows: PlanetFootballTableRow[];
};

export type PlanetFootballGroupImportResult = {
  format: "group_stage";
  stage: Sport365StageRef;
  groupTables: PlanetFootballGroupTableOption[];
  selectedGroupCode: string;
  data: PlanetFootballParsedTable;
  matchContext?: Sport365MatchPageSummary;
  matchImportWarning?: string;
};

function isSport365MatchUrl(url: string): boolean {
  return /-vs-/i.test(url);
}

export function isSport365GroupStageTableUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (!/(^|\.)sport365\.com$/i.test(parsed.hostname)) return false;
    return isWorldCupGroupStageImport(url) || /\/group-stage\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function extractTeamHintsFromSport365MatchUrl(url: string): string[] {
  const match = url.match(/\/([a-z0-9-]+)-vs-([a-z0-9-]+)\//i);
  if (!match?.[1] || !match[2]) return [];
  const label = (slug: string) =>
    slug
      .split("-")
      .filter(Boolean)
      .map((part) => (part.length <= 3 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
      .join(" ");
  return [label(match[1]), label(match[2])];
}

function toTemplateRow(row: LeagueTableRowSnapshot): PlanetFootballTableRow {
  const gd =
    row.pointsDifference?.trim() ||
    (row.goalsFor !== undefined && row.goalsAgainst !== undefined
      ? String(row.goalsFor - row.goalsAgainst)
      : "");
  return {
    position: row.position,
    team: row.team,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    pointsDifference: gd.startsWith("+") || gd.startsWith("-") ? gd : gd ? `+${gd}` : "0",
    points: row.points,
  };
}

function groupToOption(group: GroupTableSnapshot): PlanetFootballGroupTableOption {
  return {
    groupCode: group.groupCode,
    groupName: group.groupName,
    rows: group.rows.map(toTemplateRow),
  };
}

function buildGroupTableData(input: {
  sourceUrl: string;
  stage: Sport365StageRef;
  group: PlanetFootballGroupTableOption;
}): PlanetFootballParsedTable {
  return {
    source: "Sport365",
    sourceUrl: input.sourceUrl,
    competition: `${input.group.groupName} · ${input.stage.competition}`,
    updatedAt: new Date().toISOString(),
    columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
    rows: input.group.rows,
    format: "group_stage",
    groupCode: input.group.groupCode,
  };
}

export async function importSport365GroupTablesForTemplate(
  sourceUrl: string,
  selectedGroupCode?: string,
): Promise<PlanetFootballGroupImportResult> {
  const trimmedUrl = sourceUrl.trim();
  let matchContext: Sport365MatchPageSummary | undefined;
  let matchImportWarning: string | undefined;

  if (isSport365MatchUrl(trimmedUrl)) {
    try {
      const html = await fetchSport365MatchPageHtml(trimmedUrl);
      matchContext = parseSport365MatchPageSummaryFromHtml(html, trimmedUrl) ?? undefined;
      if (!matchContext) {
        matchImportWarning = "Group tables imported, but match score could not be read from the page.";
      }
    } catch (e) {
      matchImportWarning =
        e instanceof Error ? e.message : "Group tables imported, but match score fetch failed.";
    }
  }

  const hints = extractTeamHintsFromSport365MatchUrl(trimmedUrl);
  const intelligence = await parseSport365GroupStandings({
    sourceUrl: trimmedUrl,
    homeTeam: hints[0] ?? "",
    awayTeam: hints[1] ?? "",
  });
  const stage = await resolveSport365StageRef(trimmedUrl);
  const groupTables = (intelligence.groupTables ?? []).map(groupToOption);
  if (groupTables.length === 0) {
    throw new Error("No group tables found in Sport365 standings data.");
  }
  const autoCode = intelligence.groupCode ?? groupTables[0]!.groupCode;
  const code = selectedGroupCode?.trim().toUpperCase() || autoCode;
  const selected =
    groupTables.find((group) => group.groupCode.toUpperCase() === code) ?? groupTables[0]!;

  return {
    format: "group_stage",
    stage,
    groupTables,
    selectedGroupCode: selected.groupCode,
    data: buildGroupTableData({ sourceUrl: trimmedUrl, stage, group: selected }),
    matchContext,
    matchImportWarning,
  };
}
