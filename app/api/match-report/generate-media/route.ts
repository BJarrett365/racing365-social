import { NextResponse } from "next/server";
import { isNetlifyHostedLambdaRuntime } from "@/app/lib/netlify-hosted-runtime";
import {
  invokeMatchReportBackgroundFunction,
  matchReportJobSiteOrigin,
  scheduleMatchReportJob,
} from "@/app/lib/match-report/async-job-kickoff";
import { runMatchReportGenerateMediaJob } from "@/app/lib/match-report/generate-media-runner";
import {
  createMatchReportJobAny,
  failMatchReportJobAny,
  getMatchReportJobAny,
  markMatchReportJobRunningAny,
  newMatchReportJobId,
} from "@/app/lib/match-report/jobs";
import { shouldUseNetlifyBlobStore } from "@/app/lib/netlify-blob-json";
import { getMatchReportRepository } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

const repo = getMatchReportRepository();

type Body = { projectId?: string; includeSixteenConclusions?: boolean };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    if (!(await repo.getProject(projectId))) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const jobId = newMatchReportJobId("generate_media");
    await createMatchReportJobAny(jobId, "generate_media", projectId);

    const runJob = () =>
      runMatchReportGenerateMediaJob(projectId, jobId, {
        includeSixteenConclusions: body.includeSixteenConclusions ?? true,
      }).catch(async (e) => {
        await failMatchReportJobAny(jobId, e instanceof Error ? e.message : "Job failed");
      });

    if (isNetlifyHostedLambdaRuntime()) {
      const origin = matchReportJobSiteOrigin(req);
      const invoked = await invokeMatchReportBackgroundFunction(origin, "match-report-generate-media-background", {
        jobId,
        projectId,
        includeSixteenConclusions: body.includeSixteenConclusions ?? true,
      });
      if (!invoked) {
        try {
          await runMatchReportGenerateMediaJob(projectId, jobId, {
            includeSixteenConclusions: body.includeSixteenConclusions ?? true,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Media generation failed";
          return NextResponse.json({ error: message }, { status: 500 });
        }
        return NextResponse.json({
          project: await repo.getProject(projectId),
          job: await getMatchReportJobAny(jobId),
        });
      }
      return NextResponse.json({ async: true, jobId, status: "pending" }, { status: 202 });
    }

    scheduleMatchReportJob(runJob);
    void markMatchReportJobRunningAny(jobId, "AI is writing the report…");
    return NextResponse.json({ async: true, jobId, status: "pending" }, { status: 202 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Media generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
