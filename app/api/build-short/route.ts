import { after, NextResponse } from "next/server";
import { buildShortPayload, type BuildShortRequestBody } from "@/app/lib/build-short-service";
import { ffmpegResolutionDebug } from "@/app/features/video/ffmpeg-utils";
import { isNetlifyHostedLambdaRuntime } from "@/app/lib/netlify-hosted-runtime";
import {
  completeVideoBuildJob,
  createVideoBuildJob,
  failVideoBuildJob,
  getVideoBuildJob,
  markVideoBuildJobRunning,
} from "@/app/lib/video-build-jobs";

export const maxDuration = 300;

async function runVideoBuildJob(jobId: string, body: BuildShortRequestBody): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6387c1'},body:JSON.stringify({sessionId:'6387c1',runId:'post-fix-v3',hypothesisId:'H10',location:'app/api/build-short/route.ts:runVideoBuildJob:start',message:'after() video build job started',data:{jobId,contentId:body.contentId,sceneCount:body.scenes.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
    await markVideoBuildJobRunning(jobId);
    const result = await buildShortPayload(body);
    if (result.error) {
      await failVideoBuildJob(jobId, result.error);
      return;
    }
    if (!result.videoPath) {
      await failVideoBuildJob(jobId, "Video build finished without returning a video path.");
      return;
    }
    await completeVideoBuildJob(jobId, result);
    // #region agent log
    fetch('http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6387c1'},body:JSON.stringify({sessionId:'6387c1',runId:'post-fix-v3',hypothesisId:'H10',location:'app/api/build-short/route.ts:runVideoBuildJob:complete',message:'after() video build job completed',data:{jobId,hasVideoPath:Boolean(result.videoPath)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const ffmpegDebug = message.toLowerCase().includes("ffmpeg") ? ffmpegResolutionDebug() : undefined;
    await failVideoBuildJob(jobId, message, ffmpegDebug ? { ffmpeg: ffmpegDebug } : undefined);
  }
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
      const jobId = `vb-${body.contentId}-${Date.now()}`;
      await createVideoBuildJob(jobId, body.contentId);
      after(async () => {
        await runVideoBuildJob(jobId, body);
      });
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
