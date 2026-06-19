"use client";

import { useEffect, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { MatchReportProject } from "@/app/lib/match-report/types";
import {
  MatchReportOutputPreview,
  mediaOutputsToPreviewContent,
} from "@/app/match-report-builder/components/MatchReportOutputPreview";

type Props = {
  project: MatchReportProject;
  busy?: boolean;
  onProjectChange: (project: MatchReportProject) => void;
  run: (fn: () => Promise<void>) => Promise<void>;
  showAiFix?: boolean;
};

export function EditableMatchReportOutput({
  project,
  busy,
  onProjectChange,
  run,
  showAiFix = true,
}: Props) {
  const mediaOutputs = project.mediaOutputs;
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState(mediaOutputs?.headline ?? "");
  const [standfirst, setStandfirst] = useState(mediaOutputs?.standfirst ?? "");
  const [reportHtml, setReportHtml] = useState(mediaOutputs?.reportHtml ?? "");

  useEffect(() => {
    setHeadline(mediaOutputs?.headline ?? "");
    setStandfirst(mediaOutputs?.standfirst ?? "");
    setReportHtml(mediaOutputs?.reportHtml ?? "");
  }, [mediaOutputs?.headline, mediaOutputs?.reportHtml, mediaOutputs?.standfirst, project.id]);

  if (!mediaOutputs) return null;

  const saveManualEdits = async () => {
    const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(project.id)}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaOutputs: { headline, standfirst, reportHtml },
        factCheck: null,
      }),
    });
    const data = await parseApiJson<{ project?: MatchReportProject; error?: string }>(res);
    if (!res.ok || !data.project) throw new Error(data.error || "Save edits failed");
    onProjectChange(data.project);
    setEditing(false);
  };

  const repairWithAi = async () => {
    const res = await fetch(
      studioApiPath(`/api/match-report/projects/${encodeURIComponent(project.id)}/repair-fact-check`),
      { method: "POST", headers: { "Content-Type": "application/json" } },
    );
    const data = await parseApiJson<{ project?: MatchReportProject; error?: string }>(res);
    if (!res.ok || !data.project) throw new Error(data.error || "AI repair failed");
    onProjectChange(data.project);
    setEditing(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Editable output</p>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Make manual changes, or let AI repair the current fact-check issues and rerun the check.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <R365Button type="button" onClick={() => setEditing((value) => !value)} disabled={busy}>
            {editing ? "Preview" : "Edit manually"}
          </R365Button>
          {showAiFix ? (
            <R365Button
              type="button"
              onClick={() => run(repairWithAi)}
              disabled={busy || !project.factCheck?.issues.length}
            >
              AI fix issues
            </R365Button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            Headline
            <input
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              className="mt-2 w-full rounded-xl border bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            Standfirst
            <textarea
              value={standfirst}
              onChange={(event) => setStandfirst(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            Report HTML
            <textarea
              value={reportHtml}
              onChange={(event) => setReportHtml(event.target.value)}
              rows={14}
              className="mt-2 w-full rounded-xl border bg-[color:var(--surface-muted)] px-3 py-2 font-mono text-xs leading-5 text-[color:var(--text-primary)] outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <R365Button type="button" onClick={() => run(saveManualEdits)} disabled={busy}>
              Save edits
            </R365Button>
            <R365Button
              type="button"
              onClick={() => {
                setHeadline(mediaOutputs.headline);
                setStandfirst(mediaOutputs.standfirst);
                setReportHtml(mediaOutputs.reportHtml);
                setEditing(false);
              }}
              disabled={busy}
            >
              Cancel
            </R365Button>
          </div>
        </div>
      ) : (
        <MatchReportOutputPreview project={project} content={mediaOutputsToPreviewContent(mediaOutputs)} />
      )}
    </div>
  );
}
