import { NextResponse } from "next/server";
import { parseSport365MatchPageSummary } from "@/app/lib/match-report/parse-sport365-match-page-summary";
import { fetchSport365LineupImport } from "@/app/lib/match-report/parse-sport365-lineups";
import { sport365MatchToScoreLineBundle } from "@/app/lib/score-line/build-bundle";
import { newTemplateId, upsertUserScoreLine } from "@/app/lib/user-templates-store";
import type { ScoreLineBundle, TeamLineUpBrandStyle } from "@/types";

type Body = {
  url?: string;
  brandStyle?: TeamLineUpBrandStyle;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim() ?? "";
  if (!url || !/-vs-/i.test(url)) {
    return NextResponse.json(
      { success: false, error: "Paste a Sport365 match URL (must include -vs- in the path)." },
      { status: 400 },
    );
  }

  try {
    const match = await parseSport365MatchPageSummary(url);
    if (!match) {
      return NextResponse.json(
        { success: false, error: "Could not read match score from that Sport365 page." },
        { status: 404 },
      );
    }

    let competition: string | undefined;
    let matchDate: string | undefined;
    try {
      const lineup = await fetchSport365LineupImport(url);
      competition = lineup.competition;
      matchDate = lineup.matchDate;
    } catch {
      // Line-up optional — score line works from match summary alone.
    }

    const id = newTemplateId();
    const brandStyle = body.brandStyle ?? "sport365";
    const bundle: ScoreLineBundle = sport365MatchToScoreLineBundle(id, match, brandStyle, {
      competition,
      matchDate,
    });
    await upsertUserScoreLine(bundle);
    return NextResponse.json({ success: true, id, editorPath: `/editor/score-line/${id}` });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Could not create template" },
      { status: 500 },
    );
  }
}
