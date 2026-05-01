"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { R365Button } from "@/app/components/R365Button";

const inputClass = "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";

export function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = params.get("token") ?? "";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}
      {!token ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">Verification token is missing.</p> : null}
      <label className="block text-xs font-semibold uppercase text-slate-500">
        Create password
        <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <p className="text-xs text-slate-500">This verifies your email and activates your Plexa Studio login.</p>
      <R365Button type="submit" disabled={busy || !token}>{busy ? "Verifying..." : "Verify email and set password"}</R365Button>
    </form>
  );
}
