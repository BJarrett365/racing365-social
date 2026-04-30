import { newLiveSessionId } from "@/features/live-control/lib/new-live-id";
import {
  buildMuxPlaybackUrl,
  createMuxLiveStream,
  deleteMuxLiveStream,
  getMuxLiveStream,
} from "@/features/live-control/services/mux-provider-service";
import {
  findSessionByMuxLiveStreamIdAsync,
  getSessionAsync,
  listSessionsAsync,
  upsertSessionAsync,
} from "@/features/live-control/services/live-session-repository";
import { getRestreamChannels } from "@/features/live-control/services/restream-service";
import type {
  LiveSessionHealth,
  LiveSessionProvider,
  LiveSessionStatus,
  PlexaLiveSession,
} from "@/features/live-control/types/live-session";

function nowIso(): string {
  return new Date().toISOString();
}

export type CreateLiveSessionInput = {
  title: string;
  description?: string;
  brand?: string;
  provider: LiveSessionProvider;
  metadata?: PlexaLiveSession["metadata"];
  restreamChannelIds?: number[];
};

/**
 * Provider-agnostic facade for Plexa Live Control sessions.
 */
export async function createLiveSession(input: CreateLiveSessionInput): Promise<PlexaLiveSession> {
  const id = newLiveSessionId();
  const ts = nowIso();
  const row: PlexaLiveSession = {
    id,
    title: input.title.trim() || "Untitled live session",
    description: input.description?.trim() || undefined,
    brand: input.brand?.trim() || undefined,
    status: "draft",
    provider: input.provider,
    metadata: input.metadata,
    restreamChannelIds: input.restreamChannelIds,
    createdAt: ts,
    updatedAt: ts,
  };
  await upsertSessionAsync(row);
  return row;
}

export async function getLiveSession(id: string): Promise<PlexaLiveSession | null> {
  return getSessionAsync(id);
}

export async function findLiveSessionByMuxId(muxLiveStreamId: string): Promise<PlexaLiveSession | null> {
  return findSessionByMuxLiveStreamIdAsync(muxLiveStreamId);
}

export type UpdateLiveSessionInput = Partial<
  Pick<PlexaLiveSession, "title" | "description" | "brand" | "metadata" | "restreamChannelIds" | "provider">
>;

export async function updateLiveSession(id: string, patch: UpdateLiveSessionInput): Promise<PlexaLiveSession | null> {
  const cur = await getSessionAsync(id);
  if (!cur) return null;
  if (patch.provider !== undefined && patch.provider !== cur.provider && cur.status !== "draft") {
    throw new Error("Provider can only be changed while the session is in draft.");
  }
  const ts = nowIso();
  const next: PlexaLiveSession = {
    ...cur,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.brand !== undefined ? { brand: patch.brand } : {}),
    ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
    ...(patch.restreamChannelIds !== undefined ? { restreamChannelIds: patch.restreamChannelIds } : {}),
    ...(patch.provider !== undefined ? { provider: patch.provider } : {}),
    updatedAt: ts,
  };
  await upsertSessionAsync(next);
  return next;
}

export async function startLiveSession(id: string): Promise<PlexaLiveSession> {
  const cur = await getSessionAsync(id);
  if (!cur) throw new Error("Session not found");
  if (cur.status === "live" || cur.status === "starting") return cur;

  const ts = nowIso();
  let next: PlexaLiveSession = { ...cur, status: "starting", updatedAt: ts, errorMessage: undefined };

  if (cur.provider === "mux" || cur.provider === "mux_restream") {
    if (cur.muxLiveStreamId) {
      const { data } = await getMuxLiveStream(cur.muxLiveStreamId);
      const playbackId = data.playback_ids?.[0]?.id ?? cur.muxPlaybackId;
      const streamKey = data.stream_key ?? cur.muxStreamKey;
      const rtmp =
        (data as { rtmp_url?: string }).rtmp_url ||
        (streamKey ? `rtmps://global-live.mux.com:443/app/${streamKey}` : cur.muxRtmpUrl);
      next = {
        ...next,
        muxPlaybackId: playbackId,
        muxStreamKey: streamKey,
        muxRtmpUrl: rtmp,
        status: "live",
        lastHealth: { mux: { status: data.status }, updatedAt: ts },
      };
    } else {
      const { data } = await createMuxLiveStream({});
      const streamKey = data.stream_key;
      const playbackId = data.playback_ids?.[0]?.id;
      const rtmp =
        (data as { rtmp_url?: string }).rtmp_url ||
        (streamKey ? `rtmps://global-live.mux.com:443/app/${streamKey}` : undefined);
      next = {
        ...next,
        muxLiveStreamId: data.id,
        muxPlaybackId: playbackId,
        muxStreamKey: streamKey,
        muxRtmpUrl: rtmp,
        status: "live",
        lastHealth: { mux: { status: data.status }, updatedAt: ts },
      };
    }
  } else {
    next = { ...next, status: "live" };
  }

  await upsertSessionAsync(next);
  return next;
}

