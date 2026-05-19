"use client";

import Link from "next/link";
import { useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { plexaAuthApiUrl } from "@/app/lib/auth/client-api-url";

const inputClass = "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(plexaAuthApiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3 text-sm text-slate-300">
          If an account exists for that email and outbound email is configured, we have sent a reset link. Check your inbox
          (and spam). The link expires in two hours.
        </p>
        <Link href="/login" className="text-sm text-[#22c55e] hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}
      <label className="block text-xs font-semibold uppercase text-slate-500">
        Email
        <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <p className="text-xs text-slate-500">We only send a message if there is an active account with a password on file.</p>
      <R365Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</R365Button>
      <p className="text-sm">
        <Link href="/login" className="text-[#22c55e] hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}
