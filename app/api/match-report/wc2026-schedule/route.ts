import { NextResponse } from "next/server";
import {
  buildWc2026ScheduleRows,
  getWc2026Fixtures,
  importBetwayWc2026Schedule,
  listMatchReportCalendarFixtures,
  resolveWc2026IdsFromIndex,
  syncWc2026ScheduleToCalendar,
  updateWc2026Fixture,
} from "@/app/lib/match-report/fixture-calendar";
import { BETWAY_WC2026_UPCOMINGS_URL } from "@/app/lib/match-report/betway-wc2026-constants";
import { BetwayWc2026FetchError } from "@/app/lib/match-report/fetch-betway-wc2026-fixtures";
import { getMatchReportRepository } from "@/app/lib/match-report/store";
import { WC2026_COMPETITION, WC2026_EDITORIAL_BRANDS } from "@/app/lib/match-report/wc2026-schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  const repo = getMatchReportRepository();
  const indexEntries = await repo.listIndexEntries();
  const rows = await buildWc2026ScheduleRows(indexEntries);
  const fixtures = await getWc2026Fixtures();
  const calendar = await listMatchReportCalendarFixtures("wc2026");
  return NextResponse.json({
    competition: WC2026_COMPETITION,
    brands: WC2026_EDITORIAL_BRANDS,
    betwayListingUrl: BETWAY_WC2026_UPCOMINGS_URL,
    rows,
    fixtures,
    calendar,
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  let action = url.searchParams.get("action")?.trim();
  if (!action) {
    try {
      const body = (await req.json()) as { action?: string };
      action = body.action?.trim();
    } catch {
      /* default sync */
    }
  }

  if (action === "resolve") {
    const repo = getMatchReportRepository();
    const indexEntries = await repo.listIndexEntries();
    const result = await resolveWc2026IdsFromIndex(indexEntries);
    const rows = await buildWc2026ScheduleRows(indexEntries);
    return NextResponse.json({ ok: true, ...result, rows });
  }

  if (action === "fetch-betway") {
    try {
      const repo = getMatchReportRepository();
      const result = await importBetwayWc2026Schedule();
      const rows = await buildWc2026ScheduleRows(await repo.listIndexEntries());
      const withBetway = result.fixtures.filter((row) => row.betwayMatchId).length;
      return NextResponse.json({
        ok: true,
        imported: result.count,
        betwayIds: withBetway,
        source: BETWAY_WC2026_UPCOMINGS_URL,
        rows,
      });
    } catch (e) {
      const message = e instanceof BetwayWc2026FetchError ? e.message : e instanceof Error ? e.message : "Betway fetch failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const count = await syncWc2026ScheduleToCalendar();
  return NextResponse.json({ ok: true, synced: count });
}

export async function PATCH(req: Request) {
  let body: { slug?: string; sixLogicMatchId?: string | null; betwayMatchId?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = body.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const sixLogicMatchId =
    body.sixLogicMatchId === null || body.sixLogicMatchId === undefined
      ? body.sixLogicMatchId
      : String(body.sixLogicMatchId).replace(/\D/g, "") || null;
  const betwayMatchId =
    body.betwayMatchId === null || body.betwayMatchId === undefined
      ? body.betwayMatchId
      : String(body.betwayMatchId).trim() || null;

  const updated = await updateWc2026Fixture(slug, { sixLogicMatchId, betwayMatchId });
  if (!updated) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  const repo = getMatchReportRepository();
  const rows = await buildWc2026ScheduleRows(await repo.listIndexEntries());
  return NextResponse.json({ ok: true, fixture: updated, rows });
}
