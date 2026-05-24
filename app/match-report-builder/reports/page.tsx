"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";
import type { SavedReportIndexEntry } from "@/app/lib/match-report/types";
import { MatchReportNav } from "@/app/match-report-builder/components/MatchReportNav";

export default function MatchReportReportsPage() {
  const [entries, setEntries] = useState<SavedReportIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch(studioApiPath("/api/match-report/projects"))
      .then((res) => res.json())
      .then((data) => {
        setEntries(Array.isArray(data.entries) ? data.entries : []);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load reports"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (projectId: string) => {
    setDeletingId(projectId);
    try {
      const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(projectId)}`), {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Delete failed");
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <MatchReportNav active="reports" />
      <Panel title="All Reports">
        {loading ? <p className="text-sm text-[color:var(--text-secondary)]">Loading…</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {!loading && !error && entries.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[color:var(--text-secondary)]">No saved match reports yet.</p>
            <Link href="/match-report-builder">
              <R365Button>Generate a report</R365Button>
            </Link>
          </div>
        ) : null}
        {!loading && entries.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {entries.map((entry) => (
              <li key={entry.projectId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-[color:var(--text-primary)]">{entry.displayLabel}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {entry.competitionCode ?? entry.homeTeam} · confidence {entry.confidence}% · step{" "}
                    {entry.workflowStep} · {new Date(entry.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/match-report-builder/${entry.projectId}`}>
                    <R365Button variant="ghost">Open</R365Button>
                  </Link>
                  <R365Button
                    variant="danger"
                    disabled={deletingId === entry.projectId}
                    onClick={() => void handleDelete(entry.projectId)}
                  >
                    {deletingId === entry.projectId ? "Deleting…" : "Delete"}
                  </R365Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
    </div>
  );
}
