import {
  fetchSport365Json,
  resolveSport365StageRef,
  type Sport365StageRef,
} from "@/app/lib/match-report/fetch-sport365-competition-page";
import { WC_GROUP_STAGE_STANDINGS_URL } from "@/app/lib/match-report/league-table-defaults";
import type {
  GroupQualificationLegend,
  GroupTableSnapshot,
  LeagueTableIntelligence,
  LeagueTableRowSnapshot,
} from "@/app/lib/match-report/types";

export { WC_GROUP_STAGE_STANDINGS_URL };

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fc|republic)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function teamMatches(rowTeam: string, target: string): boolean {
  const a = normalizeTeamName(rowTeam);
  const b = normalizeTeamName(target);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  if (n % 10 === 1) return "st";
  if (n % 10 === 2) return "nd";
  if (n % 10 === 3) return "rd";
  return "th";
}

export function isWorldCupGroupStageImport(sourceUrl: string, competition?: string): boolean {
  if (/world-cup\/group-stage/i.test(sourceUrl)) return true;
  return /world cup|fifa world cup/i.test(competition ?? "");
}

type RawLegend = {
  stage_phase?: number;
  stage_phase_text?: string;
};

type RawTeam = {
  ranking?: number;
  team_name?: string;
  played?: unknown;
  wins?: unknown;
  draws?: unknown;
  loss?: unknown;
  goal_for?: unknown;
  goal_against?: unknown;
  goal_diff?: unknown;
  points?: unknown;
  stage_phase?: number;
};

type RawTable = {
  code?: number;
  name?: string;
  legend?: RawLegend[];
  teams?: RawTeam[];
};

type StageStandingsPayload = {
  L?: {
    tables?: RawTable[];
  };
};

function parseLegend(raw: RawLegend[] | undefined): GroupQualificationLegend[] {
  return (raw ?? [])
    .map((row) => ({
      stagePhase: asNumber(row.stage_phase),
      label: row.stage_phase_text?.trim() ?? "",
    }))
    .filter((row) => row.stagePhase > 0 && row.label);
}

function legendLabel(legend: GroupQualificationLegend[], stagePhase?: number): string | undefined {
  if (!stagePhase) return undefined;
  return legend.find((row) => row.stagePhase === stagePhase)?.label;
}

function defaultGroupQualification(position: number, teamCount = 4): string {
  if (position <= 0) return "";
  if (position <= 2) return "Qualification to next stage";
  if (position === 3 && teamCount >= 4) return "Possible qualification to next stage";
  if (position >= teamCount) return "Eliminated";
  return "";
}

function extractGroupCode(tableName: string, tableCode?: number): string {
  const match = tableName.match(/group\s*([A-Z])/i);
  if (match?.[1]) return match[1].toUpperCase();
  if (typeof tableCode === "number" && tableCode >= 0 && tableCode <= 25) {
    return String.fromCharCode(65 + tableCode);
  }
  return tableName.trim() || "Group";
}

function mapTeamRow(
  row: RawTeam,
  legend: GroupQualificationLegend[],
  teamCount: number,
  homeTeam: string,
  awayTeam: string,
): LeagueTableRowSnapshot | null {
  const team = row.team_name?.trim();
  if (!team) return null;
  const position = asNumber(row.ranking);
  const qualificationStatus =
    legendLabel(legend, row.stage_phase) || defaultGroupQualification(position, teamCount);
  return {
    position,
    team,
    played: asNumber(row.played),
    won: asNumber(row.wins),
    drawn: asNumber(row.draws),
    lost: asNumber(row.loss),
    goalsFor: asNumber(row.goal_for),
    goalsAgainst: asNumber(row.goal_against),
    pointsDifference: String(row.goal_diff ?? ""),
    points: asNumber(row.points ?? (row as { pts?: unknown }).pts),
    highlighted: teamMatches(team, homeTeam) || teamMatches(team, awayTeam),
    qualificationStatus,
  };
}

function mapGroupTable(raw: RawTable, homeTeam: string, awayTeam: string): GroupTableSnapshot | null {
  const groupName = raw.name?.trim() || "Group";
  const legend = parseLegend(raw.legend);
  const teams = raw.teams ?? [];
  const rows = teams
    .map((row) => mapTeamRow(row, legend, teams.length, homeTeam, awayTeam))
    .filter((row): row is LeagueTableRowSnapshot => Boolean(row))
    .sort((a, b) => a.position - b.position);
  if (rows.length < 2) return null;
  return {
    groupCode: extractGroupCode(groupName, raw.code),
    groupName,
    rows,
    legend: legend.length ? legend : undefined,
  };
}