export async function stopLiveSession(id: string): Promise<PlexaLiveSession> {
  const cur = await getSessionAsync(id);
  if (!cur) throw new Error("Session not found");
  const ts = nowIso();
  if (cur.muxLiveStreamId) {
    try {
      await deleteMuxLiveStream(cur.muxLiveStreamId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Mux delete failed";
      const errRow: PlexaLiveSession = {
        ...cur,
        status: "error",
        errorMessage: msg,
        updatedAt: ts,
      };
      await upsertSessionAsync(errRow);
      throw e;
    }
  }
  const next: PlexaLiveSession = {
    ...cur,
    status: "ended",
    muxLiveStreamId: undefined,
    muxPlaybackId: undefined,
    muxStreamKey: undefined,
    muxRtmpUrl: undefined,
    updatedAt: ts,
  };
  await upsertSessionAsync(next);
  return next;
}

export type LiveTargets = {
  restreamChannels: Awaited<ReturnType<typeof getRestreamChannels>>;
};

export async function listTargets(): Promise<LiveTargets> {
  const restreamChannels = await getRestreamChannels().catch(() => [] as LiveTargets["restreamChannels"]);
  return { restreamChannels };
}

export type PlaybackInfo = {
  hlsUrl: string | null;
  playbackId: string | null;
  muxLiveStreamId: string | null;
  status: LiveSessionStatus;
};

export async function getPlaybackInfo(sessionId: string): Promise<PlaybackInfo> {
  const s = await getSessionAsync(sessionId);
  if (!s) {
    return { hlsUrl: null, playbackId: null, muxLiveStreamId: null, status: "ended" };
  }
  let playbackId = s.muxPlaybackId ?? null;
  let muxId = s.muxLiveStreamId ?? null;
  if (muxId && !playbackId) {
    try {
      const { data } = await getMuxLiveStream(muxId);
      playbackId = data.playback_ids?.[0]?.id ?? playbackId;
      muxId = data.id;
    } catch {
      /* keep stored */
    }
  }
  const hlsUrl = playbackId ? buildMuxPlaybackUrl(playbackId) : null;
  return {
    hlsUrl,
    playbackId,
    muxLiveStreamId: muxId,
    status: s.status,
  };
}

export async function listLiveSessions(): Promise<PlexaLiveSession[]> {
  return listSessionsAsync();
}

/**
 * Merge Mux Video webhook payload into the matching Plexa session (by Mux live stream id).
 */
export async function applyMuxLiveStreamWebhook(
  muxLiveStreamId: string,
  eventType: string,
  muxData: { status?: string; active_asset_id?: string | null },
): Promise<PlexaLiveSession | null> {
  const cur = await findSessionByMuxLiveStreamIdAsync(muxLiveStreamId);
  if (!cur || cur.status === "ended") {
    return cur;
  }
  const ts = nowIso();
  const lastHealth: LiveSessionHealth = {
    ...cur.lastHealth,
    mux: {
      status: muxData.status ?? cur.lastHealth?.mux?.status,
      activeAssetId: muxData.active_asset_id ?? cur.lastHealth?.mux?.activeAssetId,
    },
    updatedAt: ts,
  };
  let status: LiveSessionStatus = cur.status;
  if (eventType === "video.live_stream.active") {
    status = "live";
  }
  const next: PlexaLiveSession = {
    ...cur,
    lastHealth,
    status,
    updatedAt: ts,
  };
  await upsertSessionAsync(next);
  return next;
}
