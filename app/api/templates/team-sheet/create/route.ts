import { NextResponse } from "next/server";
import { sport365ImportToTeamSheetBundle } from "@/app/lib/team-sheet/build-bundle";
import type { Sport365LineupImport } from "@/app/lib/match-report/parse-sport365-lineups";
import { newTemplateId, upsertUserTeamSheet } from "@/app/lib/user-templates-store";
import type { TeamLineUpBrandStyle, TeamSheetBundle, TeamSheetVariant } from "@/types";

type Body = {
  data?: Sport365LineupImport;
  brandStyle?: TeamLineUpBrandStyle;
  sheetVariant?: TeamSheetVariant;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const imp = body.data;
  if (!imp?.homeTeam || !imp.awayTeam) {
    return NextResponse.json({ success: false, error: "Parsed line-up data is required." }, { status: 400 });
  }

  try {
    const id = newTemplateId();
    const brandStyle = body.brandStyle ?? "sport365";
    const sheetVariant = body.sheetVariant ?? "split";
    const bundle: TeamSheetBundle = sport365ImportToTeamSheetBundle(id, imp, brandStyle, { sheetVariant });
    await upsertUserTeamSheet(bundle);
    return NextResponse.json({ success: true, id, editorPath: `/editor/team-sheet/${id}` });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Could not create template" },
      { status: 500 },
    );
  }
}
