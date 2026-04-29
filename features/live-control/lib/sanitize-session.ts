import type { PlexaLiveSession } from "@/features/live-control/types/live-session";

/** Client-safe session: never includes raw Mux stream key unless explicitly revealed server-side. */
export type PublicPlexaLiveSession = Omit<PlexaLiveSession, "muxStreamKey"> & {
  muxStreamKeyMasked?: string;
};

export function maskMuxStreamKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (key.length <= 4) return "••••";
  return `••••${key.slice(-4)}`;
}

export function toPublicLiveSession(session: PlexaLiveSession): PublicPlexaLiveSession {
  const { muxStreamKey, ...rest } = session;
  return {
    ...rest,
    muxStreamKeyMasked: maskMuxStreamKey(muxStreamKey),
  };
}

export function toPublicLiveSessionWithSecrets(session: PlexaLiveSession): PlexaLiveSession {
  return session;
}
