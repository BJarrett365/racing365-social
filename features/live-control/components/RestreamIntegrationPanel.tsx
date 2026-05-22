"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Panel } from "@/app/components/Panel";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { RestreamChannel, RestreamIngest } from "@/features/live-control/services/restream-service";
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

type ChannelsRes = { channels?: RestreamChannel[]; error?: string };

export function RestreamIntegrationPanel() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const [adminToken, setAdminToken] = useState("");
  const [channels, setChannels] = useState<RestreamChannel[] | null>(null);
  const [ingest, setIngest] = useState<RestreamIngest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    setAdminToken(readStoredAdminToken());
  }, []);

  const loadChannels = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/integrations/restream/channels", { headers: adminHeaders(adminToken) });
      const data = await parseApiJson<ChannelsRes>(res);
      if (!res.ok) throw new Error(data.error || `Channels (${res.status})`);
      setChannels(data.channels ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Channels failed");
      setChannels(null);
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  const loadIngest = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/integrations/restream/stream-key", { headers: adminHeaders(adminToken) });
      const data = await parseApiJson<RestreamIngest & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || `Ingest (${res.status})`);
      setIngest({
        streamKey: data.streamKey,
        srtUrl: data.srtUrl ?? null,
        rtmpUrl: data.rtmpUrl,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ingest failed");
      setIngest(null);
    }
  }, [adminToken]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  const restreamOk = searchParams.get("restream") === "connected";
  const restreamError = searchParams.get("restream_error");

  async function connectOAuth() {
    setErr(null);
    try {
      const res = await fetch("/api/integrations/restream/auth", {
        headers: adminHeaders(adminToken),
        redirect: "manual",
      });
      if (res.status === 302) {
        const loc = res.headers.get("Location");
        if (loc) {
          window.location.href = loc;
          return;
        }
      }
      const data = await parseApiJson<{ error?: string }>(res);
      throw new Error(data.error || `OAuth (${res.status})`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "OAuth failed");
    }
  }

  async function toggleChannel(ch: RestreamChannel, nextActive: boolean) {
    setBusyId(ch.id);
    setErr(null);
    try {
      const res = await fetch(`/api/integrations/restream/channels/${ch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminHeaders(adminToken) },
        body: JSON.stringify({ adminToken: adminToken.trim() || undefined, active: nextActive }),
      });
      const data = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || `Update (${res.status})`);
      await loadChannels();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Toggle failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {restreamOk && (
        <div
          className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
          role="status"
        >
          Restream account connected. Reload channels if the list is empty.
        </div>
      )}
      {restreamError && (
        <div
          className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          OAuth: {restreamError}
        </div>
      )}

      <Panel title="Access">
        <p className="text-sm text-[color:var(--text-muted)]">
          <code className="text-[color:var(--text-secondary)]">RESTREAM_CLIENT_ID</code> and{" "}
          <code className="text-[color:var(--text-secondary)]">RESTREAM_CLIENT_SECRET</code> come from the{" "}
          <Link href="/admin" className="font-medium text-[color:var(--accent)] hover:underline">
            Admin
          </Link>{" "}
          panel. Env vars override when set. When <code className="text-[color:var(--text-secondary)]">ADMIN_TOKEN</code>{" "}
          is set for this app, enter it below for Live Control API calls.
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
            placeholder="Same as ADMIN_TOKEN when required"
          />
        </label>
      </Panel>

      <Panel title="Connect Restream">
        <p className="text-sm text-[color:var(--text-muted)]">
          Opens Restream login; tokens are stored server-side under <code className="text-xs">data/local/</code> and
          refreshed automatically.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={lcBtnPrimary} onClick={() => void connectOAuth()}>
            Connect Restream account
          </button>
          <button type="button" className={lcBtnGhost} style={lcBtnGhostStyle} onClick={() => void loadChannels()} disabled={loading}>
            {loading ? "Loading…" : "Refresh channels"}
          </button>
        </div>
      </Panel>

      {err && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      <Panel title="Channels">
        {!channels?.length && !loading && (
          <p className="text-sm text-[color:var(--text-muted)]">
            No channels yet. Connect Restream, then refresh. If OAuth succeeded but this stays empty, check API scopes
            and Restream app settings.
          </p>
        )}
        <ul className="divide-y rounded-lg border" style={{ borderColor: "var(--border)" }}>
          {(channels ?? []).map((ch) => (
            <li key={ch.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-medium text-[color:var(--text-primary)]">{ch.displayName || `Channel ${ch.id}`}</div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  id {ch.id}
                  {ch.url ? ` · ${ch.url}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[color:var(--text-muted)]">{ch.active === true ? "On" : "Off"}</span>
                <button
                  type="button"
                  className={lcBtnGhost}
                  style={lcBtnGhostStyle}
                  disabled={busyId === ch.id}
                  onClick={() => void toggleChannel(ch, ch.active !== true)}
                >
                  {ch.active === true ? "Disable" : "Enable"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Ingest">
        <p className="text-sm text-[color:var(--text-muted)]">
          Universal ingest for encoders (OBS, ffmpeg, etc.). Keep stream key private.
        </p>
        <button type="button" className={`${lcBtnPrimary} mt-3`} onClick={() => void loadIngest()}>
          Load ingest details
        </button>
        {ingest && (
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-[color:var(--text-muted)]">RTMP URL</dt>
              <dd className="break-all font-mono text-[color:var(--text-primary)]">{ingest.rtmpUrl}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--text-muted)]">Stream key</dt>
              <dd className="break-all font-mono text-[color:var(--text-primary)]">{ingest.streamKey}</dd>
            </div>
            {ingest.srtUrl && (
              <div>
                <dt className="text-[color:var(--text-muted)]">SRT</dt>
                <dd className="break-all font-mono text-[color:var(--text-primary)]">{ingest.srtUrl}</dd>
              </div>
            )}
          </dl>
        )}
      </Panel>
    </div>
  );
}
