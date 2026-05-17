"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import type { LoopFeedTeamRow } from "@/app/lib/tools/loop-feed-teams-store";

export function LoopFeedTeamsClient() {
  const [teams, setTeams] = useState<LoopFeedTeamRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draftName, setDraftName] = useState("");
  const [draftUrl, setDraftUrl] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/tools/loop-feed-teams");
    const data = (await res.json()) as { teams?: LoopFeedTeamRow[] };
    setTeams(Array.isArray(data.teams) ? data.teams : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addTeam = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/tools/loop-feed-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName.trim(), topicUrl: draftUrl.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) throw new Error(data.error || `Save failed (${res.status})`);
      setDraftName("");
      setDraftUrl("");
      setMessage("Team saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const patchTeam = async (row: LoopFeedTeamRow, patch: Partial<Pick<LoopFeedTeamRow, "name" | "topicUrl" | "active">>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/tools/loop-feed-teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          name: patch.name ?? row.name,
          topicUrl: patch.topicUrl ?? row.topicUrl,
          active: patch.active ?? row.active,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) throw new Error(data.error || `Update failed (${res.status})`);
      setMessage("Updated.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const removeTeam = async (id: string) => {
    if (!confirm("Remove this team from the Loop Feed catalog?")) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/tools/loop-feed-teams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) throw new Error(data.error || `Delete failed (${res.status})`);
      setMessage("Removed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div>
        <Link href="/tools" className="text-sm font-semibold text-[#22c55e] hover:underline">
          ← Tools
        </Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[color:var(--text-primary)]">Loop Feed teams</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Add each club&apos;s Loop topic <strong className="text-[color:var(--text-primary)]">content</strong> URL once. Data Studio
          then offers Side A / Side B dropdowns instead of pasting URLs every time. For{" "}
          <Link href="/tools/loop-feed-priority-reporters" className="font-semibold text-[#22c55e] hover:underline">
            priority reporters per sport
          </Link>{" "}
          (transfers, beats), use the separate Tools page — both feed the AI together.
        </p>
      </div>

      <Panel title="Add team">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Display name
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Manchester United"
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Topic content URL
            <input
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://q.loop-feed.com/v1/topic/…/content"
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <R365Button type="button" onClick={() => void addTeam()} disabled={busy || !draftUrl.trim()}>
            {busy ? "Saving…" : "Add team"}
          </R365Button>
        </div>
        {message ? <p className="mt-3 text-sm text-[#22c55e]">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </Panel>

      <Panel title="Saved teams">
        {teams.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No teams yet — add one above. Defaults are created on first API read if the store file was missing.</p>
        ) : (
          <ul className="space-y-4">
            {teams.map((row) => (
              <li key={row.id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                <TeamEditorRow row={row} busy={busy} onSave={patchTeam} onDelete={() => void removeTeam(row.id)} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function TeamEditorRow({
  row,
  busy,
  onSave,
  onDelete,
}: {
  row: LoopFeedTeamRow;
  busy: boolean;
  onSave: (row: LoopFeedTeamRow, patch: Partial<Pick<LoopFeedTeamRow, "name" | "topicUrl" | "active">>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [topicUrl, setTopicUrl] = useState(row.topicUrl);
  useEffect(() => {
    setName(row.name);
    setTopicUrl(row.topicUrl);
  }, [row.id, row.name, row.topicUrl]);

  const unchanged = name === row.name && topicUrl === row.topicUrl;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <code className="text-[11px] text-[color:var(--text-muted)]">{row.id}</code>
        <label className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
          <input
            type="checkbox"
            checked={row.active}
            disabled={busy}
            onChange={(e) => onSave(row, { active: e.target.checked })}
          />
          Active (shown in Data Studio)
        </label>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)]"
      />
      <input
        value={topicUrl}
        onChange={(e) => setTopicUrl(e.target.value)}
        className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 font-mono text-[11px] text-[color:var(--text-secondary)]"
      />
      <div className="flex flex-wrap gap-2">
        <R365Button type="button" variant="ghost" disabled={busy || unchanged} onClick={() => onSave(row, { name, topicUrl })}>
          Save changes
        </R365Button>
        <R365Button type="button" variant="ghost" disabled={busy} onClick={onDelete}>
          Delete
        </R365Button>
      </div>
    </div>
  );
}
