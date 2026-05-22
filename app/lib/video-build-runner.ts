import { buildShortPayload, type BuildShortRequestBody } from "@/app/lib/build-short-service";
import { assertFfmpegAvailable, ffmpegResolutionDebug } from "@/app/features/video/ffmpeg-utils";
import {
  completeVideoBuildJob,
  failVideoBuildJob,
  markVideoBuildJobRunning,
  touchVideoBuildJobProgress,
} from "@/app/lib/video-build-jobs";

export async function runVideoBuildJob(jobId: string, body: BuildShortRequestBody): Promise<void> {
  const heartbeat = setInterval(() => {
    void touchVideoBuildJobProgress(jobId, "encoding");
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
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const ffmpegDebug = message.toLowerCase().includes("ffmpeg") ? ffmpegResolutionDebug() : undefined;
    await failVideoBuildJob(jobId, message, ffmpegDebug ? { ffmpeg: ffmpegDebug } : undefined);
  } finally {
    clearInterval(heartbeat);
  }
}
