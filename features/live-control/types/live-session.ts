/**
 * Plexa Live Control — persisted live session (provider-agnostic shell).
 */

export type LiveSessionProvider = "mux" | "restream" | "mux_restream";

export type LiveSessionStatus =
  | "draft"
  | "starting"
  | "live"
  | "stopping"
  | "ended"
  | "error";

export type LiveHandoffIntent = "create" | "send_live";

export type LiveStreamMetadata = {
  headline?: string;
  sourceUrl?: string;
  summary?: string;
  /** Editing Studio project this session was created from or linked to. */
  editingProjectId?: string;
  /** Editorial / story reference for “send to live” flows (often same as project id). */
  approvedStoryId?: string;
  /** Asset references passed from Editing Studio (`rel:…`, `url:…`, `id:…`). */
  assetRefs?: string[];
  /** Which Editing Studio action prefilled this session. */
  editingHandoffIntent?: LiveHandoffIntent;
};

export type LiveSessionHealth = {
  mux?: { status?: string; activeAssetId?: string };
  restream?: { channelsConnected?: number };
  note?: string;
  updatedAt?: string;
};

export type PlexaLiveSession = {
  id: string;
  title: string;
  /** Session description (shown in UI; not the on-air headline). */
  description?: string;
  brand?: string;
  status: LiveSessionStatus;
  provider: LiveSessionProvider;
  /** Mux live stream id (Video API). */
  muxLiveStreamId?: string;
  /** Primary playback id for HLS preview. */
  muxPlaybackId?: string;
  /** RTMP ingest URL for Mux (from live stream response). */
  muxRtmpUrl?: string;
  /** Stream key for Mux RTMP (sensitive — only on server; UI shows masked when needed). */
  muxStreamKey?: string;
  /** Restream channel ids selected for this session (metadata). */
  restreamChannelIds?: number[];
  metadata?: LiveStreamMetadata;
  lastHealth?: LiveSessionHealth;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type LiveControlStoreV1 = {
  version: 1;
  sessions: Record<string, PlexaLiveSession>;
};

/** Canonical alias for `PlexaLiveSession` (shared internal Live Control model). */
export type LiveSession = PlexaLiveSession;
