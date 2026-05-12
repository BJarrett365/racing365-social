"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { R365Button } from "@/app/components/R365Button";

const inputClass = "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = params.get("token") ?? "";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}
      {!token ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">Reset link is missing. Open the link from your email or request a new one.</p> : null}
      <label className="block text-xs font-semibold uppercase text-slate-500">
        New password
        <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <label className="block text-xs font-semibold uppercase text-slate-500">
        Confirm password
        <input className={inputClass} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </label>
      <p className="text-xs text-slate-500">At least 12 characters with upper case, lower case and a number.</p>
      <R365Button type="submit" disabled={busy || !token}>{busy ? "Saving…" : "Save password and sign in"}</R365Button>
      <p className="text-sm">
        <Link href="/forgot-password" className="text-[#22c55e] hover:underline">
          Request a new link
        </Link>
        {" · "}
        <Link href="/login" className="text-[#22c55e] hover:underline">
          Login
        </Link>
      </p>
    </form>
  );
}
