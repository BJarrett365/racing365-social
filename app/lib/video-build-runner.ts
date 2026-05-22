import { buildShortPayload, type BuildShortRequestBody } from "@/app/lib/build-short-service";
import { ffmpegResolutionDebug } from "@/app/features/video/ffmpeg-utils";
import {
  completeVideoBuildJob,
  failVideoBuildJob,
  markVideoBuildJobRunning,
  touchVideoBuildJobProgress,
} from "@/app/lib/video-build-jobs";

export async function runVideoBuildJob(jobId: string, body: BuildShortRequestBody): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6387c1'},body:JSON.stringify({sessionId:'6387c1',runId:'post-fix-v4',hypothesisId:'H11,H12',location:'app/lib/video-build-runner.ts:start',message:'video build job started',data:{jobId,contentId:body.contentId,sceneCount:body.scenes.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const heartbeat = setInterval(() => {
    void touchVideoBuildJobProgress(jobId, "encoding");
  }, 12_000);

  try {
    await markVideoBuildJobRunning(jobId);
    await touchVideoBuildJobProgress(jobId, "voice");
    const result = await buildShortPayload(body, {
      onProgress: async (phase) => {
        await touchVideoBuildJobProgress(jobId, phase);
      },
    });
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
    fetch('http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6387c1'},body:JSON.stringify({sessionId:'6387c1',runId:'post-fix-v4',hypothesisId:'H11,H12',location:'app/lib/video-build-runner.ts:complete',message:'video build job completed',data:{jobId,hasVideoPath:Boolean(result.videoPath)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const ffmpegDebug = message.toLowerCase().includes("ffmpeg") ? ffmpegResolutionDebug() : undefined;
    await failVideoBuildJob(jobId, message, ffmpegDebug ? { ffmpeg: ffmpegDebug } : undefined);
  } finally {
    clearInterval(heartbeat);
  }
}
