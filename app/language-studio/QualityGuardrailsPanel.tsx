"use client";

import { useCallback, useEffect, useState } from "react";
import type { LanguageQualityCheck, LanguageTranslation } from "@/app/lib/language-studio/types";

type Me = { user?: { role: string; email: string } };
type PendingFix = {
  proposedTranslation: LanguageTranslation;
  proposedQualityCheck?: LanguageQualityCheck;
  issueIds: string[];
  fixSummary: string;
  learnedRule: string;
};

const guardrailButtonClass = "rounded-md border border-[#1f2d26] px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-[#22c55e]/60 hover:text-white";
const ignoreButtonClass = "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:border-emerald-400";
const escalateButtonClass = "rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-100 hover:border-amber-300";

export function QualityGuardrailsPanel({
  translationId,
  translation,
  adminOverride,
  overrideReason,
  onBlockedChange,
  onAdminOverrideChange,
  onOverrideReasonChange,
  onTranslationFixed,
}: {
  translationId?: string;
  translation?: LanguageTranslation;
  adminOverride: boolean;
  overrideReason: string;
  onBlockedChange: (blocked: boolean) => void;
  onAdminOverrideChange: (value: boolean) => void;
  onOverrideReasonChange: (value: string) => void;
  onTranslationFixed?: (translation: LanguageTranslation) => void;
}) {
  const [check, setCheck] = useState<LanguageQualityCheck | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [fixing, setFixing] = useState(false);
  const [pendingFix, setPendingFix] = useState<PendingFix | null>(null);

  const load = useCallback(async () => {
    if (!translationId) {
      setCheck(null);
      setPendingFix(null);
      onBlockedChange(false);
      return;
    }
    const res = await fetch(`/api/language/quality-checks?translationId=${encodeURIComponent(translationId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Quality check failed");
    setCheck(data.qualityCheck);
    setPendingFix(null);
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

  const updateIssue = async (issueId: string | undefined, action: "ignore" | "ignore-all" | "escalate" | "escalate-all") => {
    if (!check) return;
    if (action === "escalate" || action === "escalate-all") setFixing(true);
    const res = await fetch("/api/language/quality-checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkId: check.id, issueId, action, preview: action === "escalate" || action === "escalate-all" }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.preview && data.proposedTranslation) {
        setPendingFix({
          proposedTranslation: data.proposedTranslation,
          proposedQualityCheck: data.proposedQualityCheck,
          issueIds: Array.isArray(data.issueIds) ? data.issueIds.map(String) : [],
          fixSummary: String(data.fixSummary || "AI proposed a quality fix."),
          learnedRule: String(data.learnedRule || "Review similar quality issue before approval."),
        });
      } else {
        setCheck(data.qualityCheck);
        onBlockedChange(data.qualityCheck?.score === "red");
        if (data.translation) onTranslationFixed?.(data.translation);
      }
    }
    setFixing(false);
  };

  const applyPendingFix = async () => {
    if (!check || !pendingFix) return;
    setFixing(true);
    const res = await fetch("/api/language/quality-checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkId: check.id,
        action: "apply-fix",
        proposedTranslation: pendingFix.proposedTranslation,
        issueIds: pendingFix.issueIds,
        fixSummary: pendingFix.fixSummary,
        learnedRule: pendingFix.learnedRule,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setCheck(data.qualityCheck);
      onBlockedChange(data.qualityCheck?.score === "red");
      if (data.translation) onTranslationFixed?.(data.translation);
      setPendingFix(null);
    }
    setFixing(false);
  };

  const colour = check?.score === "red" ? "text-red-300" : check?.score === "amber" ? "text-amber-300" : "text-emerald-300";
  const isAdmin = me?.user?.role === "admin";
  const hasActiveIssues = Boolean(check?.issues.some((issue) => !issue.ignored));

  return (
    <div className="space-y-3 rounded-lg border border-[#1f2d26] bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-white">Quality & Guardrails</p>
        <span className={`rounded-full border border-current px-2 py-1 text-xs font-bold uppercase ${colour}`}>{check?.score ?? "checking"}</span>
      </div>
      {!check ? <p className="text-sm text-slate-500">Select a translation to run quality checks.</p> : null}
      {check?.issues.length === 0 ? <p className="text-sm text-emerald-300">No guardrail issues found.</p> : null}
      {pendingFix && translation ? (
        <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-50">
          <div>
            <p className="font-bold text-white">AI fix ready for review</p>
            <p className="mt-1 text-amber-100">{pendingFix.fixSummary}</p>
            {pendingFix.proposedQualityCheck ? <p className="mt-1 text-amber-200">After applying, projected check: {pendingFix.proposedQualityCheck.score.toUpperCase()}</p> : null}
          </div>
          <div className="grid gap-2">
            <div className="rounded border border-red-500/20 bg-black/20 p-2">
              <p className="font-semibold text-red-200">Current</p>
              <p className="mt-1 line-clamp-5 whitespace-pre-wrap text-slate-300">{translation.body}</p>
            </div>
            <div className="rounded border border-emerald-500/20 bg-black/20 p-2">
              <p className="font-semibold text-emerald-200">Proposed</p>
              <p className="mt-1 line-clamp-5 whitespace-pre-wrap text-slate-300">{pendingFix.proposedTranslation.body}</p>
            </div>
          </div>
          <p className="text-amber-100">Reusable lesson: {pendingFix.learnedRule}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={escalateButtonClass} onClick={() => void applyPendingFix()}>{fixing ? "Applying..." : "Apply AI fix"}</button>
            <button type="button" className={guardrailButtonClass} onClick={() => setPendingFix(null)}>Discard</button>
          </div>
        </div>
      ) : null}
      {hasActiveIssues ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={ignoreButtonClass} onClick={() => void updateIssue(undefined, "ignore-all")}>
            Ignore all warnings for this translation
          </button>
          <button type="button" className={escalateButtonClass} onClick={() => void updateIssue(undefined, "escalate-all")}>
            {fixing ? "Fixing with AI..." : "Fix all warnings with AI"}
          </button>
        </div>
      ) : null}
      <div className="space-y-2">
        {check?.issues.map((issue) => (
          <div key={issue.id} className={`rounded border p-3 text-xs ${issue.severity === "red" ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
            <p className="font-semibold text-white">{issue.type} · {issue.severity}{issue.ignored ? " · ignored" : ""}</p>
            <p className="mt-1 text-slate-300">{issue.message}</p>
            {issue.suggestedFix ? <p className="mt-1 text-slate-500">Suggested fix: {issue.suggestedFix}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={ignoreButtonClass} onClick={() => void updateIssue(issue.id, "ignore")}>Ignore warning</button>
              <button type="button" className={escalateButtonClass} onClick={() => void updateIssue(issue.id, "escalate")}>{fixing ? "Fixing..." : "Fix with AI"}</button>
            </div>
          </div>
        ))}
      </div>
      {check?.score === "red" ? (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100">
          <p className="font-bold">Approval blocked</p>
          <p className="mt-1">Resolve red issues, ignore warnings you accept, fix them with AI, or use admin override with a reason.</p>
          {isAdmin ? (
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={adminOverride} onChange={(e) => onAdminOverrideChange(e.target.checked)} />Admin override</label>
              <textarea className="w-full rounded border border-[#1f2d26] bg-black/40 p-2 text-white" placeholder="Override reason" value={overrideReason} onChange={(e) => onOverrideReasonChange(e.target.value)} />
            </div>
          ) : null}
        </div>
      ) : null}
      <button type="button" className={guardrailButtonClass} onClick={() => void load()}>Run checks again</button>
    </div>
  );
}
