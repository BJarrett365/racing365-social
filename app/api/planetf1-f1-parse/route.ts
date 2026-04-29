import { NextResponse } from "next/server";
import {
  buildF1GridBundleFromSdms,
  buildF1ResultsBundleFromSdms,
  extractPlanetF1ResultsSlug,
  fetchMotorRaces,
  fetchMotorSession,
  findRaceByPlanetSlug,
} from "@/app/lib/planetf1-sdms-motor";

export const maxDuration = 60;

type Body = {
  url?: string;
  /** Import starting grid (qualifying order) or race classification + fastest-lap block. */
  mode?: "grid" | "race";
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = String(body.url ?? "").trim();
  const mode = body.mode === "race" ? "race" : "grid";
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const slug = extractPlanetF1ResultsSlug(url);
  if (!slug) {
    return NextResponse.json(
      {
        error:
          "Could not read a results slug from that URL. Use a PlanetF1 URL like https://www.planetf1.com/results/japanese-grand-prix",
      },
      { status: 400 },
    );
  }

  try {
    const races = await fetchMotorRaces();
    const race = findRaceByPlanetSlug(slug, races);
    if (!race) {
      return NextResponse.json(
        { error: `No race matched slug “${slug}”. Check the season list on PlanetF1.com.` },
        { status: 404 },
      );
    }

    const session = mode === "grid" ? "G1" : "R1";
    const rows = await fetchMotorSession(race.race_id, session);
    if (!rows.length) {
      return NextResponse.json(
        { error: `No ${mode === "grid" ? "grid" : "race"} data for ${race.race_name} yet.` },
        { status: 404 },
      );
    }

    const suffix = slug.slice(0, 48).replace(/[^a-z0-9-]+/g, "-");
    if (mode === "grid") {
      const bundle = buildF1GridBundleFromSdms(race, rows, suffix);
      return NextResponse.json({ ok: true as const, mode: "grid" as const, race, bundle });
    }
    const bundle = buildF1ResultsBundleFromSdms(race, rows, suffix);
    return NextResponse.json({ ok: true as const, mode: "race" as const, race, bundle });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
