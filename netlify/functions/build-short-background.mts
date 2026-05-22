import { buildShortPayload, type BuildShortRequestBody } from "../../app/lib/build-short-service";
import {
  completeVideoBuildJob,
  failVideoBuildJob,
  markVideoBuildJobRunning,
} from "../../app/lib/video-build-jobs";
import { ffmpegResolutionDebug } from "../../app/features/video/ffmpeg-utils";

type BackgroundBody = {
  jobId?: string;
  body?: BuildShortRequestBody;
};

export default async (req: Request) => {
  let payload: BackgroundBody;
  try {
    payload = (await req.json()) as BackgroundBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const jobId = payload.jobId?.trim();
  const body = payload.body;
  if (!jobId || !body?.contentId || !body?.scenes?.length || !body?.script) {
    return new Response(JSON.stringify({ error: "jobId and build body required" }), { status: 400 });
  }

  try {
    await markVideoBuildJobRunning(jobId);
    const result = await buildShortPayload(body);
    if (result.error) {
      await failVideoBuildJob(jobId, result.error);
      return new Response(JSON.stringify({ ok: false, error: result.error }), { status: 200 });
    }
    if (!result.videoPath) {
      await failVideoBuildJob(jobId, "Video build finished without returning a video path.");
      return new Response(JSON.stringify({ ok: false, error: "missing videoPath" }), { status: 200 });
    }
    await completeVideoBuildJob(jobId, result);
    return new Response(JSON.stringify({ ok: true, jobId }), { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const ffmpegDebug = message.toLowerCase().includes("ffmpeg") ? ffmpegResolutionDebug() : undefined;
    await failVideoBuildJob(jobId, message, ffmpegDebug ? { ffmpeg: ffmpegDebug } : undefined);
    return new Response(JSON.stringify({ ok: false, error: message }), { status: 200 });
  }
};
