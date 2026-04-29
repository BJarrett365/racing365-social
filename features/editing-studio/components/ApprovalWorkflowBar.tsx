"use client";

import { useEffect, useMemo, useState } from "react";
import { parseApiJson } from "@/app/lib/parse-api-json";
import { useEditingWorkflowRole } from "@/features/editing-studio/hooks/use-editing-workflow-role";
import { getEditingStudioClientHeaders } from "@/features/editing-studio/lib/editing-client-headers";
import { datetimeLocalValueToIso, isoToDatetimeLocalValue } from "@/features/editing-studio/settings/datetime-local";
import type { EditingProject } from "@/features/editing-studio/types/domain";
import type { EditingWorkflowRole } from "@/features/editing-studio/types/workflow";
import { formatStatusLabel } from "@/features/editing-studio/utils/display-labels";
import {
  canPerformWorkflowAction,
  workflowActionDisabledReason,
  type WorkflowAction,
} from "@/features/editing-studio/workflow/workflow-permissions";

const ROLE_OPTIONS: readonly EditingWorkflowRole[] = ["admin", "editor", "writer", "reviewer", "publisher"];

type Props = {
  projectId: string;
  currentProject: EditingProject;
  onProjectUpdated: (project: EditingProject) => void;
  onSaveDraft: () => void | Promise<void>;
  onDiscard?: () => void;
  dirty: boolean;
  saveDisabled: boolean;
};

function workflowUrl(projectId: string, segment: string): string {
  return `/api/editing-studio/projects/${encodeURIComponent(projectId)}/workflow/${segment}`;
}

