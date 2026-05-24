import { NextResponse } from "next/server";
import {
  buildEplScheduleRows,
  getEplFixtures,
  importBetwayEplSchedule,
  listMatchReportCalendarFixtures,
  resolveEplIdsFromIndex,
  syncEplScheduleToCalendar,
  updateEplFixture,
} from "@/app/lib/match-report/fixture-calendar";
import { BetwayListingFetchError } from "@/app/lib/match-report/fetch-betway-listing-fixtures";
import {
  EPL_BETWAY_UPCOMINGS_URL,
  EPL_COMPETITION,
  EPL_EDITORIAL_BRANDS,
} from "@/app/lib/match-report/premier-league-schedule";
import { getMatchReportRepository } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const repo = getMatchReportRepository();
  const indexEntries = await repo.listIndexEntries();
  const rows = await buildEplScheduleRows(indexEntries);
  const fixtures = await getEplFixtures();
  const calendar = await listMatchReportCalendarFixtures("epl");
  return NextResponse.json({
    competition: EPL_COMPETITION,
    brands: EPL_EDITORIAL_BRANDS,
    betwayListingUrl: EPL_BETWAY_UPCOMINGS_URL,
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
    const result = await resolveEplIdsFromIndex(indexEntries);
    const rows = await buildEplScheduleRows(indexEntries);
    return NextResponse.json({ ok: true, ...result, rows });
  }

  if (action === "fetch-betway") {
    try {
      const repo = getMatchReportRepository();
      const result = await importBetwayEplSchedule();
      const rows = await buildEplScheduleRows(await repo.listIndexEntries());
      const withBetway = result.fixtures.filter((row) => row.betwayMatchId).length;
      return NextResponse.json({
        ok: true,
        imported: result.count,
        betwayIds: withBetway,
        source: EPL_BETWAY_UPCOMINGS_URL,
        rows,
      });
    } catch (e) {
      const message =
        e instanceof BetwayListingFetchError ? e.message : e instanceof Error ? e.message : "Betway fetch failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const count = await syncEplScheduleToCalendar();
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

  const updated = await updateEplFixture(slug, { sixLogicMatchId, betwayMatchId });
  if (!updated) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  const repo = getMatchReportRepository();
  const rows = await buildEplScheduleRows(await repo.listIndexEntries());
  return NextResponse.json({ ok: true, fixture: updated, rows });
}
