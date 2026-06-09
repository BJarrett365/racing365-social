"use client";

import type { MatchReportFactCheck } from "@/app/lib/match-report/types";

type Props = {
  factCheck?: MatchReportFactCheck | null;
};

function statusTone(status: MatchReportFactCheck["status"]): string {
  if (status === "passed") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-100";
  if (status === "blocked") return "border-red-500/40 bg-red-500/10 text-red-100";
  return "border-amber-500/35 bg-amber-500/10 text-amber-100";
}

function scoreTone(score: number): string {
  if (score >= 90) return "text-emerald-300";
  if (score >= 75) return "text-sky-300";
  if (score >= 60) return "text-amber-300";
  return "text-red-300";
}

export function FactCheckPanel({ factCheck }: Props) {
  if (!factCheck) {
    return (
      <section className="rounded-2xl border border-dashed border-[color:var(--border)] bg-black/20 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Fact check</p>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          Run the fact check to score factual accuracy, research depth, insight, brand fit and creator-profile fit before review.
        </p>
      </section>
    );
  }

  const score = factCheck.articleScore;
  const dimensions = [
    ["Factual", score.dimensions.factualAccuracy, 25],
    ["Research", score.dimensions.researchDepth, 15],
    ["Insight", score.dimensions.insightQuality, 15],
    ["Journalist", score.dimensions.journalistVoice, 15],
    ["Brand", score.dimensions.brandFit, 15],
    ["Opinion", score.dimensions.opinionHumour, 10],
    ["Structure", score.dimensions.structureReadability, 5],
  ] as const;

  return (
    <section className="space-y-4 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Fact check & article score</p>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{score.summary}</p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-black ${scoreTone(score.overall)}`}>{score.overall}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Article score</p>
        </div>
      </div>

      <div className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${statusTone(factCheck.status)}`}>
        {factCheck.status.replace("_", " ")} · {score.status.replace("_", " ")}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {dimensions.map(([label, value, max]) => (
          <div key={label} className="rounded-xl border border-[color:var(--border)] bg-black/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">{label}</p>
            <p className="mt-1 text-sm font-bold text-[color:var(--text-primary)]">
              {value}/{max}
            </p>
          </div>
        ))}
      </div>

      {score.topFixes.length > 0 ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Top fixes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--text-secondary)]">
            {score.topFixes.map((fix) => (
              <li key={fix}>{fix}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {factCheck.storyContext.derived.storyline ? (
        <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-300">Story engine</p>
          <p className="mt-1 text-sm leading-6 text-sky-100">{factCheck.storyContext.derived.storyline}</p>
        </div>
      ) : null}

      {factCheck.issues.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Warnings</p>
          {factCheck.issues.map((issue) => (
            <article key={issue.id} className="rounded-xl border border-[color:var(--border)] bg-black/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[color:var(--border)] px-2 py-0.5 text-[10px] font-bold uppercase text-[color:var(--text-muted)]">
                  {issue.sourceTier}
                </span>
                <span className="rounded-full border border-[color:var(--border)] px-2 py-0.5 text-[10px] font-bold uppercase text-[color:var(--text-muted)]">
                  {issue.severity}
                </span>
                <h4 className="text-sm font-bold text-[color:var(--text-primary)]">{issue.title}</h4>
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">{issue.detail}</p>
              {issue.evidence ? <p className="mt-2 text-xs text-[color:var(--text-muted)]">Evidence: {issue.evidence}</p> : null}
              {issue.suggestion ? <p className="mt-1 text-xs text-emerald-200">Suggested fix: {issue.suggestion}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
