import { NextResponse } from "next/server";
import {
  SixlogicsConfigError,
  SixlogicsFetchError,
  fetchSportccFixture,
} from "@/app/lib/data-studio/sixlogics-fixture";

function isDigits(s: string): boolean {
  return /^\d+$/.test(s);
}

/**
 * GET /api/data-studio/fixture?sport_id=1&match_id=2990360
 * Proxies SixLogics SportccFixture using server env credentials.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sportId = (searchParams.get("sport_id") ?? "1").trim();
  const matchId = (searchParams.get("match_id") ?? "").trim();

  if (!matchId) {
    return NextResponse.json({ ok: false, error: "match_id is required" }, { status: 400 });
  }
  if (!isDigits(sportId) || !isDigits(matchId)) {
    return NextResponse.json({ ok: false, error: "sport_id and match_id must be numeric strings" }, { status: 400 });
  }

  try {
    const { payload, keyPaths } = await fetchSportccFixture({ sportId, matchId });
    return NextResponse.json({
      ok: true,
      sport_id: sportId,
      match_id: matchId,
      keyPaths,
      payload,
    });
  } catch (e) {
    if (e instanceof SixlogicsConfigError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 503 });
    }
    if (e instanceof SixlogicsFetchError) {
      const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 502;
      return NextResponse.json({ ok: false, error: e.message }, { status });
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
