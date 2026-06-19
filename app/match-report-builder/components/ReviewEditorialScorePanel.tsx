"use client";

import { useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";
import type { EditorialPublishGateStatus } from "@/app/lib/match-report/mio/types";
import { getProjectEditorialScore } from "@/app/lib/match-report/run-editorial-review";
import type { MatchReportProject } from "@/app/lib/match-report/types";

type Props = {
  project: MatchReportProject;
  onProjectChange: (project: MatchReportProject) => void;
  disabled?: boolean;
};

function scoreTone(score: number): string {
  if (score >= 9) return "text-emerald-300";
  if (score >= 8) return "text-sky-300";
  if (score >= 7) return "text-amber-300";
  return "text-red-300";
}

function gateTone(status: EditorialPublishGateStatus): string {
  if (status === "hero_candidate" || status === "publish_eligible") {
    return "border-emerald-500/35 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "editor_approval_required") return "border-amber-500/35 bg-amber-500/10 text-amber-100";
  return "border-red-500/40 bg-red-500/10 text-red-100";
}

function gateLabel(status: EditorialPublishGateStatus): string {
  switch (status) {
    case "hero_candidate":
      return "Hero candidate";
    case "publish_eligible":
      return "Publish eligible";
    case "editor_approval_required":
      return "Editor approval required";
    default:
      return "Blocked";
  }
}

export function ReviewEditorialScorePanel({ project, onProjectChange, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deepseekNote, setDeepseekNote] = useState<string | null>(null);

  const editorialScore = getProjectEditorialScore(project);
  const gate = project.editorialPublishGate;
  const sectionLint = project.editorialSectionLint;
  const deepseek = project.deepseekReview;

  const runReview = async (includeDeepSeek = true) => {
    setBusy(true);
    setError(null);
    setDeepseekNote(null);
    try {
      const res = await fetch(studioApiPath("/api/match-report/editorial-review"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, includeDeepSeek }),
      });
      const data = (await res.json()) as {
        project?: MatchReportProject;
        deepseekError?: string;
        error?: string;
      };
      if (!res.ok || !data.project) throw new Error(data.error || "Editorial review failed");
      onProjectChange(data.project);
      if (data.deepseekError) setDeepseekNote(data.deepseekError);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Editorial review failed");
    } finally {
      setBusy(false);
    }
  };

  if (!editorialScore) {
    return (
      <section className="rounded-2xl border border-dashed border-[color:var(--border)] bg-black/20 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Editorial score</p>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          Run fact check or editorial review to score Story, Insight, Tactical and publish eligibility.
        </p>
        <R365Button className="mt-3" variant="ghost" disabled={disabled || busy} onClick={() => void runReview()}>
          {busy ? "Scoring…" : "Run editorial review"}
        </R365Button>
        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Editorial score</p>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Football365 dimension scoring — editors act on this before publish.
          </p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-black ${scoreTone(editorialScore.overall)}`}>
            {editorialScore.overall.toFixed(1)}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Overall</p>
        </div>
      </div>

      {gate ? (
        <div className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${gateTone(gate.status)}`}>
          {gateLabel(gate.status)}
          {gate.criticalFactCheckFailure ? " · Critical fact-check failure" : ""}
        </div>
      ) : null}

      {gate?.summary ? <p className="text-sm text-[color:var(--text-secondary)]">{gate.summary}</p> : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {editorialScore.dimensions.map((dim) => (
          <div key={dim.id} className="rounded-xl border border-[color:var(--border)] bg-black/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">{dim.label}</p>
            <p className={`mt-1 text-sm font-bold ${scoreTone(dim.score)}`}>{dim.score.toFixed(1)}</p>
          </div>
        ))}
      </div>

      {editorialScore.bannedPhraseHits.length > 0 ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Banned phrases found: {editorialScore.bannedPhraseHits.length}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-200">
            {editorialScore.bannedPhraseHits.map((phrase) => (
              <li key={phrase}>&ldquo;{phrase}&rdquo;</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-emerald-300">No banned phrases detected.</p>
      )}

      {sectionLint && sectionLint.missing.length > 0 ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Missing sections</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-200">
            {sectionLint.missing.map((section) => (
              <li key={section}>{section}</li>
            ))}
          </ul>
        </div>
      ) : sectionLint ? (
        <p className="text-xs text-emerald-300">All required sections present.</p>
      ) : null}

      <div className="rounded-xl border border-[color:var(--border)] bg-black/20 px-3 py-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          Regeneration recommendation
        </p>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          {editorialScore.regenRecommended ? "Recommended — score below tier threshold." : "Optional — meets editorial threshold."}
        </p>
      </div>

      {deepseek ? (
        <div className="space-y-3 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">DeepSeek editorial critic</p>
            <p className="text-[10px] text-[color:var(--text-muted)]">Advisory only — not the publish decision</p>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)]">
            Critic score: <span className={`font-bold ${scoreTone(deepseek.overallScore)}`}>{deepseek.overallScore.toFixed(1)}</span>
            {" · "}
            Insight {deepseek.insightScore.toFixed(1)} · Tactical {deepseek.tacticalDepthScore.toFixed(1)} · Originality{" "}
            {deepseek.originalityScore.toFixed(1)}
          </p>
          {deepseek.clicheHits.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Clichés</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-amber-200">
                {deepseek.clicheHits.map((hit) => (
                  <li key={hit}>{hit}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {deepseek.missingContext.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Missing angles</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-[color:var(--text-secondary)]">
                {deepseek.missingContext.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {deepseek.improvementSuggestions.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Critique</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-[color:var(--text-secondary)]">
                {deepseek.improvementSuggestions.slice(0, 4).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-[color:var(--text-muted)]">
          DeepSeek critic not run yet — re-run review to fetch advisory critique.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <R365Button variant="ghost" disabled={disabled || busy} onClick={() => void runReview(true)}>
          {busy ? "Running…" : "Re-run editorial review"}
        </R365Button>
        <R365Button variant="ghost" disabled={disabled || busy} onClick={() => void runReview(false)}>
          Score only (skip DeepSeek)
        </R365Button>
      </div>

      {deepseekNote ? <p className="text-xs text-amber-300">DeepSeek unavailable: {deepseekNote}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
