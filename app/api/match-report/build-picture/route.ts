import { after, NextResponse } from "next/server";
import { isNetlifyHostedLambdaRuntime } from "@/app/lib/netlify-hosted-runtime";
import { runMatchReportBuildPictureJob } from "@/app/lib/match-report/build-picture-runner";
import {
  createMatchReportJobAny,
  getMatchReportJobAny,
  newMatchReportJobId,
  resolveStaleMatchReportJob,
} from "@/app/lib/match-report/jobs";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

const repo = getMatchReportRepository();

type Body = { projectId?: string };

function siteOrigin(req: Request): string {
  const fromEnv = process.env.DEPLOY_PRIME_URL?.trim() || process.env.URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* fall through */
    }
  }
  return new URL(req.url).origin;
}

function internalAuthHeader(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;
  return headers;
}

async function invokeBackgroundBuildPicture(origin: string, jobId: string, projectId: string): Promise<boolean> {
  const url = `${origin}/.netlify/functions/match-report-build-background`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: internalAuthHeader(),
      redirect: "manual",
      body: JSON.stringify({ jobId, projectId }),
    });
    if (res.status === 404 || res.status === 502 || res.status === 503) return false;
    return res.ok || res.status === 202;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const jobId = new URL(req.url).searchParams.get("jobId")?.trim();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });
  const job = (await resolveStaleMatchReportJob(jobId)) ?? (await getMatchReportJobAny(jobId));
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }
    const project = await repo.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const jobId = newMatchReportJobId("build_picture");
    await createMatchReportJobAny(jobId, "build_picture", projectId);

    if (isNetlifyHostedLambdaRuntime()) {
      const origin = siteOrigin(req);
      after(async () => {
        const ok = await invokeBackgroundBuildPicture(origin, jobId, projectId);
        if (!ok) {
          try {
            await runMatchReportBuildPictureJob(jobId, projectId);
          } catch (e) {
            const message = e instanceof Error ? e.message : "Build Picture failed.";
            console.error("[match-report/build-picture] inline fallback failed", { jobId, message });
          }
        }
      });
      return NextResponse.json({ async: true, jobId, status: "pending" }, { status: 202 });
    }

    await runMatchReportBuildPictureJob(jobId, projectId);
    const job = (await getMatchReportJobAny(jobId))!;
    const updated = await repo.getProject(projectId);
    return NextResponse.json({ async: false, jobId, job, project: updated });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    const message = e instanceof Error ? e.message : "Build Picture failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
