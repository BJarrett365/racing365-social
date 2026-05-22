import { NextResponse } from "next/server";
import { withAppPathPrefix } from "@/app/lib/app-base-path";
import { buildShortPayload, type BuildShortRequestBody } from "@/app/lib/build-short-service";
import { ffmpegResolutionDebug } from "@/app/features/video/ffmpeg-utils";
import { isNetlifyHostedLambdaRuntime } from "@/app/lib/netlify-hosted-runtime";
import {
  createVideoBuildJob,
  failVideoBuildJob,
  resolveStaleVideoBuildJob,
} from "@/app/lib/video-build-jobs";

export const maxDuration = 300;

function siteOriginFromRequest(req: Request): string {
  return new URL(req.url).origin;
}

function internalBuildAuthHeader(): string | undefined {
  const secret = process.env.CRON_SECRET?.trim();
  return secret ? `Bearer ${secret}` : undefined;
}

function startVideoBuildWorker(origin: string, jobId: string, body: BuildShortRequestBody): void {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = internalBuildAuthHeader();
  if (auth) headers.Authorization = auth;

  void fetch(`${origin}${withAppPathPrefix("/api/video-build-worker")}`, {
    method: "POST",
    headers,
    redirect: "manual",
    body: JSON.stringify({ jobId, body }),
  })
    .then(async (res) => {
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location") ?? "";
        await failVideoBuildJob(
          jobId,
          `Video build worker invoke was redirected (${res.status}) to ${location || "login"}`,
        );
        return;
      }
      if (!res.ok && res.status !== 202) {
        const text = await res.text().catch(() => "");
        await failVideoBuildJob(jobId, text || `Video build worker invoke failed (${res.status})`);
      }
    })
    .catch(async (err) => {
      const message = err instanceof Error ? err.message : "Video build worker invoke failed";
      await failVideoBuildJob(jobId, message);
    });
}

export async function GET(req: Request) {
  const jobId = new URL(req.url).searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }
  const job = await resolveStaleVideoBuildJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BuildShortRequestBody;

    if (isNetlifyHostedLambdaRuntime()) {
      const jobId = `vb-${body.contentId}-${Date.now()}`;
      await createVideoBuildJob(jobId, body.contentId);
      startVideoBuildWorker(siteOriginFromRequest(req), jobId, body);
      return NextResponse.json(
        {
          async: true,
          jobId,
          status: "pending",
          message: "Video build started in the background. Poll until completed.",
        },
        { status: 202 },
      );
    }

    const payload = await buildShortPayload(body);
    if (payload.error) {
      return NextResponse.json(payload, { status: 400 });
    }
    if (!payload.videoPath) {
      return NextResponse.json({ error: "Video build finished without returning a video path." }, { status: 500 });
    }
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const ffmpegDebug = message.toLowerCase().includes("ffmpeg") ? ffmpegResolutionDebug() : undefined;
    return NextResponse.json({ error: message, debug: ffmpegDebug ? { ffmpeg: ffmpegDebug } : undefined }, { status: 500 });
  }
}
