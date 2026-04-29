"use client";

import { useCallback, useEffect, useState } from "react";
import { parseApiJson } from "@/app/lib/parse-api-json";
import { formatEditingRevisionActorLabel } from "@/features/editing-studio/lib/editing-revision-actor";
import { getEditingStudioClientHeaders } from "@/features/editing-studio/lib/editing-client-headers";
import { diffEditingProjectsForCompare } from "@/features/editing-studio/revisions/project-diff-summary";
import type {
  EditingProject,
  EditingProjectRevision,
  EditingProjectRevisionSummary,
} from "@/features/editing-studio/types/domain";

function kindLabel(k: EditingProjectRevisionSummary["kind"]): string {
  switch (k) {
    case "create":
      return "Create";
    case "save":
      return "Save";
    case "rollback":
      return "Rollback";
    default:
      return k;
  }
}

type Props = {
  projectId: string;
  currentProject: EditingProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful rollback with the new server project. */
  onRollbackComplete?: (project: EditingProject) => void;
};

export function RevisionHistoryDrawer({ projectId, currentProject, open, onOpenChange, onRollbackComplete }: Props) {
  const [list, setList] = useState<EditingProjectRevisionSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EditingProjectRevision | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [rollbackBusy, setRollbackBusy] = useState(false);
  const [rollbackNote, setRollbackNote] = useState("");

  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDisplayName(window.localStorage.getItem("editing-studio-user-name") ?? "");
  }, [open]);

  const persistDisplayName = useCallback((name: string) => {
    setDisplayName(name);
    if (typeof window !== "undefined") {
      if (name.trim()) window.localStorage.setItem("editing-studio-user-name", name.trim());
      else window.localStorage.removeItem("editing-studio-user-name");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingList(true);
    setListError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/editing-studio/projects/${encodeURIComponent(projectId)}/revisions`);
        const data = await parseApiJson<{ revisions?: EditingProjectRevisionSummary[]; error?: string }>(res);
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to load history");
        if (!cancelled) setList(data.revisions ?? []);
      } catch (e) {
        if (!cancelled) setListError(e instanceof Error ? e.message : "Failed to load history");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  useEffect(() => {
    if (!open || !selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setDetailError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/editing-studio/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(selectedId)}`,
        );
        const data = await parseApiJson<{ revision?: EditingProjectRevision; error?: string }>(res);
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to load revision");
        if (!cancelled) setDetail(data.revision ?? null);
      } catch (e) {
        if (!cancelled) setDetailError(e instanceof Error ? e.message : "Failed to load revision");
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, selectedId]);

  const diffRows = detail
    ? diffEditingProjectsForCompare(currentProject, detail.snapshot)
    : [];

  const onRollback = async () => {
    if (!detail?.id) return;
    const ok = window.confirm(
      "Restore this project to the selected revision? Your current draft will be replaced. This creates a new revision.",
    );
    if (!ok) return;
    setRollbackBusy(true);
    try {
      const res = await fetch(
        `/api/editing-studio/projects/${encodeURIComponent(projectId)}/revisions/rollback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getEditingStudioClientHeaders(),
          },
          body: JSON.stringify({
            revisionId: detail.id,
            note: rollbackNote.trim() || undefined,
          }),
        },
      );
      const data = await parseApiJson<{ project?: EditingProject; error?: string }>(res);
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Rollback failed");
      if (!data.project) throw new Error("Invalid response");
      onRollbackComplete?.(data.project);
      setRollbackNote("");
      onOpenChange(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Rollback failed");
    } finally {
      setRollbackBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close revision history"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className="relative flex h-full w-full max-w-xl flex-col border-l bg-[var(--surface)] shadow-xl"
        style={{ borderColor: "var(--border)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="revision-history-title"
      >
        <div className="flex items-start justify-between gap-3 border-b pb-3 pl-4 pr-3 pt-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 id="revision-history-title" className="text-sm font-bold text-[color:var(--text-primary)]">
              Revision history
            </h2>
            <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
              Compare snapshots and roll back. Optional name below is sent as <code className="text-[10px]">x-editing-user-name</code>{" "}
              for future saves.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border px-2 py-1 text-xs text-[color:var(--text-primary)] sm:text-sm"
            style={{ borderColor: "var(--border)" }}
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
        </div>

        <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <label className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]" htmlFor="ed-rev-display-name">
            Your display name (optional)
          </label>
          <input
            id="ed-rev-display-name"
            type="text"
            className="mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            style={{ borderColor: "var(--border)" }}
            value={displayName}
            onChange={(e) => persistDisplayName(e.target.value)}
            placeholder="Shown as “changed by” on new revisions"
          />
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-[var(--surface)] p-2" style={{ borderColor: "var(--border)" }}>
            {loadingList ? (
              <p className="p-2 text-sm text-[color:var(--text-muted)]">Loading…</p>
            ) : listError ? (
              <p className="p-2 text-sm text-red-600 dark:text-red-400">{listError}</p>
            ) : list.length === 0 ? (
              <p className="p-2 text-sm text-[color:var(--text-muted)]">No revisions yet. Save the project to create history.</p>
            ) : (
              <ul className="space-y-1">
                {list.map((r) => {
                  const selected = selectedId === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selected ? "bg-[var(--surface-hover)]" : "hover:bg-[var(--surface-hover)]"
                        }`}
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ borderColor: "var(--border)" }}>
                            {kindLabel(r.kind)}
                          </span>
                          <span className="font-mono text-xs text-[color:var(--text-muted)]">r{r.projectRevisionAfter}</span>
                          <span className="text-xs text-[color:var(--text-muted)]">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--text-secondary)]">
                          {formatEditingRevisionActorLabel(r.changedBy)}
                        </div>
                        {r.fieldsChanged.length > 0 ? (
                          <div className="mt-1 text-[11px] text-[color:var(--text-muted)]">
                            {r.fieldsChanged.slice(0, 8).join(", ")}
                            {r.fieldsChanged.length > 8 ? "…" : ""}
                          </div>
                        ) : null}
                        {r.note ? (
                          <div className="mt-1 text-[11px] italic text-[color:var(--text-secondary)]">{r.note}</div>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-auto flex min-h-0 flex-col rounded-xl border bg-[var(--surface)] p-3" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">Compare to current</h3>
            {!selectedId ? (
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">Select a revision to compare.</p>
            ) : loadingDetail ? (
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">Loading…</p>
            ) : detailError ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{detailError}</p>
            ) : detail ? (
              <>
                <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                  {diffRows.length === 0
                    ? "No field differences vs current draft (same tracked fields)."
                    : `${diffRows.length} field group(s) differ.`}
                </p>
                <div className="mt-2 max-h-64 overflow-auto text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left text-[10px] uppercase text-[color:var(--text-muted)]">
                        <th className="border-b py-1 pr-2" style={{ borderColor: "var(--border)" }}>
                          Field
                        </th>
                        <th className="border-b py-1 pr-2" style={{ borderColor: "var(--border)" }}>
                          Revision
                        </th>
                        <th className="border-b py-1" style={{ borderColor: "var(--border)" }}>
                          Current
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffRows.map((row) => (
                        <tr key={row.field} className="align-top">
                          <td className="border-b py-1 pr-2 font-mono text-[11px]" style={{ borderColor: "var(--border)" }}>
                            {row.field}
                          </td>
                          <td className="border-b py-1 pr-2 text-[color:var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
                            <pre className="whitespace-pre-wrap break-words font-sans text-[11px]">{row.other}</pre>
                          </td>
                          <td className="border-b py-1 text-[color:var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
                            <pre className="whitespace-pre-wrap break-words font-sans text-[11px]">{row.current}</pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  <label className="text-[10px] font-bold uppercase text-[color:var(--text-muted)]" htmlFor="ed-rev-rollback-note">
                    Rollback note (optional)
                  </label>
                  <textarea
                    id="ed-rev-rollback-note"
                    className="mt-1 w-full rounded-lg border bg-[var(--surface)] px-2 py-1.5 text-sm text-[color:var(--text-primary)]"
                    style={{ borderColor: "var(--border)" }}
                    rows={2}
                    value={rollbackNote}
                    onChange={(e) => setRollbackNote(e.target.value)}
                    placeholder="Why you’re restoring this version"
                  />
                  <button
                    type="button"
                    disabled={rollbackBusy}
                    onClick={() => void onRollback()}
                    className="mt-2 w-full rounded-lg border border-transparent bg-[color:var(--accent)] px-3 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] disabled:opacity-50"
                  >
                    {rollbackBusy ? "Rolling back…" : "Rollback to this revision"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
