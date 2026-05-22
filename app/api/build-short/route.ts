import { NextResponse } from "next/server";
import { withAppPathPrefix } from "@/app/lib/app-base-path";
import { buildShortPayload, type BuildShortRequestBody } from "@/app/lib/build-short-service";
import { ffmpegResolutionDebug } from "@/app/features/video/ffmpeg-utils";
import { isNetlifyHostedLambdaRuntime } from "@/app/lib/netlify-hosted-runtime";
import {
  createVideoBuildJob,
  failVideoBuildJob,
  getVideoBuildJob,
} from "@/app/lib/video-build-jobs";

export const maxDuration = 300;

function siteOriginFromRequest(req: Request): string {
  return new URL(req.url).origin;
}

function internalBuildAuthHeader(): string | undefined {
  const secret = process.env.CRON_SECRET?.trim();
  return secret ? `Bearer ${secret}` : undefined;
}

function startBackgroundBuild(origin: string, jobId: string, body: BuildShortRequestBody): void {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = internalBuildAuthHeader();
  if (auth) headers.Authorization = auth;

  const runUrl = `${origin}${withAppPathPrefix("/api/build-short/run")}`;
  void fetch(runUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ jobId, body }),
  })
    .then(async (res) => {
      // #region agent log
      fetch('http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6387c1'},body:JSON.stringify({sessionId:'6387c1',runId:'post-fix-v2',hypothesisId:'H9',location:'app/api/build-short/route.ts:startBackgroundBuild',message:'internal run worker invoke response',data:{status:res.status,ok:res.ok,runUrl,hasAuth:Boolean(auth)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        await failVideoBuildJob(jobId, text || `Background run failed (${res.status})`);
      }
    })
    .catch(async (err) => {
      const message = err instanceof Error ? err.message : "Background run invoke failed";
      await failVideoBuildJob(jobId, message);
    });
}

export async function GET(req: Request) {
  const jobId = new URL(req.url).searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }
  const job = await getVideoBuildJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BuildShortRequestBody;

    if (isNetlifyHostedLambdaRuntime()) {
      if (!process.env.CRON_SECRET?.trim()) {
        return NextResponse.json(
          { error: "CRON_SECRET must be set on Netlify for background video builds." },
          { status: 503 },
        );
      }
      const jobId = `vb-${body.contentId}-${Date.now()}`;
      await createVideoBuildJob(jobId, body.contentId);
      startBackgroundBuild(siteOriginFromRequest(req), jobId, body);
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
    // #region agent log
    fetch('http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6387c1'},body:JSON.stringify({sessionId:'6387c1',runId:'live-ffmpeg-initial',hypothesisId:'H1,H2,H3,H4',location:'app/api/build-short/route.ts:catch',message:'build-short server error',data:{hasFfmpegDebug:Boolean(ffmpegDebug),error:message,ffmpegDebug},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ error: message, debug: ffmpegDebug ? { ffmpeg: ffmpegDebug } : undefined }, { status: 500 });
  }
}
