import { NextResponse } from "next/server";
import { sport365ImportToFootballLineupBundle } from "@/app/lib/football-lineups/build-bundle";
import type { Sport365LineupImport } from "@/app/lib/match-report/parse-sport365-lineups";
import { newTemplateId, upsertUserFootballLineup } from "@/app/lib/user-templates-store";

type Body = {
  data?: Sport365LineupImport;
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
    const bundle = sport365ImportToFootballLineupBundle(id, imp);
    await upsertUserFootballLineup(bundle);
    return NextResponse.json({ success: true, id, editorPath: `/editor/football-lineups/${id}` });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Could not create template" },
      { status: 500 },
    );
  }
}