export function ApprovalWorkflowBar({
  projectId,
  currentProject,
  onProjectUpdated,
  onSaveDraft,
  onDiscard,
  dirty,
  saveDisabled,
}: Props) {
  const [role, setRole] = useEditingWorkflowRole();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionNote, setActionNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [commentText, setCommentText] = useState("");
  const [scheduleLocal, setScheduleLocal] = useState(() => isoToDatetimeLocalValue(currentProject.scheduledAt));

  useEffect(() => {
    setScheduleLocal(isoToDatetimeLocalValue(currentProject.scheduledAt));
  }, [currentProject.scheduledAt, currentProject.id]);

  const status = currentProject.status;

  const perm = useMemo(
    () => ({
      save: canPerformWorkflowAction(role, status, "save_draft"),
      submit: canPerformWorkflowAction(role, status, "submit_review"),
      comment: canPerformWorkflowAction(role, status, "add_comment"),
      approve: canPerformWorkflowAction(role, status, "approve"),
      reject: canPerformWorkflowAction(role, status, "reject"),
      schedule: canPerformWorkflowAction(role, status, "schedule"),
      publish: canPerformWorkflowAction(role, status, "publish"),
      archive: canPerformWorkflowAction(role, status, "archive"),
    }),
    [role, status],
  );

  const reason = (action: WorkflowAction) => workflowActionDisabledReason(role, status, action);

  const postWorkflow = async (segment: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(workflowUrl(projectId, segment), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getEditingStudioClientHeaders(),
        },
        body: JSON.stringify(body),
      });
      const data = await parseApiJson<{ project?: EditingProject; error?: string; reason?: string }>(res);
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.reason
              ? `${data.error}: ${data.reason}`
              : data.error
            : "Request failed";
        throw new Error(msg);
      }
      if (!data.project) throw new Error("Invalid response");
      onProjectUpdated(data.project);
      setActionNote("");
      setRejectNote("");
      setCommentText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const comments = currentProject.workflowComments ?? [];
  const recentComments = comments.slice(-12);

  return (
    <div
      className="rounded-xl border bg-[var(--surface)] p-4 shadow-sm"
      style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
      aria-busy={busy}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Status</span>
          <span
            className="inline-flex rounded-md border px-2 py-0.5 text-xs font-medium capitalize"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            {formatStatusLabel(status)}
          </span>
          <label className="ml-2 flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Role</span>
            <select
              className="rounded-lg border bg-[var(--surface)] px-2 py-1 text-sm text-[color:var(--text-primary)]"
              style={{ borderColor: "var(--border)" }}
              value={role}
              onChange={(e) => setRole(e.target.value as EditingWorkflowRole)}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-[color:var(--text-muted)]">
          Permissions are enforced on the server via <code className="text-[10px]">x-editing-role</code> (set from your role
          above).
        </p>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || saveDisabled || !perm.save}
          title={reason("save_draft") ?? "Save draft"}
          onClick={() => void onSaveDraft()}
          className="rounded-lg border border-transparent bg-[color:var(--accent)] px-3 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] disabled:opacity-50"
        >
          {dirty ? "Save draft" : "Saved"}
        </button>

        {onDiscard ? (
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={onDiscard}
            className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] disabled:opacity-50"
            style={{ borderColor: "var(--border)" }}
          >
            Discard changes
          </button>
        ) : null}

        <button
          type="button"
          disabled={busy || !perm.submit}
          title={reason("submit_review") ?? "Submit for review"}
          onClick={() => void postWorkflow("submit-review", { note: actionNote.trim() || undefined })}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          Submit for review
        </button>

        <button
          type="button"
          disabled={busy || !perm.approve}
          title={reason("approve") ?? "Approve"}
          onClick={() => void postWorkflow("approve", { note: actionNote.trim() || undefined })}
          className="rounded-lg border border-emerald-600/40 px-3 py-2 text-sm font-medium text-emerald-800 disabled:opacity-50 dark:text-emerald-300"
          style={{ borderColor: "var(--border)" }}
        >
          Approve
        </button>

        <button
          type="button"
          disabled={busy || !perm.reject || rejectNote.trim().length === 0}
          title={reason("reject") ?? "Reject (note required)"}
          onClick={() => void postWorkflow("reject", { note: rejectNote.trim() })}
          className="rounded-lg border border-red-600/40 px-3 py-2 text-sm font-medium text-red-800 disabled:opacity-50 dark:text-red-300"
          style={{ borderColor: "var(--border)" }}
        >
          Reject to draft
        </button>

        <button
          type="button"
          disabled={busy || !perm.publish}
          title={reason("publish") ?? "Publish"}
          onClick={() => void postWorkflow("publish", { note: actionNote.trim() || undefined })}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          Publish
        </button>

        <button
          type="button"
          disabled={busy || !perm.archive}
          title={reason("archive") ?? "Archive"}
          onClick={() => {
            if (!window.confirm("Archive this project?")) return;
            void postWorkflow("archive", { note: actionNote.trim() || undefined });
          }}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-secondary)] disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          Archive
        </button>
      </div>

      {perm.reject ? (
        <div className="mt-3">
          <label className="text-[10px] font-bold uppercase text-[color:var(--text-muted)]" htmlFor="wf-reject-note">
            Rejection note (required)
          </label>
          <textarea
            id="wf-reject-note"
            className="mt-1 w-full max-w-xl rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            style={{ borderColor: "var(--border)" }}
            rows={2}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Explain what needs to change before resubmitting."
          />
        </div>
      ) : null}

      {perm.schedule ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div>
            <label className="text-[10px] font-bold uppercase text-[color:var(--text-muted)]" htmlFor="wf-schedule-at">
              Schedule publish (UTC stored as ISO)
            </label>
            <input
              id="wf-schedule-at"
              type="datetime-local"
              className="mt-1 block w-full max-w-xs rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
              value={scheduleLocal}
              onChange={(e) => setScheduleLocal(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={busy || !scheduleLocal.trim()}
            onClick={() => {
              const iso = datetimeLocalValueToIso(scheduleLocal);
              if (!iso) {
                setError("Pick a valid date and time.");
                return;
              }
              void postWorkflow("schedule", { scheduledAt: iso, note: actionNote.trim() || undefined });
            }}
            className="rounded-lg border border-transparent bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] disabled:opacity-50"
          >
            Schedule
          </button>
        </div>
      ) : null}

      <div className="mt-4">
        <label className="text-[10px] font-bold uppercase text-[color:var(--text-muted)]" htmlFor="wf-action-note">
          Optional note (submit / approve / publish / archive)
        </label>
        <textarea
          id="wf-action-note"
          className="mt-1 w-full max-w-xl rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          style={{ borderColor: "var(--border)" }}
          rows={2}
          value={actionNote}
          onChange={(e) => setActionNote(e.target.value)}
        />
      </div>

      <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">Reviewer notes</h3>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            className="min-h-[72px] w-full flex-1 rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            style={{ borderColor: "var(--border)" }}
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment without changing status"
            disabled={busy || !perm.comment}
            title={reason("add_comment") ?? "Add comment"}
          />
          <button
            type="button"
            disabled={busy || !perm.comment || !commentText.trim()}
            onClick={() => void postWorkflow("comment", { body: commentText.trim() })}
            className="shrink-0 rounded-lg border px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] disabled:opacity-50"
            style={{ borderColor: "var(--border)" }}
          >
            Add comment
          </button>
        </div>
        {recentComments.length > 0 ? (
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-[color:var(--text-secondary)]">
            {recentComments.map((c) => (
              <li key={c.id} className="rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[color:var(--text-muted)]">
                  <span className="font-semibold uppercase">{c.kind.replace(/_/g, " ")}</span>
                  <span>{new Date(c.at).toLocaleString()}</span>
                  {c.role ? <span className="rounded bg-[var(--surface-hover)] px-1">{c.role}</span> : null}
                  {c.displayName ? <span>{c.displayName}</span> : null}
                </div>
                {c.body ? <p className="mt-1 whitespace-pre-wrap">{c.body}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">No workflow comments yet.</p>
        )}
      </div>
    </div>
  );
}
