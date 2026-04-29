"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";

type GuardRailFormat = "next-off" | "fast-results" | "racecard" | "teamtalk-news" | "f1-grid" | "f1-results";

const LABELS: Record<GuardRailFormat, string> = {
  "next-off": "Next Off",
  "fast-results": "Fast Results",
  racecard: "Racecard",
  "teamtalk-news": "TEAMtalk News",
  "f1-grid": "F1 Grid",
  "f1-results": "F1 Results",
};

const FORMATS = Object.keys(LABELS) as GuardRailFormat[];

export function GuardRailsForm() {
  const [rails, setRails] = useState<Record<GuardRailFormat, string>>({
    "next-off": "",
    "fast-results": "",
    racecard: "",
    "teamtalk-news": "",
    "f1-grid": "",
    "f1-results": "",
  });
  const [adminTokenRequired, setAdminTokenRequired] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/guard-rails")
      .then((r) => r.json())
      .then((d: { rails?: Partial<Record<GuardRailFormat, string>>; updatedAt?: string; adminTokenRequired?: boolean }) => {
        const next = { ...rails };
        for (const k of FORMATS) next[k] = String(d.rails?.[k] ?? "");
        setRails(next);
        setUpdatedAt(typeof d.updatedAt === "string" ? d.updatedAt : null);
        setAdminTokenRequired(Boolean(d.adminTokenRequired));
      })
      .catch(() => setErr("Could not load guard rails."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const tok = adminToken.trim();
      if (tok) headers["x-admin-token"] = tok;
      const res = await fetch("/api/guard-rails", {
        method: "POST",
        headers,
        body: JSON.stringify({ adminToken: tok || undefined, rails }),
      });
      const data = (await res.json()) as { error?: string; updatedAt?: string };
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setUpdatedAt(typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString());
      setMsg("Guard rails saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="AI template guard rails">
      <div className="space-y-4">
        {adminTokenRequired ? (
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Admin token
            <input
              type="password"
              className="mt-1 w-full max-w-xs rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="ADMIN_TOKEN from .env.local"
              autoComplete="off"
            />
          </label>
        ) : null}
        {FORMATS.map((fmt) => (
          <label key={fmt} className="block text-xs font-semibold uppercase text-slate-500">
            {LABELS[fmt]}
            <textarea
              className="mt-1 min-h-[96px] w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm normal-case text-slate-200"
              value={rails[fmt]}
              onChange={(e) => setRails((cur) => ({ ...cur, [fmt]: e.target.value }))}
            />
          </label>
        ))}
        <div className="flex items-center gap-2">
          <R365Button onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save guard rails"}
          </R365Button>
          {updatedAt ? <p className="text-xs text-slate-500">Updated {new Date(updatedAt).toLocaleString()}</p> : null}
        </div>
        {msg ? <p className="text-sm text-[#22c55e]">{msg}</p> : null}
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
      </div>
    </Panel>
  );
}
