import { getServerSecret } from "@/app/lib/server-secrets";

const MUX_API = "https://api.mux.com";

function muxBasicAuthHeader(): string {
  const id = getServerSecret("MUX_TOKEN_ID");
  const secret = getServerSecret("MUX_TOKEN_SECRET");
  if (!id || !secret) {
    throw new Error("MUX_TOKEN_ID and MUX_TOKEN_SECRET must be configured.");
  }
  const basic = Buffer.from(`${id}:${secret}`, "utf8").toString("base64");
  return `Basic ${basic}`;
}

export type MuxLiveStreamData = {
  id: string;
  stream_key?: string;
  reconnect_window?: number;
  active_asset_id?: string | null;
  status?: string;
  playback_ids?: Array<{ id: string; policy?: string }>;
  /** RTMP ingest URL from stream object */
  rtmp_url?: string;
};

export async function muxCreateLiveStream(body: {
  playback_policy?: string[];
  reconnect_window?: number;
  latency_mode?: string;
}): Promise<{ data: MuxLiveStreamData }> {
  const res = await fetch(`${MUX_API}/video/v1/live-streams`, {
    method: "POST",
    headers: {
      Authorization: muxBasicAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      playback_policy: body.playback_policy ?? ["public"],
      reconnect_window: body.reconnect_window ?? 60,
      latency_mode: body.latency_mode ?? "low",
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { data?: MuxLiveStreamData; error?: unknown };
  if (!res.ok) {
    const msg = JSON.stringify(data.error ?? data);
    throw new Error(`Mux create live stream failed (${res.status}): ${msg}`);
  }
  if (!data.data?.id) throw new Error("Mux create live stream: missing data.id");
  return { data: data.data };
}

export async function muxGetLiveStream(id: string): Promise<{ data: MuxLiveStreamData }> {
  const res = await fetch(`${MUX_API}/video/v1/live-streams/${encodeURIComponent(id)}`, {
    headers: { Authorization: muxBasicAuthHeader(), Accept: "application/json" },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { data?: MuxLiveStreamData; error?: unknown };
  if (!res.ok) {
    throw new Error(`Mux get live stream failed (${res.status}): ${JSON.stringify(data.error ?? data)}`);
  }
  if (!data.data) throw new Error("Mux get live stream: missing data");
  return { data: data.data };
}

export async function muxDeleteLiveStream(id: string): Promise<void> {
  const res = await fetch(`${MUX_API}/video/v1/live-streams/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: muxBasicAuthHeader(), Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text();
    throw new Error(`Mux delete live stream failed (${res.status}): ${t}`);
  }
}

/** Playback URL for Mux HLS (public policy). */
export function muxHlsPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}
