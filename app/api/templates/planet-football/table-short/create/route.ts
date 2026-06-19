import { NextResponse } from "next/server";
import {
  createEmptyPlanetFootballTableBundle,
  newTemplateId,
  upsertUserPlanetFootballTable,
} from "@/app/lib/user-templates-store";
import { applySport365CardContentMode } from "@/app/lib/sport365-card-content-mode";
import { planetFootballTeamLogoUrl } from "@/app/lib/planet-football-team-logos";
import {
  normalizePlanetFootballDisplayBrand,
  planetFootballBrandDefaults,
} from "@/app/lib/planet-football-table-brands";
import type { PlanetFootballDisplayBrand, PlanetFootballTableBundle, PlanetFootballTableRow, Sport365MatchContext } from "@/types";

type Body = {
  data?: Omit<PlanetFootballTableBundle["table"], "source"> & { source?: "Sport365"; imageUrl?: string };
  groupTables?: PlanetFootballTableBundle["groupTables"];
  selectedGroupCode?: string;
  matchContext?: Sport365MatchContext;
  displayBrand?: PlanetFootballDisplayBrand;
};

function toInt(raw: unknown): number {
  const n = Number(String(raw ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normalizeRows(rows: PlanetFootballTableRow[]): PlanetFootballTableRow[] {
  return rows
    .map((row, index) => ({
      position: toInt(row.position) || index + 1,
      team: String(row.team ?? "").trim(),
      logoUrl:
        typeof row.logoUrl === "string" && row.logoUrl.trim()
          ? row.logoUrl.trim()
          : planetFootballTeamLogoUrl(String(row.team ?? "")),
      played: toInt(row.played),
      won: toInt(row.won),
      drawn: toInt(row.drawn),
      lost: toInt(row.lost),
      pointsDifference: String(row.pointsDifference ?? "").trim(),
      points: toInt(row.points),
    }))
    .filter((row) => row.team);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const table = body.data;
  if (!table || !Array.isArray(table.rows) || table.rows.length === 0) {
    return NextResponse.json({ success: false, error: "Parsed table data is required." }, { status: 400 });
  }

  try {
    const id = newTemplateId();
    const base = createEmptyPlanetFootballTableBundle(id);
    const rows = normalizeRows(table.rows);
    const groupTables = Array.isArray(body.groupTables)
      ? body.groupTables.map((group) => ({
          groupCode: group.groupCode,
          groupName: group.groupName,
          rows: normalizeRows(group.rows),
        }))
      : undefined;
    const competition = table.competition ?? "Standings";
    const hasMatch = Boolean(body.matchContext?.homeTeam);
    const displayBrand = normalizePlanetFootballDisplayBrand(body.displayBrand);
    const brandDefaults = planetFootballBrandDefaults(displayBrand);
    const bundle = applySport365CardContentMode(
      {
        ...base,
        id,
        displayBrand,
        burnSubtitles: brandDefaults.burnSubtitles,
        groupTables,
        selectedGroupCode: body.selectedGroupCode ?? table.groupCode,
        matchContext: body.matchContext,
        includeCommentaryInAi: hasMatch ? true : undefined,
        brandLogoScale: 1.85,
        table: {
          source: "Sport365",
          sourceUrl: body.matchContext?.sourceUrl ?? table.sourceUrl ?? "",
          competition,
          updatedAt: table.updatedAt ?? "",
          format: table.format,
          groupCode: table.groupCode ?? body.selectedGroupCode,
          columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
          rows,
        },
        introLine: `${competition} standings`,
        headline: competition,
        outroLine: brandDefaults.outroLine,
        backgroundImageUrl: table.imageUrl ?? "",
        showTeamLogos: false,
        highlightColor: brandDefaults.highlightColor,
      },
      hasMatch ? "table-score-scorers" : "table-only",
    );
    await upsertUserPlanetFootballTable(bundle);
    return NextResponse.json({ success: true, id, editorPath: `/editor/planet-football-table/${id}` });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Could not create template" },
      { status: 500 },
    );
  }
}
