import { NextResponse } from "next/server";
import { fetchSport365LineupImport } from "@/app/lib/match-report/parse-sport365-lineups";

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const url = String(body.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ success: false, error: "Sport365 match URL is required." }, { status: 400 });
  }
  try {
    const data = await fetchSport365LineupImport(url);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Import failed" },
      { status: 502 },
    );
  }
}
