"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import type { PlexaUserRole, PublicPlexaUser } from "@/app/lib/auth/types";

const inputClass = "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";
const roleOptions: Array<[PlexaUserRole, string]> = [
  ["admin", "Admin"],
  ["editor", "Editor"],
  ["viewer", "Viewer"],
  ["meeting_guest", "Meeting Guest"],
  ["meeting_host", "Meeting Host"],
  ["audio_user", "Audio User"],
  ["audio_editor", "Audio Editor"],
];

export function UserManagementPanel() {
  const [users, setUsers] = useState<PublicPlexaUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PlexaUserRole>("editor");
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/auth/users");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load users");
    setUsers(data.users ?? []);
  };

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Could not load users"));
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const createUser = () =>
    run(async () => {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "User create failed");
      setVerificationUrl(data.verificationUrl ?? null);
      setName("");
      setEmail("");
      setMessage("User invited. Share the verification link once with the user.");
    });

  const updateUser = (user: PublicPlexaUser, patch: Partial<Pick<PublicPlexaUser, "active" | "role" | "name">>) =>
    run(async () => {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: user.id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "User update failed");
      setMessage("User updated.");
    });

  const resendVerification = (user: PublicPlexaUser) =>
    run(async () => {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend-verification", id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create verification link");
      setVerificationUrl(data.verificationUrl ?? null);
      setMessage("New verification link created.");
    });

  return (
    <Panel title="Secure Users" className="space-y-5 p-5">
      <div>
        <h2 className="text-xl font-bold text-white">User access</h2>
        <p className="mt-1 text-sm text-slate-400">Invite verified users before they can access Plexa Studio.</p>
      </div>
      {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}
      {verificationUrl ? (
        <div className="rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 p-3">
          <p className="text-xs font-semibold uppercase text-[#22c55e]">Verification link, shown once</p>
          <p className="mt-2 break-all font-mono text-xs text-white">{verificationUrl}</p>
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-xs font-semibold uppercase text-slate-500">Name<input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="text-xs font-semibold uppercase text-slate-500">Email<input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="text-xs font-semibold uppercase text-slate-500">Role<select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as PlexaUserRole)}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="flex items-end"><R365Button type="button" onClick={createUser} disabled={busy}>Invite user</R365Button></div>
      </div>
      <div className="grid gap-3">
        {users.map((user) => (
          <div key={user.id} className="rounded-lg border border-[#1f2d26] bg-black/20 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email} · {user.role} · {user.active ? "active" : "disabled"} · {user.emailVerified ? "verified" : "not verified"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select className="rounded-md border border-[#1f2d26] bg-[#0a0e0c] px-2 py-1 text-xs text-white" value={user.role} onChange={(e) => updateUser(user, { role: e.target.value as PlexaUserRole })}>
                  {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <R365Button type="button" variant="ghost" onClick={() => updateUser(user, { active: !user.active })} disabled={busy}>{user.active ? "Disable" : "Enable"}</R365Button>
                <R365Button type="button" variant="ghost" onClick={() => resendVerification(user)} disabled={busy}>Verification link</R365Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
