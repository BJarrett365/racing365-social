"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";
import { interviewsForTranscriptPanelSide } from "@/app/lib/match-report/interviews-for-transcript-panel";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { InterviewIntelligence, MatchReportProject } from "@/app/lib/match-report/types";
import { stepLabel } from "@/app/lib/match-report/workflow";
import { ImageIntelligenceStep } from "@/app/match-report-builder/components/ImageIntelligenceStep";
import { InterviewImportPanel } from "@/app/match-report-builder/components/InterviewImportPanel";
import { PlayerRatingsTable } from "@/app/match-report-builder/components/PlayerRatingsTable";
import { MatchReportDistributionPanel } from "@/app/match-report-builder/components/MatchReportDistributionPanel";
import {
  MatchReportOutputPreview,
  mediaOutputsToPreviewContent,
} from "@/app/match-report-builder/components/MatchReportOutputPreview";
import { WorldCupStandingsRefresh } from "@/app/match-report-builder/components/WorldCupStandingsRefresh";
import { EditableMatchReportOutput } from "@/app/match-report-builder/components/EditableMatchReportOutput";
import { FactCheckActionBar } from "@/app/match-report-builder/components/FactCheckActionBar";
import { FactCheckPanel } from "@/app/match-report-builder/components/FactCheckPanel";
import { ReviewEditorialScorePanel } from "@/app/match-report-builder/components/ReviewEditorialScorePanel";

type Props = {
  project: MatchReportProject;
  pairedProject?: MatchReportProject | null;
  onProjectChange: (project: MatchReportProject) => void;
  onPairedProjectChange?: (project: MatchReportProject) => void;
  onAsyncJob: (jobId: string, kind: "player_intelligence" | "generate_media") => void;
  onBack?: () => void | Promise<void>;
  busy?: boolean;
  error?: string | null;
};

function resolveDualProjects(
  project: MatchReportProject,
  pairedProject: MatchReportProject,
): { homeProject: MatchReportProject; awayProject: MatchReportProject } {
  if (project.reportFormat === "home") {
    return { homeProject: project, awayProject: pairedProject };
  }
  if (pairedProject.reportFormat === "home") {
    return { homeProject: pairedProject, awayProject: project };
  }
  return { homeProject: project, awayProject: pairedProject };
}

type InterviewActionBody = {
  url?: string;
  interviewId?: string;
  complete?: boolean;
  skip?: boolean;
  sendToRewrite?: boolean;
  deleteInterviewId?: string;
  team?: InterviewIntelligence["team"];
};

