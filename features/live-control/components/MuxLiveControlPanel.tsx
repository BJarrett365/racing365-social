"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { StoredMuxStream } from "@/features/live-control/services/mux-stream-store";
import type { MuxLiveStreamData } from "@/features/live-control/services/mux-provider-service";
import {
  adminHeaders,
  lcBtnGhost,
  lcBtnGhostStyle,
  lcBtnPrimary,
  lcInputClass,
  lcInputStyle,
  readStoredAdminToken,
  writeStoredAdminToken,
} from "@/features/live-control/components/live-control-ui";

type CreateRes = { record?: StoredMuxStream; live?: MuxLiveStreamData; error?: string };
type GetRes = { record?: StoredMuxStream; live?: MuxLiveStreamData | null; error?: string };

export function MuxLiveControlPanel() {
  const [adminToken, setAdminToken] = useState("");
  const [record, setRecord] = useState<StoredMuxStream | null>(null);
  const [live, setLive] = useState<MuxLiveStreamData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAdminToken(readStoredAdminToken());
  }, []);

  const refresh = useCallback(
    async (muxId: string) => {
      if (!muxId.trim()) return;
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch(`/api/live/providers/mux/${encodeURIComponent(muxId.trim())}`, {
          headers: adminHeaders(adminToken),
        });
        const data = await parseApiJson<GetRes>(res);
        if (!res.ok && !data.record) {
          throw new Error(data.error || `Get failed (${res.status})`);
        }
        if (data.record) setRecord(data.record);
        setLive(data.live ?? null);
        if (data.error) setErr(data.error);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Refresh failed");
      } finally {
        setBusy(false);
      }
    },
    [adminToken],
  );

  async function createStream() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/live/providers/mux/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders(adminToken) },
        body: JSON.stringify({ adminToken: adminToken.trim() || undefined }),
      });
      const data = await parseApiJson<CreateRes>(res);
      if (!res.ok || !data.record) {
        throw new Error(data.error || `Create failed (${res.status})`);
      }
      setRecord(data.record);
      setLive(data.live ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  const playbackId = record?.playbackId ?? null;

  return (
    <div className="space-y-6">
      <Panel title="Access">
        <p className="text-sm text-[color:var(--text-muted)]">
          <code className="text-[color:var(--text-secondary)]">MUX_TOKEN_ID</code>,{" "}
          <code className="text-[color:var(--text-secondary)]">MUX_TOKEN_SECRET</code>, and{" "}
          <code className="text-[color:var(--text-secondary)]">MUX_WEBHOOK_SIGNING_SECRET</code> are set in the{" "}
          <Link href="/admin" className="font-medium text-[color:var(--accent)] hover:underline">
            Admin
          </Link>{" "}
          panel (same store as other API keys). Env vars override when set. Point Mux webhooks to{" "}
          <code className="text-xs">/api/webhooks/mux</code>.
        </p>
        <label className="mt-3 block text-sm font-medium text-[color:var(--text-secondary)]">
          Admin token
          <input
            className={lcInputClass}
            style={lcInputStyle}
            type="password"
            autoComplete="off"
            value={adminToken}
            onChange={(e) => {
              const v = e.target.value;
              setAdminToken(v);
              writeStoredAdminToken(v);
            }}
            placeholder="When ADMIN_TOKEN is set"
          />
        </label>
      </Panel>

      <Panel title="Mux live stream">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={lcBtnPrimary} disabled={busy} onClick={() => void createStream()}>
            {busy ? "Working…" : "Create stream"}
          </button>
          <button
            type="button"
            className={lcBtnGhost}
            style={lcBtnGhostStyle}
            disabled={busy || !record?.muxLiveStreamId}
            onClick={() => record?.muxLiveStreamId && void refresh(record.muxLiveStreamId)}
          >
            Refresh status
          </button>
        </div>

        {err && (
          <div className="mt-3 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
            {err}
          </div>
        )}

        {record && (
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-[color:var(--text-muted)]">Live stream id</dt>
              <dd className="break-all font-mono text-[color:var(--text-primary)]">{record.muxLiveStreamId}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--text-muted)]">Status</dt>
              <dd className="font-medium text-[color:var(--text-primary)]">{live?.status ?? record.status}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--text-muted)]">RTMP ingest URL</dt>
              <dd className="break-all font-mono text-xs text-[color:var(--text-primary)]">
                {record.rtmpIngestUrl ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[color:var(--text-muted)]">Stream key</dt>
              <dd className="break-all font-mono text-xs text-[color:var(--text-primary)]">{record.streamKey || "—"}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--text-muted)]">Playback id</dt>
              <dd className="break-all font-mono text-xs text-[color:var(--text-primary)]">{record.playbackId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--text-muted)]">Playback URL (HLS)</dt>
              <dd className="break-all font-mono text-xs text-[color:var(--text-primary)]">{record.playbackUrl ?? "—"}</dd>
            </div>
          </dl>
        )}
      </Panel>

      {playbackId && (
        <Panel title="Playback preview">
          <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black/40" style={{ borderColor: "var(--border)" }}>
            <iframe
              title="Mux playback"
              src={`https://player.mux.com/${encodeURIComponent(playbackId)}`}
              className="h-full w-full"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </Panel>
      )}
    </div>
  );
}
