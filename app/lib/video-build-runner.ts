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
  let heartbeatPhase = "starting";
  const heartbeat = setInterval(() => {
    void touchVideoBuildJobProgress(jobId, heartbeatPhase);
  }, 12_000);

  try {
    try {
      assertFfmpegAvailable();
    } catch (e) {
      const message = e instanceof Error ? e.message : "FFmpeg unavailable";
      await failVideoBuildJob(jobId, message, { ffmpeg: ffmpegResolutionDebug() });
      return;
    }

    await markVideoBuildJobRunning(jobId);
    heartbeatPhase = "voice";
    await touchVideoBuildJobProgress(jobId, heartbeatPhase);
    const result = await buildShortPayload(body, {
      onProgress: async (phase) => {
        heartbeatPhase = phase;
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
    heartbeatPhase = "saving";
    await touchVideoBuildJobProgress(jobId, heartbeatPhase);
    const persistedRel = await persistVideoOutputToBlob(result.videoPath);
    if (shouldUseNetlifyBlobStore() && !persistedRel) {
      await failVideoBuildJob(
        jobId,
        "Video encoded but could not persist to blob storage. Preview would be unavailable on live.",
      );
      return;
    }
    await completeVideoBuildJob(jobId, result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const ffmpegDebug = message.toLowerCase().includes("ffmpeg") ? ffmpegResolutionDebug() : undefined;
    await failVideoBuildJob(jobId, message, ffmpegDebug ? { ffmpeg: ffmpegDebug } : undefined);
  } finally {
    clearInterval(heartbeat);
  }
}
