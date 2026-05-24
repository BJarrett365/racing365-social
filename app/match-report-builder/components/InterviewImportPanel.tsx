"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { withAppPathPrefix } from "@/app/lib/app-base-path";
import type { InterviewIntelligence } from "@/app/lib/match-report/types";

const inputClass =
  "w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]";

function useTranscriptImportPhases(importing: boolean) {
  const [phaseLabel, setPhaseLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!importing) {
      setPhaseLabel(null);
      return;
    }
    setPhaseLabel("Fetching video details…");
    const t1 = window.setTimeout(
      () => setPhaseLabel("Pulling transcript (YouTube / Apify — allow up to 90 seconds)…"),
      4500,
    );
    const t2 = window.setTimeout(() => setPhaseLabel("Generating AI summary…"), 38000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [importing]);
  return phaseLabel;
}

function transcriptSourceLabel(source?: InterviewIntelligence["transcriptSource"]): string {
  if (source === "apify") return "Apify";
  if (source === "youtube_api") return "YouTube Captions";
  if (source === "manual_paste") return "Manual";
  if (source === "uploaded_transcription") return "Uploaded";
  return "Transcript";
}

function teamChipLabel(interview: InterviewIntelligence): string | null {
  if (interview.team === "home") return "Home";
  if (interview.team === "away") return "Away";
  if (interview.team === "neutral") return "Neutral";
  if (interview.team == null) return "Untagged";
  return null;
}

function ImportedInterviewCard({
  interview,
  onSendToRewrite,
  onDelete,
  disabled,
}: {
  interview: InterviewIntelligence;
  onSendToRewrite: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const chip = teamChipLabel(interview);
  return (
    <div
      className="rounded-xl border p-3 text-sm"
      style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-[color:var(--text-primary)]">
            {interview.title || interview.sourceUrl}
          </p>
          <p className="mt-0.5 break-all text-xs text-[color:var(--text-muted)]">{interview.sourceUrl}</p>
          {interview.channelName ? (
            <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">{interview.channelName}</p>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          {chip ? (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-200"
              style={{ borderColor: "rgba(56,189,248,0.35)", background: "rgba(14,116,144,0.15)" }}
            >
              {chip}
            </span>
          ) : null}
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300"
            style={{ borderColor: "rgba(52,211,153,0.35)", background: "rgba(16,185,129,0.12)" }}
          >
            {transcriptSourceLabel(interview.transcriptSource)}
          </span>
        </div>
      </div>
      {interview.summary ? (
        <p className="mt-2 text-xs leading-5 text-[color:var(--text-secondary)] line-clamp-4">
          {interview.summary}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-[color:var(--text-muted)]">
        {interview.transcriptText?.length.toLocaleString() ?? 0} chars
        {interview.quotes.length ? ` · ${interview.quotes.length} quote line${interview.quotes.length === 1 ? "" : "s"}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {interview.languageArticleId ? (
          <Link
            href={withAppPathPrefix(
              `/language-studio?tab=${encodeURIComponent("Rewrite")}&articleId=${encodeURIComponent(interview.languageArticleId)}`,
            )}
            className="inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-semibold text-emerald-300 underline"
            style={{ borderColor: "rgba(52,211,153,0.35)" }}
          >
            Open in Language Studio Rewrite
          </Link>
        ) : (
          <R365Button variant="ghost" onClick={() => void onSendToRewrite()} disabled={disabled}>
            Send to Language Studio Rewrite
          </R365Button>
        )}
        <R365Button variant="ghost" onClick={() => void onDelete()} disabled={disabled}>
          Remove
        </R365Button>
      </div>
    </div>
  );
}

export function InterviewImportPanel({
  headingLabel,
  teamNameLine,
  listedInterviews,
  youtubeUrl,
  onYoutubeUrlChange,
  onImportUrl,
  onSendToRewrite,
  onDeleteInterview,
  globalBusy,
  isImporting,
  panelStyle,
}: {
  /** e.g. "Home — Leeds United" */
  headingLabel: string;
  /** Short line under the heading (shown as secondary prose) */
  teamNameLine: string;
  listedInterviews: InterviewIntelligence[];
  youtubeUrl: string;
  onYoutubeUrlChange: (value: string) => void;
  onImportUrl: () => void | Promise<void>;
  onSendToRewrite: (interviewId: string) => void | Promise<void>;
  onDeleteInterview: (interviewId: string) => void | Promise<void>;
  globalBusy?: boolean;
  isImporting?: boolean;
  panelStyle: { border: string; background: string; titleClass: string };
}) {
  const phaseLabel = useTranscriptImportPhases(Boolean(isImporting));
  const blocked = Boolean(globalBusy || isImporting);

  return (
    <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: panelStyle.border, background: panelStyle.background }}>
      <div>
        <h4 className={`text-sm font-black uppercase tracking-wide ${panelStyle.titleClass}`}>{headingLabel}</h4>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{teamNameLine}</p>
        <p className="mt-2 text-xs text-[color:var(--text-muted)]">
          Paste one URL per clip; repeat to stack multiple transcripts. Same engine as{" "}
          <Link href="/tools/youtube-script-importer" className="font-semibold text-emerald-300 underline">
            YouTube Script Importer
          </Link>
          . Send extracts to{" "}
          <Link href="/language-studio?tab=Rewrite" className="font-semibold text-emerald-300 underline">
            Language Studio Rewrite
          </Link>{" "}
          when needed.
        </p>
      </div>
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">YouTube URL</span>
        <input
          className={inputClass}
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          value={youtubeUrl}
          onChange={(e) => onYoutubeUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          disabled={blocked}
        />
      </label>
      <R365Button onClick={() => void onImportUrl()} disabled={blocked || !youtubeUrl.trim()}>
        Import transcript + summary
      </R365Button>

      {isImporting && phaseLabel ? (
        <div
          className="rounded-xl border px-4 py-3"
          style={{ borderColor: "rgba(52,211,153,0.35)", background: "rgba(16,185,129,0.08)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Import in progress</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-primary)]">{phaseLabel}</p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            Steps can overlap on the server; long waits usually mean transcript retrieval.
          </p>
        </div>
      ) : null}

      {listedInterviews.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Imported ({listedInterviews.length})
          </p>
          {listedInterviews.map((interview) => (
            <ImportedInterviewCard
              key={interview.id}
              interview={interview}
              disabled={blocked}
              onSendToRewrite={() => onSendToRewrite(interview.id)}
              onDelete={() => onDeleteInterview(interview.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export { inputClass as interviewInputClass };
