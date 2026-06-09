"use client";

import { useEffect, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";

type Proposal = {
  id: string;
  type: string;
  title: string;
  summary: string;
  confidence: number;
  evidence: string[];
  before: string;
  after: string;
  impact: string;
  status: "pending" | "approved" | "rejected";
};

type ProposalResponse = {
  proposals?: Proposal[];
  error?: string;
};

export function EditorialLearningQueuePanel() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath("/api/editorial-brain/proposals?status=pending"), { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as ProposalResponse;
      if (!res.ok) throw new Error(data.error || "Could not load proposals");
      setProposals(data.proposals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load proposals");
    } finally {
      setBusy(false);
    }
  };

  const decide = async (proposalId: string, action: "approve" | "reject") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath("/api/editorial-brain/proposals"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, action }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update proposal");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update proposal");
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="rounded-2xl border bg-[color:var(--surface-muted)] p-5" style={{ borderColor: "var(--border)" }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black text-[color:var(--text-primary)]">Editorial Learning Queue</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
            OpenAI proposes learning, but Plexa only updates memory after editor approval. Approved fact-check proposals become reusable knowledge files.
          </p>
        </div>
        <R365Button variant="ghost" onClick={() => void load()} disabled={busy}>
          {busy ? "Loading…" : "Refresh"}
        </R365Button>
      </div>
      {error ? <p className="mt-4 text-sm font-semibold text-[color:var(--danger)]">{error}</p> : null}
      <div className="mt-5 space-y-3">
        {proposals.length === 0 && !busy ? (
          <p className="rounded-xl border bg-[color:var(--surface)] p-4 text-sm text-[color:var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
            No pending learning proposals yet.
          </p>
        ) : null}
        {proposals.map((proposal) => (
          <article key={proposal.id} className="rounded-xl border bg-[color:var(--surface)] p-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-[color:var(--text-primary)]">{proposal.title}</h3>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[color:var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
                    {proposal.type}
                  </span>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-300" style={{ borderColor: "var(--border)" }}>
                    {proposal.confidence}% confidence
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">{proposal.summary}</p>
              </div>
              <div className="flex gap-2">
                <R365Button onClick={() => void decide(proposal.id, "approve")} disabled={busy}>
                  Approve
                </R365Button>
                <R365Button variant="ghost" onClick={() => void decide(proposal.id, "reject")} disabled={busy}>
                  Reject
                </R365Button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 text-xs leading-5 text-[color:var(--text-secondary)] md:grid-cols-3">
              <div className="rounded-lg bg-[color:var(--surface-muted)] p-3">
                <strong>Before</strong>
                <p>{proposal.before}</p>
              </div>
              <div className="rounded-lg bg-[color:var(--surface-muted)] p-3">
                <strong>After</strong>
                <p>{proposal.after}</p>
              </div>
              <div className="rounded-lg bg-[color:var(--surface-muted)] p-3">
                <strong>Impact</strong>
                <p>{proposal.impact}</p>
              </div>
            </div>
            {proposal.evidence.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[color:var(--text-muted)]">
                {proposal.evidence.slice(0, 5).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
