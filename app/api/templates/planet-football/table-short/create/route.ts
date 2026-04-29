import { NextResponse } from "next/server";
import {
  createEmptyPlanetFootballTableBundle,
  newTemplateId,
  upsertUserPlanetFootballTable,
} from "@/app/lib/user-templates-store";
import { planetFootballTeamLogoUrl } from "@/app/lib/planet-football-team-logos";
import type { PlanetFootballTableBundle } from "@/types";

type Body = {
  data?: Omit<PlanetFootballTableBundle["table"], "source"> & { source?: "Sport365"; imageUrl?: string };
};

function toInt(raw: unknown): number {
  const n = Number(String(raw ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
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
    const rows = table.rows
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
    const bundle: PlanetFootballTableBundle = {
      ...base,
      id,
      table: {
        source: "Sport365",
        sourceUrl: table.sourceUrl ?? "",
        competition: table.competition ?? "Premier League",
        updatedAt: table.updatedAt ?? "",
        columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
        rows,
      },
      introLine: `${table.competition ?? "Premier League"} latest table`,
      headline: `${table.competition ?? "Table"} Latest Table`,
      outroLine: "For more football coverage, head to Sport365.com",
      backgroundImageUrl: table.imageUrl ?? "",
      showTeamLogos: false,
    };
    await upsertUserPlanetFootballTable(bundle);
    return NextResponse.json({ success: true, id, editorPath: `/editor/planet-football-table/${id}` });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Could not create template" },
      { status: 500 },
    );
  }
}
