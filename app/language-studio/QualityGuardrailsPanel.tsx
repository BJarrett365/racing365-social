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

const guardrailButtonClass = "inline-flex items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-bold text-[color:var(--text-secondary)] shadow-sm transition hover:border-[color:var(--accent)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60";
const ignoreButtonClass = "inline-flex items-center justify-center rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-100";
const escalateButtonClass = "inline-flex items-center justify-center rounded-xl border border-amber-500/55 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-900 shadow-sm transition hover:border-amber-500 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-100";

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

  const badgeClass = check?.score === "red"
    ? "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-200"
    : check?.score === "amber"
      ? "border-amber-500/60 bg-amber-500/20 text-amber-800 dark:text-amber-100"
      : "border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-100";
  const isAdmin = me?.user?.role === "admin";
  const hasActiveIssues = Boolean(check?.issues.some((issue) => !issue.ignored));
  const activeIssueCount = check?.issues.filter((issue) => !issue.ignored).length ?? 0;

  return (
    <div className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Quality & Guardrails</p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            {check ? `${activeIssueCount} active issue${activeIssueCount === 1 ? "" : "s"} to review` : "Select a translation to run quality checks."}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${badgeClass}`}>{check?.score ?? "checking"}</span>
      </div>
      {!check ? <p className="rounded-xl bg-[color:var(--surface-muted)] p-3 text-sm text-[color:var(--text-secondary)]">Select a translation to run quality checks.</p> : null}
      {check?.issues.length === 0 ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-800 dark:text-emerald-100">No guardrail issues found.</p> : null}
      {pendingFix && translation ? (
        <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-[color:var(--text-secondary)]">
          <div>
            <p className="font-bold text-[color:var(--text-primary)]">AI fix ready for review</p>
            <p className="mt-1">{pendingFix.fixSummary}</p>
            {pendingFix.proposedQualityCheck ? <p className="mt-1 font-semibold text-amber-800 dark:text-amber-100">After applying, projected check: {pendingFix.proposedQualityCheck.score.toUpperCase()}</p> : null}
          </div>
          <div className="grid gap-2">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <p className="font-semibold text-red-700 dark:text-red-200">Current</p>
              <p className="mt-1 line-clamp-5 whitespace-pre-wrap text-[color:var(--text-secondary)]">{translation.body}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
              <p className="font-semibold text-emerald-700 dark:text-emerald-200">Proposed</p>
              <p className="mt-1 line-clamp-5 whitespace-pre-wrap text-[color:var(--text-secondary)]">{pendingFix.proposedTranslation.body}</p>
            </div>
          </div>
          <p className="rounded-xl bg-[color:var(--surface-muted)] p-3 text-[color:var(--text-secondary)]">Reusable lesson: {pendingFix.learnedRule}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={escalateButtonClass} onClick={() => void applyPendingFix()}>{fixing ? "Applying..." : "Apply AI fix"}</button>
            <button type="button" className={guardrailButtonClass} onClick={() => setPendingFix(null)}>Discard</button>
          </div>
        </div>
      ) : null}
      {hasActiveIssues ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className={ignoreButtonClass} onClick={() => void updateIssue(undefined, "ignore-all")}>
            Ignore all warnings for this translation
          </button>
          <button type="button" className={escalateButtonClass} onClick={() => void updateIssue(undefined, "escalate-all")}>
            {fixing ? "Fixing with AI..." : "Fix all warnings with AI"}
          </button>
        </div>
      ) : null}
      <div className="space-y-3">
        {check?.issues.map((issue) => (
          <div key={issue.id} className={`rounded-2xl border p-4 text-xs shadow-sm ${issue.severity === "red" ? "border-red-500/35 bg-red-500/10" : "border-amber-500/40 bg-amber-500/12"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black text-[color:var(--text-primary)]">{issue.type}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${issue.severity === "red" ? "bg-red-500/15 text-red-700 dark:text-red-200" : "bg-amber-500/20 text-amber-800 dark:text-amber-100"}`}>{issue.severity}</span>
              {issue.ignored ? <span className="rounded-full bg-[color:var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[color:var(--text-muted)]">ignored</span> : null}
            </div>
            <p className="mt-2 leading-5 text-[color:var(--text-secondary)]">{issue.message}</p>
            {issue.suggestedFix ? <p className="mt-2 rounded-xl bg-[color:var(--surface)] p-3 leading-5 text-[color:var(--text-secondary)]">Suggested fix: {issue.suggestedFix}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={ignoreButtonClass} onClick={() => void updateIssue(issue.id, "ignore")}>Ignore warning</button>
              <button type="button" className={escalateButtonClass} onClick={() => void updateIssue(issue.id, "escalate")}>{fixing ? "Fixing..." : "Fix with AI"}</button>
            </div>
          </div>
        ))}
      </div>
      {check?.score === "red" ? (
        <div className="rounded-2xl border border-red-500/35 bg-red-500/10 p-4 text-xs text-red-800 dark:text-red-100">
          <p className="font-bold text-red-900 dark:text-red-100">Approval blocked</p>
          <p className="mt-1">Resolve red issues, ignore warnings you accept, fix them with AI, or use admin override with a reason.</p>
          {isAdmin ? (
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={adminOverride} onChange={(e) => onAdminOverrideChange(e.target.checked)} />Admin override</label>
              <textarea className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-[color:var(--text-primary)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]" placeholder="Override reason" value={overrideReason} onChange={(e) => onOverrideReasonChange(e.target.value)} />
            </div>
          ) : null}
        </div>
      ) : null}
      <button type="button" className={guardrailButtonClass} onClick={() => void load()}>Run checks again</button>
    </div>
  );
}
