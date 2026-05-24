"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { studioApiPath } from "@/app/lib/app-base-path";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { MatchReportProject } from "@/app/lib/match-report/types";

const ALL_PHASES = [
  "Loading match data…",
  "Applying editorial brief…",
  "Building event picture…",
  "Generating player ratings…",
  "Fact-checking every detail…",
  "AI is writing the report…",
  "Generating hero image…",
  "Building 16 conclusions…",
  "Finalising outputs…",
];

const START_INDEX: Record<string, number> = {
  build_picture: 0,
  player_intelligence: 3,
  generate_media: 5,
};

type JobKind = "build_picture" | "player_intelligence" | "generate_media";

type Props = {
  jobId: string;
  projectId?: string;
  open: boolean;
  kind?: JobKind;
  onComplete: () => void;
  onError: (message: string) => void;
};

function projectLooksComplete(project: MatchReportProject, kind: JobKind): boolean {
  if (kind === "player_intelligence") return Boolean(project.playerIntelligence?.ratings.length);
  if (kind === "generate_media") return Boolean(project.mediaOutputs?.reportHtml);
  return Boolean(project.eventPicture);
}

export function ProgressModal({
  jobId,
  projectId,
  open,
  kind = "build_picture",
  onComplete,
  onError,
}: Props) {
  const startIndex = START_INDEX[kind] ?? 0;
  const phases = useMemo(() => ALL_PHASES.slice(startIndex), [startIndex]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [message, setMessage] = useState(phases[0] ?? ALL_PHASES[0]!);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const finishedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  useEffect(() => {
    if (!open) return;
    finishedRef.current = false;
    setPhaseIndex(0);
    setMessage(phases[0] ?? ALL_PHASES[0]!);
  }, [open, jobId, phases]);

  useEffect(() => {
    if (!open || !jobId) return;

    let cancelled = false;
    let pollFailures = 0;

    const finish = (handler: () => void) => {
      if (cancelled || finishedRef.current) return;
      finishedRef.current = true;
      handler();
    };

    const timer = window.setInterval(() => {
      setPhaseIndex((index) => {
        const next = Math.min(index + 1, phases.length - 1);
        setMessage(phases[next] ?? ALL_PHASES[0]!);
        return next;
      });
    }, 4500);

    const pollProject = async (): Promise<boolean> => {
      if (!projectId) return false;
      const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(projectId)}`));
      const data = await parseApiJson<{ project?: MatchReportProject; error?: string }>(res);
      if (!res.ok || !data.project) return false;
      return projectLooksComplete(data.project, kind);
    };

    const pollOnce = async () => {
      try {
        let completed = false;

        if (projectId) {
          try {
            completed = await pollProject();
          } catch {
            /* fall through to job poll */
          }
        }

        if (!completed) {
          const res = await fetch(studioApiPath(`/api/match-report/jobs/${encodeURIComponent(jobId)}`));
          const job = await parseApiJson<{ status?: string; error?: string; phase?: string }>(res);
          if (job.phase) setMessage(job.phase);
          if (job.status === "completed") completed = true;
          if (job.status === "failed") {
            window.clearInterval(poll);
            window.clearInterval(timer);
            finish(() => onErrorRef.current(job.error || "Job failed."));
            return;
          }
        }

        pollFailures = 0;

        if (completed) {
          window.clearInterval(poll);
          window.clearInterval(timer);
          finish(() => onCompleteRef.current());
        }
      } catch (e) {
        pollFailures += 1;
        if (pollFailures >= 6) {
          window.clearInterval(poll);
          window.clearInterval(timer);
          finish(() =>
            onErrorRef.current(e instanceof Error ? e.message : "Job status check failed."),
          );
        }
      }
    };

    void pollOnce();
    const poll = window.setInterval(() => {
      void pollOnce();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearInterval(poll);
    };
  }, [open, jobId, projectId, kind, phases]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border px-6 py-8 text-center shadow-2xl"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Building intelligence</p>
        <p className="mt-4 text-lg font-semibold text-[color:var(--text-primary)]">{message}</p>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">This usually takes 20–90 seconds.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-1.5">
          {ALL_PHASES.map((_, idx) => (
            <span
              key={idx}
              className={`h-2 w-2 rounded-full ${
                idx <= startIndex + phaseIndex ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