async function postInterviewAction(
  projectId: string,
  body: InterviewActionBody,
): Promise<{ project: MatchReportProject; rewriteUrl?: string }> {
  let res: Response;
  try {
    res = await fetch(studioApiPath("/api/match-report/import/interview"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, ...body }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    throw new Error(
      message.toLowerCase().includes("fetch")
        ? "Interview import request failed before the server responded. Apify transcript pulls can take up to 90 seconds — retry once, or import via YouTube Script Importer and paste the URL again."
        : message,
    );
  }
  const data = await parseApiJson<{ project?: MatchReportProject; rewriteUrl?: string; error?: string }>(res);
  if (!res.ok || !data.project) throw new Error(data.error || "Interview action failed");
  return { project: data.project, rewriteUrl: data.rewriteUrl };
}

export function GenerationSteps({
  project,
  pairedProject,
  onProjectChange,
  onPairedProjectChange,
  onAsyncJob,
  onBack,
  busy,
  error,
}: Props) {
  const step = project.workflowStep;
  const standingsRefresh = (
    <WorldCupStandingsRefresh project={project} onProjectChange={onProjectChange} compact />
  );
  const [homeYoutubeUrl, setHomeYoutubeUrl] = useState("");
  const [awayYoutubeUrl, setAwayYoutubeUrl] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [runningPlayerIntelligence, setRunningPlayerIntelligence] = useState(false);
  const [interviewImportKey, setInterviewImportKey] = useState<string | null>(null);

  const isDualTranscripts = Boolean(pairedProject && project.pairedProjectId);
  const dualProjects =
    isDualTranscripts && pairedProject ? resolveDualProjects(project, pairedProject) : null;

  const importingForKey = interviewImportKey;
  const isInterviewImportBusy = Boolean(importingForKey);

  const applyProjectUpdate = (updated: MatchReportProject) => {
    if (updated.id === project.id) onProjectChange(updated);
    else onPairedProjectChange?.(updated);
  };

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Action failed");
    }
  };

  const retreat = async () => {
    if (!onBack) return;
    await onBack();
  };

  const advanceWorkflow = async (patch: {
    workflowStep: MatchReportProject["workflowStep"];
    workflowPhase: MatchReportProject["workflowPhase"];
    status?: MatchReportProject["status"];
  }) => {
    const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(project.id)}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { project?: MatchReportProject; error?: string };
    if (!res.ok || !data.project) throw new Error(data.error || "Continue failed");
    onProjectChange(data.project);
  };

  const backButton =
    onBack ? (
      <R365Button variant="ghost" onClick={() => run(retreat)} disabled={busy || isInterviewImportBusy}>
        ← Back
      </R365Button>
    ) : null;

  if (step === "player_intelligence") {
    return (
      <div className="space-y-4">
        {standingsRefresh}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">{stepLabel(step)}</p>
          <h3 className="mt-2 text-xl font-bold text-[color:var(--text-primary)]">Generate player ratings</h3>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Uses WhoScored data when imported; otherwise derives ratings from match events.
          </p>
        </div>
        {project.playerIntelligence ? (
          <div className="space-y-4">
            {backButton}
            <PlayerRatingsTable intelligence={project.playerIntelligence} project={project} />
            <div className="flex flex-wrap gap-3">
              <R365Button
                onClick={() =>
                  run(() =>
                    advanceWorkflow({ workflowStep: "transcripts", workflowPhase: "generation" }),
                  )
                }
                disabled={busy}
              >
                Continue to transcripts
              </R365Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {backButton}
            <R365Button
              onClick={() =>
                run(async () => {
                  setRunningPlayerIntelligence(true);
                  try {
                    let res: Response;
                    try {
                      res = await fetch(studioApiPath("/api/match-report/player-intelligence"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ projectId: project.id }),
                      });
                    } catch (e) {
                      const message = e instanceof Error ? e.message : "Network error";
                      throw new Error(
                        message.toLowerCase().includes("fetch")
                          ? "Player intelligence request failed before the server responded. Retry — ratings generation can take up to a minute."
                          : message,
                      );
                    }
                    const data = await parseApiJson<{
                      async?: boolean;
                      jobId?: string;
                      project?: MatchReportProject;
                      error?: string;
                    }>(res);
                    if (!res.ok) throw new Error(data.error || "Player intelligence failed");
                    if (data.async && data.jobId) {
                      onAsyncJob(data.jobId, "player_intelligence");
                      return;
                    }
                    if (data.project?.playerIntelligence) {
                      onProjectChange(data.project);
                      return;
                    }
                    throw new Error("Player intelligence finished without ratings.");
                  } finally {
                    setRunningPlayerIntelligence(false);
                  }
                })
              }
              disabled={busy || runningPlayerIntelligence}
            >
              {busy || runningPlayerIntelligence ? "Generating ratings…" : "Run Player Intelligence"}
            </R365Button>
          </div>
        )}
        {error || localError ? <p className="text-sm text-red-300">{error || localError}</p> : null}
      </div>
    );
  }

  if (step === "transcripts") {
    const importInterviewForProject = async (
      targetProjectId: string,
      url: string,
      clearUrl: () => void,
      team: InterviewIntelligence["team"],
    ) => {
      const { project: updated } = await postInterviewAction(targetProjectId, {
        url: url.trim(),
        ...(team ? { team } : {}),
      });
      clearUrl();
      applyProjectUpdate(updated);
    };

    const sendInterviewToRewrite = async (targetProjectId: string, interviewId: string) => {
      setInterviewImportKey(`${targetProjectId}:rewrite:${interviewId}`);
      try {
        const { project: updated, rewriteUrl } = await postInterviewAction(targetProjectId, {
          interviewId,
          sendToRewrite: true,
        });
        applyProjectUpdate(updated);
        if (rewriteUrl) window.open(rewriteUrl, "_blank", "noopener,noreferrer");
      } finally {
        setInterviewImportKey(null);
      }
    };

    const deleteInterviewRow = async (targetProjectId: string, interviewId: string) => {
      setInterviewImportKey(`${targetProjectId}:delete:${interviewId}`);
      try {
        const { project: updated } = await postInterviewAction(targetProjectId, {
          deleteInterviewId: interviewId,
        });
        applyProjectUpdate(updated);
      } finally {
        setInterviewImportKey(null);
      }
    };

    const completeTranscripts = async () => {
      if (dualProjects) {
        const [homeResult, awayResult] = await Promise.all([
          postInterviewAction(dualProjects.homeProject.id, { complete: true }),
          postInterviewAction(dualProjects.awayProject.id, { complete: true }),
        ]);
        applyProjectUpdate(homeResult.project);
        applyProjectUpdate(awayResult.project);
        return;
      }
      const { project: updated } = await postInterviewAction(project.id, { complete: true });
      onProjectChange(updated);
    };

    const skipTranscripts = async () => {
      if (dualProjects) {
        const [homeResult, awayResult] = await Promise.all([
          postInterviewAction(dualProjects.homeProject.id, { skip: true }),
          postInterviewAction(dualProjects.awayProject.id, { skip: true }),
        ]);
        applyProjectUpdate(homeResult.project);
        applyProjectUpdate(awayResult.project);
        return;
      }
      const { project: updated } = await postInterviewAction(project.id, { skip: true });
      onProjectChange(updated);
    };

    const homeListSingle = interviewsForTranscriptPanelSide(project.layers.interviews, "home");
    const awayListSingle = interviewsForTranscriptPanelSide(project.layers.interviews, "away");

    return (
      <div className="space-y-4">
        {standingsRefresh}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">{stepLabel(step)}</p>
          <h3 className="mt-2 text-xl font-bold text-[color:var(--text-primary)]">Import post-match interviews</h3>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            {dualProjects
              ? "Neutral dual reports store home clips on the home project and away clips on the away project — import separately for each perspective."
              : "Import transcripts for each team separately. You can add multiple YouTube URLs per side. Skip penalty: −10 confidence."}
          </p>
          {!dualProjects && project.layers.interviews.some((i) => i.team == null || i.team === "neutral") ? (
            <p className="mt-2 text-xs text-amber-200/90">
              Clips without a Home/Away tag (legacy imports) appear under Home — remove and re-import to tag them to a
              side if needed.
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Same import engine as{" "}
            <Link href="/tools/youtube-script-importer" className="font-semibold text-emerald-300 underline">
              YouTube Script Importer
            </Link>
            . Transcripts can be sent to{" "}
            <Link href="/language-studio?tab=Rewrite" className="font-semibold text-emerald-300 underline">
              Language Studio Rewrite
            </Link>
            .
          </p>
        </div>

        {dualProjects ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <InterviewImportPanel
              headingLabel={`Home — ${dualProjects.homeProject.homeTeam}`}
              teamNameLine="Post-match press conference or interview (home project)"
              listedInterviews={dualProjects.homeProject.layers.interviews}
              youtubeUrl={homeYoutubeUrl}
              onYoutubeUrlChange={setHomeYoutubeUrl}
              globalBusy={busy}
              isImporting={importingForKey === `${dualProjects.homeProject.id}:import:home`}
              panelStyle={{
                border: "rgba(56,189,248,0.25)",
                background: "rgba(14,116,144,0.06)",
                titleClass: "text-sky-200",
              }}
              onImportUrl={() =>
                run(async () => {
                  if (!homeYoutubeUrl.trim()) throw new Error("Paste a Home YouTube URL.");
                  setInterviewImportKey(`${dualProjects.homeProject.id}:import:home`);
                  try {
                    await importInterviewForProject(
                      dualProjects.homeProject.id,
                      homeYoutubeUrl,
                      () => setHomeYoutubeUrl(""),
                      "home",
                    );
                  } finally {
                    setInterviewImportKey(null);
                  }
                })
              }
              onSendToRewrite={(interviewId) =>
                run(async () => {
                  await sendInterviewToRewrite(dualProjects.homeProject.id, interviewId);
                })
              }
              onDeleteInterview={(interviewId) =>
                run(async () => {
                  await deleteInterviewRow(dualProjects.homeProject.id, interviewId);
                })
              }
            />
            <InterviewImportPanel
              headingLabel={`Away — ${dualProjects.awayProject.awayTeam}`}
              teamNameLine="Post-match press conference or interview (away project)"
              listedInterviews={dualProjects.awayProject.layers.interviews}
              youtubeUrl={awayYoutubeUrl}
              onYoutubeUrlChange={setAwayYoutubeUrl}
              globalBusy={busy}
              isImporting={importingForKey === `${dualProjects.awayProject.id}:import:away`}
              panelStyle={{
                border: "rgba(52,211,153,0.25)",
                background: "rgba(16,185,129,0.06)",
                titleClass: "text-emerald-200",
              }}
              onImportUrl={() =>
                run(async () => {
                  if (!awayYoutubeUrl.trim()) throw new Error("Paste an Away YouTube URL.");
                  setInterviewImportKey(`${dualProjects.awayProject.id}:import:away`);
                  try {
                    await importInterviewForProject(
                      dualProjects.awayProject.id,
                      awayYoutubeUrl,
                      () => setAwayYoutubeUrl(""),
                      "away",
                    );
                  } finally {
                    setInterviewImportKey(null);
                  }
                })
              }
              onSendToRewrite={(interviewId) =>
                run(async () => {
                  await sendInterviewToRewrite(dualProjects.awayProject.id, interviewId);
                })
              }
              onDeleteInterview={(interviewId) =>
                run(async () => {
                  await deleteInterviewRow(dualProjects.awayProject.id, interviewId);
                })
              }
            />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <InterviewImportPanel
              headingLabel={`Home — ${project.homeTeam}`}
              teamNameLine="Post-match press conference or interview"
              listedInterviews={homeListSingle}
              youtubeUrl={homeYoutubeUrl}
              onYoutubeUrlChange={setHomeYoutubeUrl}
              globalBusy={busy}
              isImporting={importingForKey === `${project.id}:import:home`}
              panelStyle={{
                border: "rgba(56,189,248,0.25)",
                background: "rgba(14,116,144,0.06)",
                titleClass: "text-sky-200",
              }}
              onImportUrl={() =>
                run(async () => {
                  if (!homeYoutubeUrl.trim()) throw new Error("Paste a home-side YouTube URL.");
                  setInterviewImportKey(`${project.id}:import:home`);
                  try {
                    await importInterviewForProject(project.id, homeYoutubeUrl, () => setHomeYoutubeUrl(""), "home");
                  } finally {
                    setInterviewImportKey(null);
                  }
                })
              }
              onSendToRewrite={(interviewId) =>
                run(async () => {
                  await sendInterviewToRewrite(project.id, interviewId);
                })
              }
              onDeleteInterview={(interviewId) =>
                run(async () => {
                  await deleteInterviewRow(project.id, interviewId);
                })
              }
            />
            <InterviewImportPanel
              headingLabel={`Away — ${project.awayTeam}`}
              teamNameLine="Post-match press conference or interview"
              listedInterviews={awayListSingle}
              youtubeUrl={awayYoutubeUrl}
              onYoutubeUrlChange={setAwayYoutubeUrl}
              globalBusy={busy}
              isImporting={importingForKey === `${project.id}:import:away`}
              panelStyle={{
                border: "rgba(52,211,153,0.25)",
                background: "rgba(16,185,129,0.06)",
                titleClass: "text-emerald-200",
              }}
              onImportUrl={() =>
                run(async () => {
                  if (!awayYoutubeUrl.trim()) throw new Error("Paste an away-side YouTube URL.");
                  setInterviewImportKey(`${project.id}:import:away`);
                  try {
                    await importInterviewForProject(project.id, awayYoutubeUrl, () => setAwayYoutubeUrl(""), "away");
                  } finally {
                    setInterviewImportKey(null);
                  }
                })
              }
              onSendToRewrite={(interviewId) =>
                run(async () => {
                  await sendInterviewToRewrite(project.id, interviewId);
                })
              }
              onDeleteInterview={(interviewId) =>
                run(async () => {
                  await deleteInterviewRow(project.id, interviewId);
                })
              }
            />
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {backButton}
          <R365Button onClick={() => run(completeTranscripts)} disabled={busy || isInterviewImportBusy}>
            Continue
          </R365Button>
          <R365Button variant="ghost" onClick={() => run(skipTranscripts)} disabled={busy || isInterviewImportBusy}>
            {dualProjects ? "Skip both" : "Skip"}
          </R365Button>
        </div>
        {error || localError ? <p className="text-sm text-red-300">{error || localError}</p> : null}
      </div>
    );
  }

  if (step === "image_intelligence") {
    return (
      <ImageIntelligenceStep
        project={project}
        onProjectChange={onProjectChange}
        onBack={onBack ? () => run(retreat) : undefined}
        busy={busy}
        error={error || localError}
      />
    );
  }

  if (step === "media_builder") {
    return (
      <div className="space-y-4">
        {standingsRefresh}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">{stepLabel(step)}</p>
          <h3 className="mt-2 text-xl font-bold text-[color:var(--text-primary)]">Media builder</h3>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Generate headline, standfirst, Report 2.0 body (The Story → Football365 Verdict), player ratings, and 16 Conclusions from the EIO.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
          <input
            type="checkbox"
            checked
            disabled
            readOnly
          />
          Include 16 Conclusions (required for Football365 output)
        </label>
        {project.mediaOutputs ? (
          <div className="space-y-4">
            {backButton}
            <p className="text-sm text-emerald-300">Media outputs ready — proceed to review.</p>
            <MatchReportOutputPreview
              project={project}
              content={mediaOutputsToPreviewContent(project.mediaOutputs)}
            />
            <MatchReportDistributionPanel project={project} onProjectChange={onProjectChange} disabled={busy} />
            {project.archive?.languageStudioUrl || project.archive?.languageStudioArticleId ? (
              <p className="text-sm text-[color:var(--text-secondary)]">
                Report sent to{" "}
                <Link
                  href={
                    project.archive.languageStudioUrl ??
                    `/language-studio?tab=${encodeURIComponent("Rewrite")}&articleId=${encodeURIComponent(project.archive.languageStudioArticleId ?? "")}`
                  }
                  className="font-semibold text-emerald-300 underline"
                >
                  Language Studio Rewrite
                </Link>{" "}
                for editing.
              </p>
            ) : null}
            <R365Button
              onClick={() =>
                run(() =>
                  advanceWorkflow({ workflowStep: "review", workflowPhase: "review", status: "review" }),
                )
              }
              disabled={busy}
            >
              Continue to review
            </R365Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {backButton}
            <R365Button
              onClick={() =>
                run(async () => {
                  let res: Response;
                  try {
                    res = await fetch(studioApiPath("/api/match-report/generate-media"), {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        projectId: project.id,
                        includeSixteenConclusions: true,
                      }),
                    });
                  } catch (e) {
                    const message = e instanceof Error ? e.message : "Network error";
                    throw new Error(
                      message.toLowerCase().includes("fetch")
                        ? "Media builder request failed before the server responded. Retry — report generation can take 1–2 minutes and runs in the background."
                        : message,
                    );
                  }
                  const data = await parseApiJson<{
                    async?: boolean;
                    jobId?: string;
                    project?: MatchReportProject;
                    error?: string;
                  }>(res);
                  if (!res.ok) throw new Error(data.error || "Media builder failed");
                  if (data.async && data.jobId) {
                    onAsyncJob(data.jobId, "generate_media");
                    return;
                  }
                  if (data.project) onProjectChange(data.project);
                })
              }
              disabled={busy}
            >
              {busy ? "Generating…" : "Run Media Builder"}
            </R365Button>
          </div>
        )}
        {error || localError ? <p className="text-sm text-red-300">{error || localError}</p> : null}
      </div>
    );
  }

  if (step === "fact_check") {
    return (
      <div className="space-y-4">
        {standingsRefresh}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">{stepLabel(step)}</p>
          <h3 className="mt-2 text-xl font-bold text-[color:var(--text-primary)]">Fact check & R&D score</h3>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Validate Tier 1 match facts, quote support, source-backed insight, brand fit and Content Creator profile strength before review.
          </p>
        </div>
        <EditableMatchReportOutput project={project} busy={busy} onProjectChange={onProjectChange} run={run} showAiFix={false} />
        <FactCheckActionBar
          project={project}
          busy={busy}
          onProjectChange={onProjectChange}
          onError={setLocalError}
        />
        <ReviewEditorialScorePanel project={project} onProjectChange={onProjectChange} disabled={busy} />
        <FactCheckPanel factCheck={project.factCheck} />
        <div className="flex flex-wrap gap-3">
          {backButton}
          <R365Button
            onClick={() =>
              run(() =>
                advanceWorkflow({ workflowStep: "review", workflowPhase: "review", status: "review" }),
              )
            }
            disabled={busy || !project.factCheck || project.factCheck.status === "blocked"}
          >
            Continue to review
          </R365Button>
        </div>
        {project.factCheck?.status === "blocked" ? (
          <p className="text-sm text-red-300">Resolve high-severity Tier 1 issues before review/publish.</p>
        ) : null}
        {error || localError ? <p className="text-sm text-red-300">{error || localError}</p> : null}
      </div>
    );
  }

  return null;
}
