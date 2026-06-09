"use client";

import { useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";

type FactCheckResponse = {
  factCheck?: {
    overallScore: number;
    score: {
      grade: string;
      summary: string;
    };
    checks: Array<{
      id: string;
      type: string;
      claim: string;
      status: string;
      confidence: number;
      suggestion?: string;
    }>;
  };
  proposals?: Array<{ id: string; title: string; confidence: number }>;
  error?: string;
};

export function ArticleFactCheckPanel() {
  const [articleId, setArticleId] = useState("");
  const [translationId, setTranslationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FactCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(studioApiPath("/api/editorial-brain/article-fact-check"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: articleId.trim() || undefined,
          translationId: translationId.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as FactCheckResponse;
      if (!res.ok) throw new Error(data.error || "Article fact-check failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Article fact-check failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-[color:var(--surface-muted)] p-5" style={{ borderColor: "var(--border)" }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black text-[color:var(--text-primary)]">AI Article Fact Check</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
            Run the first Editorial Brain pass over an Article Studio item. It scores factual risk, checks claims and creates learning proposals for editor approval.
          </p>
        </div>
        <R365Button onClick={() => void runCheck()} disabled={busy || (!articleId.trim() && !translationId.trim())}>
          {busy ? "Checking…" : "Run fact check"}
        </R365Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          Article ID
          <input
            value={articleId}
            onChange={(e) => setArticleId(e.target.value)}
            placeholder="Optional if translation ID is supplied"
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm normal-case tracking-normal outline-none"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          Translation / Rewrite ID
          <input
            value={translationId}
            onChange={(e) => setTranslationId(e.target.value)}
            placeholder="Preferred for rewritten output"
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm normal-case tracking-normal outline-none"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          />
        </label>
      </div>
      {error ? <p className="mt-4 text-sm font-semibold text-[color:var(--danger)]">{error}</p> : null}
      {result?.factCheck ? (
        <div className="mt-5 rounded-xl border bg-[color:var(--surface)] p-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[color:var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
              Score {result.factCheck.overallScore}/100
            </span>
            <span className="text-xs font-semibold text-[color:var(--text-muted)]">{result.factCheck.score.grade.replace(/_/g, " ")}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">{result.factCheck.score.summary}</p>
          <div className="mt-4 space-y-2">
            {result.factCheck.checks.slice(0, 8).map((check) => (
              <div key={check.id} className="rounded-lg bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-secondary)]">
                <strong>{check.status.replace(/_/g, " ")}</strong> · {check.type} · {check.claim}
                {check.suggestion ? <p className="mt-1 text-xs text-[color:var(--text-muted)]">{check.suggestion}</p> : null}
              </div>
            ))}
          </div>
          {result.proposals?.length ? (
            <p className="mt-4 text-sm font-semibold text-emerald-300">
              {result.proposals.length} learning proposal(s) added to the Knowledge Base queue.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
