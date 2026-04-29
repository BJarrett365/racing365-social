/**
 * Server-side Mux Video API for Plexa (credentials via MUX_TOKEN_ID / MUX_TOKEN_SECRET).
 */
import type { MuxLiveStreamData } from "@/features/live-control/services/mux-live-api";
import {
  muxCreateLiveStream,
  muxDeleteLiveStream,
  muxGetLiveStream,
  muxHlsPlaybackUrl,
} from "@/features/live-control/services/mux-live-api";

export type { MuxLiveStreamData };

export type CreateMuxLiveStreamOptions = {
  playback_policy?: string[];
  reconnect_window?: number;
  latency_mode?: string;
};

export async function createMuxLiveStream(
  options: CreateMuxLiveStreamOptions = {},
): Promise<{ data: MuxLiveStreamData }> {
  return muxCreateLiveStream({
    playback_policy: options.playback_policy,
    reconnect_window: options.reconnect_window,
    latency_mode: options.latency_mode,
  });
}

export async function getMuxLiveStream(liveStreamId: string): Promise<{ data: MuxLiveStreamData }> {
  return muxGetLiveStream(liveStreamId);
}

/** HLS playback URL for a public playback ID (`.m3u8`). */
export function buildMuxPlaybackUrl(playbackId: string): string {
  return muxHlsPlaybackUrl(playbackId);
}

export async function deleteMuxLiveStream(liveStreamId: string): Promise<void> {
  return muxDeleteLiveStream(liveStreamId);
}

/** Derive ingest + playback fields for persistence from a live stream resource. */
export function muxLiveDataToSnapshot(data: MuxLiveStreamData): {
  streamKey: string;
  playbackId: string | null;
  playbackUrl: string | null;
  rtmpIngestUrl: string | null;
  status: string;
} {
  const playbackId = data.playback_ids?.[0]?.id ?? null;
  const streamKey = data.stream_key ?? "";
  const rtmpIngestUrl =
    data.rtmp_url ||
    (streamKey ? `rtmps://global-live.mux.com:443/app/${streamKey}` : null);
  return {
    streamKey,
    playbackId,
    playbackUrl: playbackId ? buildMuxPlaybackUrl(playbackId) : null,
    rtmpIngestUrl,
    status: data.status ?? "unknown",
  };
}
