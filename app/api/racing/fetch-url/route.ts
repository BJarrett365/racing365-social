import { NextResponse } from "next/server";
import { RacecardUrlImportError, fetchPlanetSportRacePayloadFromUrl } from "@/app/lib/parseRacecardUrl";
import {
  buildFastResultBundleDraftFromPlanetSport,
  buildNextOffBundleDraftFromPlanetSport,
} from "@/app/lib/planetSportToRacingBundles";

type Body = { url?: string; format?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const format = typeof body.format === "string" ? body.format.trim() : "";
  if (format !== "next-off" && format !== "fast-results") {
    return NextResponse.json({ error: "format must be next-off or fast-results" }, { status: 400 });
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Please enter a valid URL" }, { status: 400 });
  }

  try {
    const { api, sourceUrl } = await fetchPlanetSportRacePayloadFromUrl(url);
    if (format === "next-off") {
      const draft = buildNextOffBundleDraftFromPlanetSport(api, sourceUrl);
      return NextResponse.json({ format: "next-off", draft });
    }
    const draft = buildFastResultBundleDraftFromPlanetSport(api, sourceUrl);
    return NextResponse.json({ format: "fast-results", draft });
  } catch (e) {
    if (e instanceof RacecardUrlImportError) {
      const status =
        e.code === "empty" || e.code === "invalid_url"
          ? 400
          : e.code === "blocked"
            ? 403
            : 422;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: "We could not fetch data from this page", detail: message }, { status: 502 });
  }
}
