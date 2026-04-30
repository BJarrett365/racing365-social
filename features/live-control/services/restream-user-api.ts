import { readRestreamTokensAsync, writeRestreamTokensAsync, type RestreamStoredTokens } from "@/features/live-control/services/restream-token-store";
import { refreshRestreamAccessToken } from "@/features/live-control/services/restream-oauth";

const BASE = "https://api.restream.io";

async function getValidTokens(): Promise<RestreamStoredTokens> {
  const cur = await readRestreamTokensAsync();
  if (!cur) {
    throw new Error("Restream is not connected. Complete OAuth from Live Control.");
  }
  if (cur.accessExpiresAtMs && Date.now() < cur.accessExpiresAtMs) {
    return cur;
  }
  return refreshRestreamAccessToken(cur.refreshToken);
}

async function fetchWithRefresh(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> },
): Promise<Response> {
  const t = await getValidTokens();
  const headers = { Accept: "application/json", ...init.headers, Authorization: `Bearer ${t.accessToken}` };
  let res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    const cur = await readRestreamTokensAsync();
    if (!cur) throw new Error("Restream session lost");
    const next = await refreshRestreamAccessToken(cur.refreshToken);
    await writeRestreamTokensAsync(next);
    const headers2 = { Accept: "application/json", ...init.headers, Authorization: `Bearer ${next.accessToken}` };
    res = await fetch(`${BASE}${path}`, { ...init, headers: headers2 });
  }
  return res;
}

export type RestreamChannel = {
  id: number;
  streamingPlatformId?: number;
  displayName?: string;
  active?: boolean;
  url?: string;
};

export async function restreamListChannels(): Promise<RestreamChannel[]> {
  const res = await fetchWithRefresh("/v2/user/channel/all", { method: "GET" });
  const data = (await res.json().catch(() => null)) as RestreamChannel[] | { error?: unknown };
  if (!res.ok) {
    throw new Error(`Restream channels failed (${res.status}): ${JSON.stringify(data)}`);
  }
  if (!Array.isArray(data)) {
    throw new Error("Restream channels: unexpected response");
  }
  return data;
}

export async function restreamGetStreamKey(): Promise<{ streamKey: string; srtUrl: string | null }> {
  const res = await fetchWithRefresh("/v2/user/streamKey", { method: "GET" });
  const data = (await res.json().catch(() => ({}))) as {
    streamKey?: string;
    srtUrl?: string | null;
  };
  if (!res.ok) {
    throw new Error(`Restream stream key failed (${res.status}): ${JSON.stringify(data)}`);
  }
  if (!data.streamKey) {
    throw new Error("Restream stream key: missing streamKey");
  }
  return { streamKey: data.streamKey, srtUrl: data.srtUrl ?? null };
}

export async function restreamSetChannelActive(channelId: number, active: boolean): Promise<void> {
  const res = await fetchWithRefresh(`/v2/user/channel/${channelId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Restream channel update failed (${res.status}): ${text}`);
  }
}
