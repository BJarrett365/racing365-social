"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { editingStudioProjectPath } from "@/features/editing-studio/utils/routes";
import { Panel } from "@/app/components/Panel";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { PublicPlexaLiveSession } from "@/features/live-control/lib/sanitize-session";
import type { PlexaLiveSession } from "@/features/live-control/types/live-session";
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

type PlaybackInfo = {
  hlsUrl: string | null;
  playbackId: string | null;
  muxLiveStreamId: string | null;
  status: string;
};

type SessionResponse = {
  session: PublicPlexaLiveSession;
  playback: PlaybackInfo;
};

export function LiveSessionDetailClient({ sessionId }: { sessionId: string }) {
  const [adminToken, setAdminToken] = useState("");
  const [data, setData] = useState<SessionResponse | null>(null);
  const [revealed, setRevealed] = useState<PlexaLiveSession | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ffmpegInput, setFfmpegInput] = useState("/tmp/source.mp4");
  const [ffmpegCmd, setFfmpegCmd] = useState<string | null>(null);
  const [restreamKey, setRestreamKey] = useState<string | null>(null);

  useEffect(() => {
    setAdminToken(readStoredAdminToken());
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    setRevealed(null);
    try {
      const res = await fetch(`/api/live/sessions/${encodeURIComponent(sessionId)}`, {
        headers: adminHeaders(adminToken),
      });
      const json = await parseApiJson<SessionResponse & { error?: string }>(res);
      if (!res.ok) {
        throw new Error(json.error || `Load failed (${res.status})`);
      }
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setData(null);
    }
  }, [adminToken, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (data?.session.status !== "live" && data?.session.status !== "starting") return undefined;
    const t = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(t);
  }, [load, data?.session.status]);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/live/sessions/${encodeURIComponent(sessionId)}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders(adminToken) },
        body: JSON.stringify({ adminToken: adminToken.trim() || undefined }),
      });
      const json = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error || `Start failed (${res.status})`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/live/sessions/${encodeURIComponent(sessionId)}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders(adminToken) },
        body: JSON.stringify({ adminToken: adminToken.trim() || undefined }),
      });
      const json = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error || `Stop failed (${res.status})`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Stop failed");
    } finally {
      setBusy(false);
    }
  }

  async function genFfmpeg() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/live/sessions/${encodeURIComponent(sessionId)}/ffmpeg-command`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders(adminToken) },
        body: JSON.stringify({ adminToken: adminToken.trim() || undefined, input: ffmpegInput }),
      });
      const json = await parseApiJson<{ command?: string; error?: string }>(res);
      if (!res.ok) throw new Error(json.error || `FFmpeg (${res.status})`);
      setFfmpegCmd(json.command ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "FFmpeg failed");
      setFfmpegCmd(null);
    } finally {
      setBusy(false);
    }
  }

  async function fetchRestreamKey() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/integrations/restream/stream-key", { headers: adminHeaders(adminToken) });
      const json = await parseApiJson<{ streamKey?: string; error?: string }>(res);
      if (!res.ok) throw new Error(json.error || `Stream key (${res.status})`);
      setRestreamKey(json.streamKey ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Stream key failed");
      setRestreamKey(null);
    } finally {
      setBusy(false);
    }
  }

  async function revealMuxSecrets() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/live/sessions/${encodeURIComponent(sessionId)}?includeSecrets=1`,
        { headers: adminHeaders(adminToken) },
      );
      const json = await parseApiJson<{ session?: PlexaLiveSession; error?: string }>(res);
      if (!res.ok || !json.session) throw new Error(json.error || `Reveal (${res.status})`);
      setRevealed(json.session);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reveal failed");
    } finally {
      setBusy(false);
    }
  }

  const session = data?.session;
  const playback = data?.playback;
  const playbackId = playback?.playbackId;
  const usesMux = session?.provider === "mux" || session?.provider === "mux_restream";
  const usesRestream = session?.provider === "restream" || session?.provider === "mux_restream";
  const muxKeyDisplay = revealed?.muxStreamKey ?? session?.muxStreamKeyMasked ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Live Control</p>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">{session?.title ?? "…"}</h1>
          {session?.description && (
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-secondary)]">{session.description}</p>
          )}
          <p className="mt-1 font-mono text-xs text-[color:var(--text-muted)]">{sessionId}</p>
        </div>
        <Link href="/live" className={lcBtnGhost} style={lcBtnGhostStyle}>
          Back to Live Control
        </Link>
      </div>

      <Panel title="Access">
        <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
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
          />
        </label>
      </Panel>

      {err && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      {session?.errorMessage && (
        <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          {session.errorMessage}
        </div>
      )}

      <Panel title="Stream control">
        {session && (
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <dt className="text-[color:var(--text-muted)]">Provider</dt>
              <dd className="font-medium text-[color:var(--text-primary)]">{session.provider}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--text-muted)]">Status</dt>
              <dd className="font-medium text-[color:var(--text-primary)]">{session.status}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--text-muted)]">Brand</dt>
              <dd className="text-[color:var(--text-primary)]">{session.brand ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--text-muted)]">Updated</dt>
              <dd className="text-[color:var(--text-primary)]">{session.updatedAt}</dd>
            </div>
          </dl>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={lcBtnPrimary} disabled={busy || !session} onClick={() => void start()}>
            Start
          </button>
          <button
            type="button"
            className={lcBtnGhost}
            style={lcBtnGhostStyle}
            disabled={busy || !session}
            onClick={() => void stop()}
          >
            Stop
          </button>
          <button type="button" className={lcBtnGhost} style={lcBtnGhostStyle} disabled={busy} onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </Panel>

      {usesMux && (
        <Panel title="Mux ingest & keys">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-[color:var(--text-muted)]">RTMP ingest URL</dt>
              <dd className="break-all font-mono text-xs text-[color:var(--text-primary)]">
                {session?.muxRtmpUrl ?? "— (start the stream to create a Mux live stream)"}
              </dd>
            </div>
            <div>
              <dt className="text-[color:var(--text-muted)]">Stream key</dt>
              <dd className="break-all font-mono text-xs text-[color:var(--text-primary)]">{muxKeyDisplay}</dd>
            </div>
          </dl>
          <button
            type="button"
            className={`${lcBtnGhost} mt-3`}
            style={lcBtnGhostStyle}
            disabled={busy}
            onClick={() => void revealMuxSecrets()}
          >
            Reveal full stream key (server-only)
          </button>
        </Panel>
      )}

      {usesMux && (
        <Panel title="Playback preview">
          {playbackId ? (
            <div className="space-y-2">
              <div
                className="aspect-video w-full overflow-hidden rounded-lg border bg-black/40"
                style={{ borderColor: "var(--border)" }}
              >
                <iframe
                  title="Mux playback"
                  src={`https://player.mux.com/${encodeURIComponent(playbackId)}`}
                  className="h-full w-full"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {playback?.hlsUrl && (
                <p className="break-all text-xs text-[color:var(--text-muted)]">HLS: {playback.hlsUrl}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--text-muted)]">
              Start the session and send a source to Mux to enable preview.
            </p>
          )}
        </Panel>
      )}

      <Panel title="Monitor">
        {session?.lastHealth ? (
          <pre
            className="max-h-64 overflow-auto rounded-lg border p-3 text-xs"
            style={{ borderColor: "var(--border)" }}
          >
            {JSON.stringify({ status: session.status, lastHealth: session.lastHealth }, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-[color:var(--text-muted)]">
            No health payload yet. Mux webhooks update this when configured.
          </p>
        )}
      </Panel>

      {usesRestream && (
        <Panel title="Restream ingest">
          <p className="text-sm text-[color:var(--text-muted)]">
            Universal ingest key (same for all sessions). Selected channel targets are stored on this session.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={lcBtnGhost}
              style={lcBtnGhostStyle}
              disabled={busy}
              onClick={() => void fetchRestreamKey()}
            >
              Show Restream stream key
            </button>
          </div>
          {restreamKey && (
            <p className="mt-2 break-all font-mono text-xs text-[color:var(--text-primary)]">{restreamKey}</p>
          )}
        </Panel>
      )}

      <Panel title="FFmpeg command (server-generated only)">
        <p className="text-sm text-[color:var(--text-muted)]">
          The server builds a command string; nothing runs in the browser.
        </p>
        <label className="mt-2 block text-sm font-medium text-[color:var(--text-secondary)]">
          Input path (trusted server path)
          <input
            className={lcInputClass}
            style={lcInputStyle}
            value={ffmpegInput}
            onChange={(e) => setFfmpegInput(e.target.value)}
          />
        </label>
        <button type="button" className={`${lcBtnPrimary} mt-3`} disabled={busy} onClick={() => void genFfmpeg()}>
          Generate command
        </button>
        {ffmpegCmd && (
          <pre
            className="mt-3 max-h-48 overflow-auto rounded-lg border p-3 text-xs"
            style={{ borderColor: "var(--border)" }}
          >
            {ffmpegCmd}
          </pre>
        )}
      </Panel>

      {session?.metadata && Object.keys(session.metadata).length > 0 && (
        <Panel title="Metadata & Editing Studio links">
          {session.metadata.editingProjectId && (
            <p className="mb-3 text-sm">
              <Link
                href={editingStudioProjectPath(session.metadata.editingProjectId)}
                className="font-medium text-[color:var(--accent)] hover:underline"
              >
                Open linked Editing Studio project
              </Link>
              <span className="ml-2 font-mono text-xs text-[color:var(--text-muted)]">
                {session.metadata.editingProjectId}
              </span>
            </p>
          )}
          <pre className="max-h-48 overflow-auto rounded-lg border p-3 text-xs" style={{ borderColor: "var(--border)" }}>
            {JSON.stringify(session.metadata, null, 2)}
          </pre>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            <code className="text-[color:var(--text-secondary)]">editingHandoffIntent</code> records whether the row
            came from &quot;Create Live Session&quot; or &quot;Send to Live&quot; in Editing Studio.
          </p>
        </Panel>
      )}
    </div>
  );
}
