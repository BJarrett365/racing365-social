import { NextResponse } from "next/server";
import { sport365ImportToTeamLineUpBundle } from "@/app/lib/team-line-up/build-bundle";
import type { Sport365LineupImport } from "@/app/lib/match-report/parse-sport365-lineups";
import { newTemplateId, upsertUserTeamLineUp } from "@/app/lib/user-templates-store";
import type { TeamLineUpBrandStyle, TeamLineUpBundle } from "@/types";

type Body = {
  data?: Sport365LineupImport;
  brandStyle?: TeamLineUpBrandStyle;
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
    const bundle: TeamLineUpBundle = sport365ImportToTeamLineUpBundle(id, imp, brandStyle);
    await upsertUserTeamLineUp(bundle);
    return NextResponse.json({ success: true, id, editorPath: `/editor/team-line-up/${id}` });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Could not create template" },
      { status: 500 },
    );
  }
}
