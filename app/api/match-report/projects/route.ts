import { NextResponse } from "next/server";
import { linkContentToCalendarPhase } from "@/app/lib/editorial-calendar/store";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";
import type { CreateMatchReportProjectInput } from "@/app/lib/match-report/types";

const repo = getMatchReportRepository();

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await repo.listIndexEntries();
    return NextResponse.json({ entries });
  } catch (e) {
    const message = e instanceof Error ? e.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as CreateMatchReportProjectInput | null;
    if (!body?.matchId || !body.editorial?.targetBrand) {
      return NextResponse.json({ error: "matchId and editorial.targetBrand are required." }, { status: 400 });
    }
    if (body.reportFormat === "neutral_dual" && !body.awayEditorial?.targetBrand) {
      return NextResponse.json(
        { error: "awayEditorial.targetBrand is required for neutral dual reports." },
        { status: 400 },
      );
    }
    const result = await repo.createProject(body);
    if (body.calendarEventId) {
      const projectId = result.project?.id;
      if (projectId) {
        await linkContentToCalendarPhase({
          eventId: body.calendarEventId,
          phase: body.calendarPhase ?? "report_post",
          matchReportProjectId: projectId,
        }).catch(() => undefined);
      }
    }
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      const status =
        e.code === "SIXLOGICS_STOP" ? 422 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          ...(e.details ?? {}),
        },
        { status },
      );
    }
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
