import { NextResponse } from "next/server";
import {
  isValidPlanetRugbyTableUrl,
  parsePlanetRugbyTable,
} from "@/app/lib/planet-rugby-table-parser";

type Body = { url?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || !isValidPlanetRugbyTableUrl(url)) {
    return NextResponse.json(
      { success: false, error: "Please provide a valid PlanetRugby.com tournament table URL." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Racing365Social/1.0; +https://www.planetrugby.com)",
      },
      cache: "no-store",
    });
    const html = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Could not fetch table page (${res.status})` },
        { status: 502 },
      );
    }
    const data = await parsePlanetRugbyTable(html, url);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Could not parse table data" },
      { status: 422 },
    );
  }
}
