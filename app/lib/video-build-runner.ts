import { buildShortPayload, type BuildShortRequestBody } from "@/app/lib/build-short-service";
import { assertFfmpegAvailable, ffmpegResolutionDebug } from "@/app/features/video/ffmpeg-utils";
import { shouldUseNetlifyBlobStore } from "@/app/lib/netlify-blob-json";
import { persistVideoOutputToBlob } from "@/app/lib/video-blob-assets";
import {
  completeVideoBuildJob,
  failVideoBuildJob,
  markVideoBuildJobRunning,
  touchVideoBuildJobProgress,
} from "@/app/lib/video-build-jobs";

export async function runVideoBuildJob(jobId: string, body: BuildShortRequestBody): Promise<void> {
  console.info("[video-build] start", { jobId, contentId: body.contentId, sceneCount: body.scenes.length });
  let heartbeatPhase = "starting";
  const heartbeat = setInterval(() => {
    void touchVideoBuildJobProgress(jobId, heartbeatPhase);
  }, 12_000);

  try {
    try {
      assertFfmpegAvailable();
    } catch (e) {
      const message = e instanceof Error ? e.message : "FFmpeg unavailable";
      console.error("[video-build] ffmpeg unavailable", { jobId, message });
      await failVideoBuildJob(jobId, message, { ffmpeg: ffmpegResolutionDebug() });
      return;
    }

    await markVideoBuildJobRunning(jobId);
    heartbeatPhase = "voice";
    await touchVideoBuildJobProgress(jobId, heartbeatPhase);
    console.info("[video-build] voice", { jobId });
    const result = await buildShortPayload(body, {
      onProgress: async (phase) => {
        heartbeatPhase = phase;
        await touchVideoBuildJobProgress(jobId, phase);
      },
    });
    if (result.error) {
      console.error("[video-build] encode error", { jobId, error: result.error });
      await failVideoBuildJob(jobId, result.error);
      return;
    }
    if (!result.videoPath) {
      await failVideoBuildJob(jobId, "Video build finished without returning a video path.");
      return;
    }
    heartbeatPhase = "saving";
    await touchVideoBuildJobProgress(jobId, heartbeatPhase);
    console.info("[video-build] saving", { jobId, videoPath: result.videoPath });
    const persistedRel = await persistVideoOutputToBlob(result.videoPath);
    if (shouldUseNetlifyBlobStore() && !persistedRel) {
      await failVideoBuildJob(
        jobId,
        "Video encoded but could not persist to blob storage. Preview would be unavailable on live.",
      );
      return;
    }
    await completeVideoBuildJob(jobId, result);
    console.info("[video-build] completed", { jobId, videoPath: result.videoPath });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[video-build] failed", { jobId, message });
    const ffmpegDebug = message.toLowerCase().includes("ffmpeg") ? ffmpegResolutionDebug() : undefined;
    await failVideoBuildJob(jobId, message, ffmpegDebug ? { ffmpeg: ffmpegDebug } : undefined);
  } finally {
    clearInterval(heartbeat);
  }
}
