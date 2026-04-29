"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { PublicPlexaLiveSession } from "@/features/live-control/lib/sanitize-session";
import {
  adminHeaders,
  lcBtnPrimary,
  lcInputClass,
  lcInputStyle,
  readStoredAdminToken,
  writeStoredAdminToken,
} from "@/features/live-control/components/live-control-ui";

type ListResponse = { sessions: PublicPlexaLiveSession[] };

export function LiveSessionsList() {
  const [adminToken, setAdminToken] = useState("");
  const [sessions, setSessions] = useState<PublicPlexaLiveSession[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAdminToken(readStoredAdminToken());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/live/sessions", { headers: adminHeaders(adminToken) });
      const data = await parseApiJson<ListResponse>(res);
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || `Failed (${res.status})`);
      }
      setSessions(data.sessions);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setSessions(null);
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <label className="block max-w-md text-sm font-medium text-[color:var(--text-secondary)]">
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
      <div className="flex flex-wrap gap-2">
        <button type="button" className={lcBtnPrimary} onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh sessions"}
        </button>
        <Link href="/live/new" className={lcBtnPrimary}>
          New live session
        </Link>
      </div>

      {err && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      {!sessions?.length && !loading && (
        <p className="text-sm text-[color:var(--text-muted)]">No sessions yet. Create one to get started.</p>
      )}

      <ul className="space-y-2">
        {(sessions ?? []).map((s) => (
          <li key={s.id}>
            <Link
              href={`/live/${encodeURIComponent(s.id)}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 transition hover:bg-[var(--surface-hover)]"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <div className="font-medium text-[color:var(--text-primary)]">{s.title}</div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  {s.provider} · {s.status}
                  {s.brand ? ` · ${s.brand}` : ""}
                </div>
              </div>
              <span className="font-mono text-xs text-[color:var(--text-muted)]">{s.id}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
