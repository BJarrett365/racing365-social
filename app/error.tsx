"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-900/40 bg-red-950/30 p-6 text-red-100">
      <h1 className="text-lg font-bold text-white">Something went wrong</h1>
      <p className="mt-2 text-sm text-red-200/90">
        {error.message || "Unknown error"} — try{" "}
        <code className="rounded bg-black/30 px-1 text-xs">npm run dev:kill-port</code> then{" "}
        <code className="rounded bg-black/30 px-1 text-xs">npm run dev</code>, or open{" "}
        <Link href="/healthz.txt" className="text-[#22c55e] underline">
          /healthz.txt
        </Link>
        .
      </p>
      <button
        type="button"
        className="mt-4 rounded-lg bg-red-900/50 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800/50"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
