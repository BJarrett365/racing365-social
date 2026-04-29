"use client";

import { useCallback, useEffect, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import type { LanguageQualityCheck } from "@/app/lib/language-studio/types";

type Me = { user?: { role: string; email: string } };

export function QualityGuardrailsPanel({
  translationId,
  adminOverride,
  overrideReason,
  onBlockedChange,
  onAdminOverrideChange,
  onOverrideReasonChange,
}: {
  translationId?: string;
  adminOverride: boolean;
  overrideReason: string;
  onBlockedChange: (blocked: boolean) => void;
  onAdminOverrideChange: (value: boolean) => void;
  onOverrideReasonChange: (value: string) => void;
}) {
  const [check, setCheck] = useState<LanguageQualityCheck | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  const load = useCallback(async () => {
    if (!translationId) {
      setCheck(null);
      onBlockedChange(false);
      return;
    }
    const res = await fetch(`/api/language/quality-checks?translationId=${encodeURIComponent(translationId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Quality check failed");
    setCheck(data.qualityCheck);
    onBlockedChange(data.qualityCheck?.score === "red");
  }, [onBlockedChange, translationId]);

  useEffect(() => {
    void fetch("/api/auth/me").then((res) => (res.ok ? res.json() : null)).then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    void load().catch(() => {
      setCheck(null);
      onBlockedChange(false);
    });
  }, [load, onBlockedChange]);

  const updateIssue = async (issueId: string, action: "ignore" | "escalate") => {
    if (!check) return;
    const res = await fetch("/api/language/quality-checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkId: check.id, issueId, action }),
    });
    const data = await res.json();
    if (res.ok) {
      setCheck(data.qualityCheck);
      onBlockedChange(data.qualityCheck?.score === "red");
    }
  };

  const colour = check?.score === "red" ? "text-red-300" : check?.score === "amber" ? "text-amber-300" : "text-emerald-300";
  const isAdmin = me?.user?.role === "admin";

  return (
    <div className="space-y-3 rounded-lg border border-[#1f2d26] bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-white">Quality & Guardrails</p>
        <span className={`rounded-full border border-current px-2 py-1 text-xs font-bold uppercase ${colour}`}>{check?.score ?? "checking"}</span>
      </div>
      {!check ? <p className="text-sm text-slate-500">Select a translation to run quality checks.</p> : null}
      {check?.issues.length === 0 ? <p className="text-sm text-emerald-300">No guardrail issues found.</p> : null}
      <div className="space-y-2">
        {check?.issues.map((issue) => (
          <div key={issue.id} className={`rounded border p-3 text-xs ${issue.severity === "red" ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
            <p className="font-semibold text-white">{issue.type} · {issue.severity}{issue.ignored ? " · ignored" : ""}{issue.escalated ? " · escalated" : ""}</p>
            <p className="mt-1 text-slate-300">{issue.message}</p>
            {issue.suggestedFix ? <p className="mt-1 text-slate-500">Suggested fix: {issue.suggestedFix}</p> : null}
            <div className="mt-2 flex gap-2">
              <button type="button" className="text-[#22c55e]" onClick={() => void updateIssue(issue.id, "ignore")}>Ignore warning</button>
              <button type="button" className="text-amber-200" onClick={() => void updateIssue(issue.id, "escalate")}>Escalate</button>
            </div>
          </div>
        ))}
      </div>
      {check?.score === "red" ? (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100">
          <p className="font-bold">Approval blocked</p>
          <p className="mt-1">Resolve red issues, ignore where appropriate, or use admin override with a reason.</p>
          {isAdmin ? (
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={adminOverride} onChange={(e) => onAdminOverrideChange(e.target.checked)} />Admin override</label>
              <textarea className="w-full rounded border border-[#1f2d26] bg-black/40 p-2 text-white" placeholder="Override reason" value={overrideReason} onChange={(e) => onOverrideReasonChange(e.target.value)} />
            </div>
          ) : null}
        </div>
      ) : null}
      <R365Button type="button" variant="ghost" onClick={() => void load()}>Run checks again</R365Button>
    </div>
  );
}
