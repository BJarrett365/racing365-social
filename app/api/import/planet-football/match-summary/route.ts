import { NextResponse } from "next/server";
import { parseSport365MatchPageSummary } from "@/app/lib/match-report/parse-sport365-match-page-summary";

type Body = { url?: string };

export const runtime = "nodejs";

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
    const matchContext = await parseSport365MatchPageSummary(url);
    if (!matchContext) {
      return NextResponse.json(
        { success: false, error: "Could not read match score from that Sport365 page." },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, matchContext });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Match import failed" },
      { status: 500 },
    );
  }
}
