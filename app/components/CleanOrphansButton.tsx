"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { R365Button } from "@/app/components/R365Button";

export function CleanOrphansButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [adminTokenRequired, setAdminTokenRequired] = useState(false);
  const [adminToken, setAdminToken] = useState("");

  useEffect(() => {
    void fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d: { adminTokenRequired?: boolean }) => setAdminTokenRequired(Boolean(d.adminTokenRequired)))
      .catch(() => {});
  }, []);

  const run = async () => {
    if (adminTokenRequired && !adminToken.trim()) {
      setErr("Enter your admin token first (same as ADMIN_TOKEN in .env.local).");
      return;
    }
    if (!confirm("Delete orphan MP4s in output/video that are no longer referenced in the asset manifest?")) {
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const tok = adminToken.trim();
      if (tok) headers["x-admin-token"] = tok;
      const res = await fetch("/api/assets/cleanup", {
        method: "POST",
        headers,
        body: JSON.stringify({ adminToken: tok || undefined }),
      });
      const data = (await res.json()) as { error?: string; deletedCount?: number };
      if (!res.ok) throw new Error(data.error || "Cleanup failed");
      const deletedCount = Number(data.deletedCount ?? 0);
      setMsg(
        deletedCount > 0
          ? `Removed ${deletedCount} orphan video file${deletedCount === 1 ? "" : "s"}.`
          : "No orphan video files found.",
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cleanup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {adminTokenRequired && (
        <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
          Admin token
          <input
            type="password"
            className="ui-input mt-1 w-full max-w-xs px-3 py-2 text-sm placeholder:text-[color:var(--text-muted)]"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="ADMIN_TOKEN from .env.local"
            autoComplete="off"
          />
        </label>
      )}
      <R365Button type="button" variant="ghost" onClick={() => void run()} disabled={busy}>
        {busy ? "Cleaning…" : "Clean orphan files now"}
      </R365Button>
      {msg && <p className="text-xs font-medium text-[color:var(--accent)]">{msg}</p>}
      {err && <p className="text-xs font-medium text-[color:var(--danger)]">{err}</p>}
    </div>
  );
}
