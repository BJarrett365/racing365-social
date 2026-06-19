"use client";

import Link from "next/link";
import { useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";
import type { EditorOverrideReason } from "@/app/lib/match-report/mio/types";
import type { MatchReportProject } from "@/app/lib/match-report/types";
import type { MatchReportPushAction } from "@/app/lib/match-report/match-report-distribution";
import { PublishEditorOverrideModal } from "@/app/match-report-builder/components/PublishEditorOverrideModal";

type PushResults = {
  calendar?: { eventId: string; url: string };
  rewrite?: { articleId: string; rewriteUrl: string };
  language?: { articleId: string; languageUrl: string };
  publish?: { articleId: string; reviewUrl: string; rewriteUrl: string };
  warnings?: string[];
};

type Props = {
  project: MatchReportProject;
  onProjectChange: (project: MatchReportProject) => void;
  disabled?: boolean;
  className?: string;
};

const ACTION_LABELS: Record<MatchReportPushAction, string> = {
  calendar: "Push to calendar",
  publish: "Publish",
  rewrite: "Rewrite",
  language: "Language",
  all: "Run all",
};

const ACTION_HINTS: Record<MatchReportPushAction, string> = {
  calendar: "Link this report to the Schedule Studio editorial calendar (Report / Post phase).",
  publish: "Send to Language Studio Review Queue with hero image.",
  rewrite: "Open in Language Studio Rewrite for editorial editing.",
  language: "Open in Language Studio Translations for localisation.",
  all: "Rewrite → Calendar → Publish (hero required for publish).",
};

export function MatchReportDistributionPanel({
  project,
  onProjectChange,
  disabled = false,
  className = "",
}: Props) {
  const [busyAction, setBusyAction] = useState<MatchReportPushAction | null>(null);
  const [results, setResults] = useState<PushResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingPublishAction, setPendingPublishAction] = useState<MatchReportPushAction | null>(null);

  const hasMedia = Boolean(project.mediaOutputs);
  const hasHero = Boolean(project.imageIntelligence?.hero?.url);
  const articleId = project.archive?.languageStudioArticleId;
  const publishGate = project.editorialPublishGate;
  const editorialScore = project.previewEditorialScore ?? project.reportEditorialScore;

  const runAction = async (
    action: MatchReportPushAction,
    editorOverride?: { reason: EditorOverrideReason; detail?: string },
  ) => {
    setBusyAction(action);
    setError(null);
    try {
      const res = await fetch(studioApiPath("/api/match-report/push-actions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          action,
          editorOverride,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        project?: MatchReportProject;
        results?: PushResults;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action failed");
      if (data.project) onProjectChange(data.project);
      setResults(data.results ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyAction(null);
      setPendingPublishAction(null);
    }
  };

  const requestAction = (action: MatchReportPushAction) => {
    const needsPublishGate =
      (action === "publish" || action === "all") &&
      publishGate?.requiresEditorOverride &&
      !publishGate.canPublishWithoutOverride;
    if (needsPublishGate && editorialScore) {
      setPendingPublishAction(action);
      return;
    }
    void runAction(action);
  };

  const actions: MatchReportPushAction[] = ["calendar", "rewrite", "language", "publish", "all"];

  return (
    <section
      className={`rounded-2xl border p-4 ${className}`.trim()}
      style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Distribution</p>
      <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
        Push this match report to Schedule Studio, Language Studio, or publish — individually or all at once.
      </p>

      {publishGate ? (
        <p className="mt-3 text-xs text-[color:var(--text-muted)]">
          Publish gate:{" "}
          <span className="font-semibold text-[color:var(--text-secondary)]">
            {publishGate.status.replaceAll("_", " ")}
          </span>
          {editorialScore ? ` · score ${editorialScore.overall.toFixed(1)}` : ""}
          {publishGate.requiresEditorOverride && !publishGate.canPublishWithoutOverride
            ? " · override required"
            : ""}
        </p>
      ) : null}

      {!hasMedia ? (
        <p className="mt-3 text-sm text-amber-300">Generate media outputs before using distribution actions.</p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const isPublish = action === "publish" || action === "all";
            const blocked = isPublish && !hasHero;
            return (
              <div
                key={action}
                className="rounded-xl border p-3"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{ACTION_LABELS[action]}</p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{ACTION_HINTS[action]}</p>
                {blocked ? (
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    Hero image required for publish
                  </p>
                ) : null}
                <R365Button
                  className="mt-3 w-full"
                  variant={action === "all" ? "primary" : "ghost"}
                  disabled={disabled || busyAction !== null || !hasMedia}
                  onClick={() => requestAction(action)}
                >
                  {busyAction === action ? "Working…" : ACTION_LABELS[action]}
                </R365Button>
              </div>
            );
          })}
        </div>
      )}

      {project.calendarEventId ? (
        <p className="mt-3 text-xs text-[color:var(--text-muted)]">
          Linked to calendar event{" "}
          <Link
            href={`/editing-studio/calendar?eventId=${encodeURIComponent(project.calendarEventId)}`}
            className="font-semibold text-emerald-300 underline"
          >
            {project.calendarEventId}
          </Link>
        </p>
      ) : null}

      {articleId ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href={`/language-studio?tab=${encodeURIComponent("Rewrite")}&articleId=${encodeURIComponent(articleId)}`} className="text-emerald-300 underline">
            Rewrite
          </Link>
          <Link href={`/language-studio?tab=${encodeURIComponent("Translations")}&articleId=${encodeURIComponent(articleId)}`} className="text-emerald-300 underline">
            Translations
          </Link>
          <Link href="/language-studio?tab=Review%20Queue" className="text-emerald-300 underline">
            Review Queue
          </Link>
        </div>
      ) : null}

      {results ? (
        <div
          className="mt-4 space-y-2 rounded-xl border px-3 py-3 text-xs"
          style={{ borderColor: "rgba(52,211,153,0.35)", background: "rgba(16,185,129,0.08)" }}
        >
          {results.calendar ? (
            <p>
              Calendar:{" "}
              <Link href={results.calendar.url} className="font-semibold text-emerald-200 underline">
                Open event
              </Link>
            </p>
          ) : null}
          {results.rewrite ? (
            <p>
              Rewrite:{" "}
              <Link href={results.rewrite.rewriteUrl} className="font-semibold text-emerald-200 underline">
                Edit in Language Studio
              </Link>
            </p>
          ) : null}
          {results.language ? (
            <p>
              Language:{" "}
              <Link href={results.language.languageUrl} className="font-semibold text-emerald-200 underline">
                Open Translations
              </Link>
            </p>
          ) : null}
          {results.publish ? (
            <p>
              Published:{" "}
              <Link href={results.publish.reviewUrl} className="font-semibold text-emerald-200 underline">
                Review Queue
              </Link>
            </p>
          ) : null}
          {results.warnings?.map((warning) => (
            <p key={warning} className="text-amber-200">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      <PublishEditorOverrideModal
        open={pendingPublishAction !== null && Boolean(editorialScore && publishGate)}
        overallScore={editorialScore?.overall ?? 0}
        gateSummary={publishGate?.summary ?? ""}
        onCancel={() => setPendingPublishAction(null)}
        onConfirm={(override) => {
          if (!pendingPublishAction) return;
          void runAction(pendingPublishAction, override);
        }}
      />
    </section>
  );
}
