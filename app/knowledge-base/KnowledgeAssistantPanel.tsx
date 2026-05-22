"use client";

import { useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";

type KnowledgeSummary = {
  ok?: boolean;
  status?: "ready" | "missing_key" | "permission_required" | "provider_error";
  model?: string;
  summary?: string;
  suggestions?: string[];
};

export function KnowledgeAssistantPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<KnowledgeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runReview = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath("/api/knowledge-base/ai-summary"), { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as KnowledgeSummary & { error?: string };
      if (!res.ok) throw new Error(data.error || "Knowledge Base review failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Knowledge Base review failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-[color:var(--surface-muted)] p-5" style={{ borderColor: "var(--border)" }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black text-[color:var(--text-primary)]">AI Knowledge Assistant</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
            Run an OpenAI-assisted check over source brands, creator profiles, sport rules, prompt rules and guardrails to
            spot missing learning before rewrites, translations and review workflows.
          </p>
        </div>
        <R365Button onClick={() => void runReview()} disabled={busy}>
          {busy ? "Reviewing…" : "Run AI review"}
        </R365Button>
      </div>
      {error ? <p className="mt-4 text-sm font-semibold text-[color:var(--danger)]">{error}</p> : null}
      {result ? (
        <div className="mt-5 rounded-xl border bg-[color:var(--surface)] p-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[color:var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
              {result.status === "ready" ? "OpenAI ready" : result.status?.replace(/_/g, " ") ?? "Review"}
            </span>
            {result.model ? <span className="text-xs font-semibold text-[color:var(--text-muted)]">{result.model}</span> : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">{result.summary}</p>
          {result.suggestions?.length ? (
            <ul className="mt-4 space-y-2 text-sm leading-6 text-[color:var(--text-secondary)]">
              {result.suggestions.map((item) => (
                <li key={item} className="rounded-lg bg-[color:var(--surface-muted)] px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
