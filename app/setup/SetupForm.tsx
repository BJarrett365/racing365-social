"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { R365Button } from "@/app/components/R365Button";
import { plexaAuthApiUrl } from "@/app/lib/auth/client-api-url";

const inputClass = "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";

export function SetupForm() {
  const router = useRouter();
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [setupTokenRequired, setSetupTokenRequired] = useState(false);
  const [name, setName] = useState("Planet Sport Studio Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(plexaAuthApiUrl("/api/auth/setup"))
      .then((res) => res.json())
      .then((data) => {
        setHasUsers(Boolean(data.hasUsers));
        setSetupTokenRequired(Boolean(data.setupTokenRequired));
      })
      .catch(() => setError("Could not check setup status."));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(plexaAuthApiUrl("/api/auth/setup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, setupToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed");
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  };

  if (hasUsers) {
    return <p className="text-sm text-slate-400">Setup is already complete. New users must be invited from Admin.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}
      <label className="block text-xs font-semibold uppercase text-slate-500">Name<input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required /></label>
      <label className="block text-xs font-semibold uppercase text-slate-500">Email<input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="block text-xs font-semibold uppercase text-slate-500">Password<input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {setupTokenRequired ? (
        <label className="block text-xs font-semibold uppercase text-slate-500">Setup token<input className={inputClass} type="password" value={setupToken} onChange={(e) => setSetupToken(e.target.value)} required /></label>
      ) : null}
      <p className="text-xs text-slate-500">Password must be at least 12 characters and include upper case, lower case and a number.</p>
      <R365Button type="submit" disabled={busy}>{busy ? "Creating admin..." : "Create first admin"}</R365Button>
    </form>
  );
}
