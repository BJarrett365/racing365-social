import { NextResponse } from "next/server";
import { buildShortPayload, type BuildShortRequestBody } from "@/app/lib/build-short-service";
import { ffmpegResolutionDebug } from "@/app/features/video/ffmpeg-utils";
import {
  completeVideoBuildJob,
  failVideoBuildJob,
  markVideoBuildJobRunning,
} from "@/app/lib/video-build-jobs";

export const maxDuration = 300;

type RunBody = {
  jobId?: string;
  body?: BuildShortRequestBody;
};

function assertInternalRunAccess(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET required for background video builds." }, { status: 503 });
  }
  const auth = req.headers.get("authorization")?.trim();
  const header = req.headers.get("x-cron-secret")?.trim();
  if (auth === `Bearer ${cronSecret}` || header === cronSecret) return null;
  return NextResponse.json({ error: "Invalid or missing cron secret." }, { status: 401 });
}

export async function POST(req: Request) {
  const denied = assertInternalRunAccess(req);
  if (denied) return denied;

  let payload: RunBody;
  try {
    payload = (await req.json()) as RunBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const jobId = payload.jobId?.trim();
  const body = payload.body;
  if (!jobId || !body?.contentId || !body?.scenes?.length || !body?.script) {
    return NextResponse.json({ error: "jobId and build body required" }, { status: 400 });
  }

  // #region agent log
  fetch('http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6387c1'},body:JSON.stringify({sessionId:'6387c1',runId:'post-fix-v2',hypothesisId:'H9',location:'app/api/build-short/run/route.ts:start',message:'background run worker started',data:{jobId,contentId:body.contentId,sceneCount:body.scenes.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  try {
    await markVideoBuildJobRunning(jobId);
    const result = await buildShortPayload(body);
    if (result.error) {
      await failVideoBuildJob(jobId, result.error);
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
    }
    if (!result.videoPath) {
      await failVideoBuildJob(jobId, "Video build finished without returning a video path.");
      return NextResponse.json({ ok: false, error: "missing videoPath" }, { status: 200 });
    }
    await completeVideoBuildJob(jobId, result);
    // #region agent log
    fetch('http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6387c1'},body:JSON.stringify({sessionId:'6387c1',runId:'post-fix-v2',hypothesisId:'H9',location:'app/api/build-short/run/route.ts:complete',message:'background run worker completed',data:{jobId,hasVideoPath:Boolean(result.videoPath)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ ok: true, jobId, videoPath: result.videoPath });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const ffmpegDebug = message.toLowerCase().includes("ffmpeg") ? ffmpegResolutionDebug() : undefined;
    await failVideoBuildJob(jobId, message, ffmpegDebug ? { ffmpeg: ffmpegDebug } : undefined);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