function findMatchGroup(groups: GroupTableSnapshot[], homeTeam: string, awayTeam: string): GroupTableSnapshot | undefined {
  return groups.find((group) =>
    group.rows.some(
      (row) => teamMatches(row.team, homeTeam) || teamMatches(row.team, awayTeam),
    ),
  );
}

function formatRowLine(row: LeagueTableRowSnapshot): string {
  const tag = row.highlighted ? " *" : "";
  const qual = row.qualificationStatus ? ` · ${row.qualificationStatus}` : "";
  const gfGa =
    row.goalsFor !== undefined && row.goalsAgainst !== undefined
      ? ` GF${row.goalsFor} GA${row.goalsAgainst} GD${row.pointsDifference || row.goalsFor - row.goalsAgainst}`
      : "";
  return `${row.position}. ${row.team} — ${row.points} pts (P${row.played} W${row.won} D${row.drawn} L${row.lost}${gfGa})${qual}${tag}`;
}

function buildGroupStageDigest(input: {
  stage: Sport365StageRef;
  matchGroup?: GroupTableSnapshot;
  groupTables: GroupTableSnapshot[];
  homeTeamRow?: LeagueTableRowSnapshot;
  awayTeamRow?: LeagueTableRowSnapshot;
}): string {
  const header = `${input.stage.competition} group standings · Sport365 (${input.stage.sourceUrl})`;
  const lines: string[] = [header];

  if (input.matchGroup) {
    lines.push("", `Match group: ${input.matchGroup.groupName.toUpperCase()}`);
    if (input.homeTeamRow) {
      lines.push(
        `Home: ${input.homeTeamRow.team} — ${input.homeTeamRow.position}${ordinal(input.homeTeamRow.position)} · ${input.homeTeamRow.points} pts${input.homeTeamRow.qualificationStatus ? ` · ${input.homeTeamRow.qualificationStatus}` : ""}`,
      );
    }
    if (input.awayTeamRow) {
      lines.push(
        `Away: ${input.awayTeamRow.team} — ${input.awayTeamRow.position}${ordinal(input.awayTeamRow.position)} · ${input.awayTeamRow.points} pts${input.awayTeamRow.qualificationStatus ? ` · ${input.awayTeamRow.qualificationStatus}` : ""}`,
      );
    }
    lines.push("", input.matchGroup.groupName.toUpperCase(), ...input.matchGroup.rows.map(formatRowLine));
    const legend = input.matchGroup.legend ?? [];
    if (legend.length) {
      lines.push("", `Legend: ${legend.map((row) => row.label).join("; ")}`);
    }
  } else {
    lines.push("", "Groups imported (match teams not matched to a group yet):");
    for (const group of input.groupTables) {
      lines.push("", group.groupName.toUpperCase(), ...group.rows.map(formatRowLine));
    }
  }

  return lines.join("\n");
}

export async function parseSport365GroupStandings(input: {
  sourceUrl: string;
  homeTeam: string;
  awayTeam: string;
}): Promise<LeagueTableIntelligence> {
  const stage = await resolveSport365StageRef(input.sourceUrl);
  const payload = await fetchSport365Json<StageStandingsPayload>(`/v1/en/stage/soccer/${stage.stageId}`);
  const groupTables = (payload.L?.tables ?? [])
    .map((table) => mapGroupTable(table, input.homeTeam, input.awayTeam))
    .filter((table): table is GroupTableSnapshot => Boolean(table))
    .sort((a, b) => a.groupCode.localeCompare(b.groupCode));

  if (groupTables.length === 0) {
    throw new Error("No World Cup group tables found in Sport365 standings data.");
  }

  const matchGroup = findMatchGroup(groupTables, input.homeTeam, input.awayTeam);
  const rows = matchGroup?.rows ?? groupTables[0]!.rows;
  const homeTeamRow = rows.find((row) => teamMatches(row.team, input.homeTeam));
  const awayTeamRow = rows.find((row) => teamMatches(row.team, input.awayTeam));

  const intelligence: LeagueTableIntelligence = {
    sourceUrl: input.sourceUrl.trim(),
    source: "Sport365",
    competition: stage.competition,
    format: "group_stage",
    groupCode: matchGroup?.groupCode,
    groupTables,
    qualificationLegend: matchGroup?.legend,
    rows,
    homeTeamRow,
    awayTeamRow,
    homeStakes: homeTeamRow?.qualificationStatus,
    awayStakes: awayTeamRow?.qualificationStatus,
    digest: "",
    importedAt: new Date().toISOString(),
  };
  intelligence.digest = buildGroupStageDigest({
    stage,
    matchGroup,
    groupTables,
    homeTeamRow,
    awayTeamRow,
  });
  return intelligence;
}
