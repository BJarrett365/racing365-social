import { NextResponse } from "next/server";
import { getMatchReportJobAny, resolveStaleMatchReportJob } from "@/app/lib/match-report/jobs";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ jobId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { jobId } = await params;
  const job = (await resolveStaleMatchReportJob(jobId)) ?? (await getMatchReportJobAny(jobId));
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}
