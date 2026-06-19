import type { GeneratedContent, PlanetFootballTableRow, Sport365MatchContext, TemplateSource } from "@/types";
import {
  formatSport365MatchScoreLine,
  formatSport365ScorersLine,
  sanitizeSport365Scorers,
} from "@/app/lib/match-report/parse-sport365-match-page-summary";

export type LeagueTableAiRow = {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsDifference: string;
  points: number;
};

function toInt(raw: unknown): number {
  const n = Number(String(raw ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normalizeRow(raw: unknown): LeagueTableAiRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const team = String(row.team ?? "").trim();
  if (!team) return null;
  return {
    position: toInt(row.position),
    team,
    played: toInt(row.played),
    won: toInt(row.won),
    drawn: toInt(row.drawn),
    lost: toInt(row.lost),
    pointsDifference: String(row.pointsDifference ?? row.goalDifference ?? "").trim(),
    points: toInt(row.points),
  };
}

export function sport365MatchContextFromContent(
  content: GeneratedContent,
  templateSource?: TemplateSource,
): Sport365MatchContext | undefined {
  const source = templateSource ?? content.templateSource;
  if (source?.format !== "planet-football-table") return undefined;
  return source.bundle.matchContext;
}

/** Rows shown in the live table preview — bundle first, then materialised table scene. */
export function leagueTableRowsFromContent(
  content: GeneratedContent,
  templateSource?: TemplateSource,
): LeagueTableAiRow[] {
  const source = templateSource ?? content.templateSource;
  if (source?.format === "planet-football-table" || source?.format === "planet-rugby-table") {
    const bundleRows = source.bundle.table.rows
      .map(normalizeRow)
      .filter((row): row is LeagueTableAiRow => Boolean(row))
      .sort((a, b) => a.position - b.position);
    if (bundleRows.length > 0) return bundleRows;
  }

  const tableScene =
    content.scenes.find((s) => s.id === "table-1") ??
    content.scenes.find((s) => String(s.templateId ?? "").includes("table"));
  const sceneRows = Array.isArray(tableScene?.data?.rows) ? tableScene.data.rows : [];
  return sceneRows
    .map(normalizeRow)
    .filter((row): row is LeagueTableAiRow => Boolean(row))
    .sort((a, b) => a.position - b.position);
}

export function leagueTableMetaFromContent(
  content: GeneratedContent,
  templateSource?: TemplateSource,
): { competition: string; groupCode?: string; sourceUrl?: string } {
  const source = templateSource ?? content.templateSource;
  if (source?.format === "planet-football-table") {
    return {
      competition: source.bundle.table.competition,
      groupCode: source.bundle.table.groupCode ?? source.bundle.selectedGroupCode,
      sourceUrl: source.bundle.table.sourceUrl,
    };
  }
  if (source?.format === "planet-rugby-table") {
    return {
      competition: source.bundle.table.competition,
      sourceUrl: source.bundle.table.sourceUrl,
    };
  }
  const tableScene = content.scenes.find((s) => s.id === "table-1");
  return {
    competition: String(tableScene?.data?.competition ?? content.headline ?? "Standings").trim(),
  };
}

export function formatSport365MatchAiContext(match: Sport365MatchContext): string {
  const scorers = sanitizeSport365Scorers(match.scorers ?? []);
  const lines = [
    `Final score: ${formatSport365MatchScoreLine(match)}`,
    match.statusLabel || match.status ? `Status: ${match.statusLabel ?? match.status}` : null,
  ].filter(Boolean) as string[];

  if (scorers.length > 0) {
    lines.push("Goal scorers (include in voiceover — name each scorer when timing allows):");
    for (const scorer of scorers) {
      lines.push(
        `- ${scorer.minuteLabel} ${scorer.player}${scorer.type === "own_goal" ? " (OG)" : ""} (${scorer.team})`,
      );
    }
    lines.push(`Scorers summary: ${formatSport365ScorersLine({ ...match, scorers })}`);
  }

  return lines.join("\n");
}

export function formatLeagueTableAiContext(
  content: GeneratedContent,
  templateSource?: TemplateSource,
): string {
  const rows = leagueTableRowsFromContent(content, templateSource);
  const source = templateSource ?? content.templateSource;
  const match =
    source?.format === "planet-football-table" ? source.bundle.matchContext : sport365MatchContextFromContent(content, templateSource);
  const includeCommentary =
    source?.format === "planet-football-table" ? source.bundle.includeCommentaryInAi !== false : true;

  const blocks: string[] = [];

  if (match) {
    blocks.push("=== MATCH RESULT ===", formatSport365MatchAiContext(match));
    if (includeCommentary && match.commentaryDigest?.trim()) {
      blocks.push(
        "",
        "=== MATCH COMMENTARY DIGEST (for narrative colour only — do not replace scorer list above) ===",
        match.commentaryDigest.trim(),
      );
    }
    blocks.push("");
  }

  if (rows.length === 0) return blocks.join("\n");

  const meta = leagueTableMetaFromContent(content, templateSource);
  const header = [
    meta.competition,
    meta.groupCode ? `(Group ${meta.groupCode})` : null,
    "— standings on screen (Sport365)",
  ]
    .filter(Boolean)
    .join(" ");

  const lines = rows.map((row) => {
    const gd = row.pointsDifference || "0";
    return `${row.position}. ${row.team} — ${row.points} pts (P${row.played} W${row.won} D${row.drawn} L${row.lost} GD ${gd})`;
  });

  if (blocks.length > 0) blocks.push("");
  blocks.push("=== STANDINGS ON SCREEN ===", header, ...lines);
  return blocks.join("\n");
}
