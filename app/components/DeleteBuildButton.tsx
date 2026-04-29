"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { R365Button } from "@/app/components/R365Button";

type Props = {
  contentId: string;
  /** When set, only this manifest row is removed; files stay if other rows share `contentId`. */
  createdAt?: string;
  label?: string;
};

export function DeleteBuildButton({ contentId, createdAt, label = "Delete video & assets" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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
    const detail = createdAt
      ? "Removes only this library entry. MP4 and other files are deleted only if no other entry uses the same build id."
      : "Removes all manifest rows for this id and deletes MP4, subtitles, scene images on disk.";
    if (!confirm(`Delete “${contentId}”? ${detail}`)) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const tok = adminToken.trim();
      if (tok) headers["x-admin-token"] = tok;
      const res = await fetch("/api/assets/delete", {
        method: "POST",
        headers,
        body: JSON.stringify({
          contentId,
          ...(createdAt ? { createdAt } : {}),
          adminToken: tok || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
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
      <R365Button variant="danger" onClick={() => void run()} disabled={busy}>
        {busy ? "Deleting…" : label}
      </R365Button>
      {err && <p className="text-xs font-medium text-[color:var(--danger)]">{err}</p>}
    </div>
  );
}
