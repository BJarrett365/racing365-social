"use client";

import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { MatchReportProject } from "@/app/lib/match-report/types";

type Props = {
  project: MatchReportProject;
  busy?: boolean;
  onProjectChange: (project: MatchReportProject) => void;
  onError?: (message: string | null) => void;
  onSyncLanguageStudio?: (project: MatchReportProject) => void | Promise<void>;
  className?: string;
};

export function FactCheckActionBar({
  project,
  busy = false,
  onProjectChange,
  onError,
  onSyncLanguageStudio,
  className = "",
}: Props) {
  const hasMedia = Boolean(project.mediaOutputs);
  const hasIssues = (project.factCheck?.issues.length ?? 0) > 0;
  const blocked = project.factCheck?.status === "blocked";

  const runFactCheck = async () => {
    onError?.(null);
    const res = await fetch(studioApiPath("/api/match-report/fact-check"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id }),
    });
    const data = await parseApiJson<{ project?: MatchReportProject; error?: string; deepseekError?: string }>(res);
    if (!res.ok || !data.project) throw new Error(data.error || "Fact check failed");
    onProjectChange(data.project);
    if (data.deepseekError) {
      onError?.(`Fact check complete — DeepSeek critic unavailable: ${data.deepseekError}`);
    }
  };

  const repairWithAi = async () => {
    onError?.(null);
    const res = await fetch(
      studioApiPath(`/api/match-report/projects/${encodeURIComponent(project.id)}/repair-fact-check`),
      { method: "POST", headers: { "Content-Type": "application/json" } },
    );
    const data = await parseApiJson<{ project?: MatchReportProject; error?: string; deepseekError?: string }>(res);
    if (!res.ok || !data.project) throw new Error(data.error || "AI repair failed");
    onProjectChange(data.project);
    if (onSyncLanguageStudio) await onSyncLanguageStudio(data.project);
    if (data.deepseekError) {
      onError?.(`AI repair complete — DeepSeek critic unavailable: ${data.deepseekError}`);
    }
  };

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <div className="flex flex-wrap gap-3">
        <R365Button onClick={() => run(runFactCheck)} disabled={busy || !hasMedia}>
          {project.factCheck ? "Re-run fact check" : "Run fact check"}
        </R365Button>
        <R365Button
          variant="primary"
          onClick={() => run(repairWithAi)}
          disabled={busy || !hasMedia || !project.factCheck || !hasIssues}
        >
          AI fix issues
        </R365Button>
      </div>
      {!project.factCheck ? (
        <p className="text-sm text-[color:var(--text-secondary)]">
          Run fact check first — then use AI fix to resolve flagged issues and re-score automatically.
        </p>
      ) : hasIssues ? (
        <p className="text-sm text-[color:var(--text-secondary)]">
          {project.factCheck.issues.length} issue{project.factCheck.issues.length === 1 ? "" : "s"} flagged.
          AI fix rewrites the headline, standfirst and body, then re-runs fact check and editorial scoring.
        </p>
      ) : (
        <p className="text-sm text-emerald-300">No open fact-check issues — editorial scoring is up to date.</p>
      )}
      {blocked ? (
        <p className="text-sm text-red-300">
          High-severity Tier 1 issues block publish — run AI fix or edit manually, then re-run fact check.
        </p>
      ) : null}
    </div>
  );
}
