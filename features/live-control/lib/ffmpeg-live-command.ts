/**
 * Server-side FFmpeg command lines for pushing to RTMP (never run in browser).
 */

export type FfmpegRtmpPushInput = {
  /** Local file path, device, or `-` for stdin. */
  input: string;
  /** Full RTMP URL including path (e.g. rtmp://global-live.mux.com:5222/app/STREAM_KEY). */
  rtmpUrl: string;
  /** Optional extra args before output (e.g. `-re`, `-c:v libx264`). */
  extraInputArgs?: string[];
  /** Optional extra args before output URL. */
  extraOutputArgs?: string[];
};

/**
 * Generate an ffmpeg command to push `input` to an RTMP destination.
 * Review security: `input` must come from trusted server paths only.
 */
export function buildFfmpegRtmpPushCommand(opts: FfmpegRtmpPushInput): string {
  const parts = ["ffmpeg", "-hide_banner", "-y"];
  if (opts.extraInputArgs?.length) {
    parts.push(...opts.extraInputArgs);
  } else {
    parts.push("-re");
  }
  parts.push("-i", opts.input);
  if (opts.extraOutputArgs?.length) {
    parts.push(...opts.extraOutputArgs);
  } else {
    parts.push("-c", "copy", "-f", "flv");
  }
  parts.push(opts.rtmpUrl);
  return parts.join(" ");
}

/**
 * Example: push test pattern to RTMP (use only in controlled environments).
 */
export function buildFfmpegTestPatternToRtmp(rtmpUrl: string): string {
  return [
    "ffmpeg",
    "-hide_banner",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=1280x720:rate=30",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=1000",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-c:a",
    "aac",
    "-f",
    "flv",
    rtmpUrl,
  ].join(" ");
}
