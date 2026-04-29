/**
 * Plexa Restream integration — high-level API (OAuth tokens via restream-token-store + refresh).
 */
import {
  restreamGetStreamKey,
  restreamListChannels,
  restreamSetChannelActive,
  type RestreamChannel,
} from "@/features/live-control/services/restream-user-api";

export type { RestreamChannel };

/** RTMP ingest URL used by Restream’s universal encoder settings (RTMP). */
const RESTREAM_RTMP_BASE = "rtmp://live.restream.io/live";

export type RestreamIngest = {
  streamKey: string;
  srtUrl: string | null;
  /** Universal RTMP URL including stream key path segment. */
  rtmpUrl: string;
};

export async function getRestreamChannels(): Promise<RestreamChannel[]> {
  return restreamListChannels();
}

export async function setRestreamChannelState(channelId: number, active: boolean): Promise<void> {
  return restreamSetChannelActive(channelId, active);
}

export async function getRestreamIngest(): Promise<RestreamIngest> {
  const { streamKey, srtUrl } = await restreamGetStreamKey();
  return {
    streamKey,
    srtUrl,
    rtmpUrl: `${RESTREAM_RTMP_BASE}/${streamKey}`,
  };
}
