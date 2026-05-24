import { NextResponse } from "next/server";
import { listMatchReportCalendarFixtures } from "@/app/lib/match-report/fixture-calendar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scheduleSlug = url.searchParams.get("scheduleSlug")?.trim() || undefined;
  const fixtures = await listMatchReportCalendarFixtures(scheduleSlug);
  return NextResponse.json({ fixtures });
}
