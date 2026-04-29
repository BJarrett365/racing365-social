import { NextResponse } from "next/server";
import {
  newTemplateId,
  upsertUserPlanetRugbyTable,
  createEmptyPlanetRugbyTableBundle,
} from "@/app/lib/user-templates-store";
import type { PlanetRugbyTableBundle } from "@/types";

type Body = {
  data?: Omit<PlanetRugbyTableBundle["table"], "source"> & { source?: "Planet Rugby"; imageUrl?: string };
};

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
    const base = createEmptyPlanetRugbyTableBundle(id);
    const bundle: PlanetRugbyTableBundle = {
      ...base,
      id,
      table: {
        source: "Planet Rugby",
        sourceUrl: table.sourceUrl ?? "",
        competition: table.competition ?? "Planet Rugby Table",
        updatedAt: table.updatedAt ?? "",
        columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
        rows: table.rows,
      },
      headline: `${table.competition ?? "Table"} Latest Table`,
      backgroundImageUrl: table.imageUrl ?? "",
    };
    await upsertUserPlanetRugbyTable(bundle);
    return NextResponse.json({ success: true, id, editorPath: `/editor/planet-rugby-table/${id}` });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Could not create template" },
      { status: 500 },
    );
  }
}
