"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import type { LoopFeedTeamGroup, LoopFeedTeamRow } from "@/app/lib/tools/loop-feed-teams-store";
import { groupLoopFeedTeams } from "@/app/lib/tools/loop-feed-teams-store";
import {
  LOOP_FEED_TEAM_FEED_TYPES,
  loopFeedTeamFeedTypeDescription,
  loopFeedTeamFeedTypeLabel,
  loopFeedTeamFeedTypeStudioUsage,
  type LoopFeedTeamFeedType,
} from "@/app/lib/tools/loop-feed-team-feed-types";
import {
  CONFIGURE_PATH,
  LOOP_FEED_PRIORITY_REPORTERS_PATH,
} from "@/app/lib/configure/paths";
import { LoopFeedHighlightsPreview } from "@/app/configure/loop-feed-teams/LoopFeedHighlightsPreview";

export function LoopFeedTeamsClient() {
  const [teams, setTeams] = useState<LoopFeedTeamRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draftName, setDraftName] = useState("");
  const [draftUrls, setDraftUrls] = useState<Partial<Record<LoopFeedTeamFeedType, string>>>({});

  const grouped = useMemo(() => groupLoopFeedTeams(teams), [teams]);
  const teamNames = useMemo(
    () => [...new Set(teams.map((row) => row.name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [teams],
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/tools/loop-feed-teams");
    const data = (await res.json()) as { teams?: LoopFeedTeamRow[] };
    setTeams(Array.isArray(data.teams) ? data.teams : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addClubTemplate = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/tools/loop-feed-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: true,
          name: draftName.trim(),
          commentariesUrl: draftUrls.commentaries?.trim() || undefined,
          matchHighlightsUrl: draftUrls.match_highlights?.trim() || undefined,
          matchVideosUrl: draftUrls.match_videos?.trim() || undefined,
          newsUrl: draftUrls.news?.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) throw new Error(data.error || `Save failed (${res.status})`);
      setDraftName("");
      setDraftUrls({});
      setMessage("Club template saved — four feed slots created (paste missing URLs below).");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const ensureTemplate = async (clubName: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/tools/loop-feed-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: true, name: clubName }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) throw new Error(data.error || `Save failed (${res.status})`);
      setMessage(`Added missing feed types for ${clubName}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const patchTeam = async (
    row: LoopFeedTeamRow,
    patch: Partial<Pick<LoopFeedTeamRow, "name" | "topicUrl" | "feedType" | "active">>,
  ) => {
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
          feedType: patch.feedType ?? row.feedType,
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
    if (!confirm("Remove this feed slot from the catalog?")) return;
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
        <Link href={CONFIGURE_PATH} className="text-sm font-semibold text-[#22c55e] hover:underline">
          ← Configure
        </Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[color:var(--text-primary)]">Loop Feed teams</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Each club has <strong className="text-[color:var(--text-primary)]">four Loop feeds</strong> — paste the topic{" "}
          <strong className="text-[color:var(--text-primary)]">content</strong> URL for each type. Priority reporters live on{" "}
          <Link href={LOOP_FEED_PRIORITY_REPORTERS_PATH} className="font-semibold text-[#22c55e] hover:underline">
            Loop Feed priority reporters
          </Link>
          .
        </p>
      </div>

      <Panel title="Four feeds per team">
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {LOOP_FEED_TEAM_FEED_TYPES.map((option) => (
            <li
              key={option.id}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
            >
              <p className="text-sm font-black text-[color:var(--text-primary)]">{option.label}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#22c55e]">{option.studioUsage}</p>
              <p className="mt-2 text-xs leading-5 text-[color:var(--text-secondary)]">{option.description}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Add club template (4 feeds)">
        <div className="space-y-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Club display name
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Manchester United"
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          {LOOP_FEED_TEAM_FEED_TYPES.map((option) => (
            <label key={option.id} className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
              {option.label} · {option.studioUsage}
              <input
                value={draftUrls[option.id] ?? ""}
                onChange={(e) => setDraftUrls((prev) => ({ ...prev, [option.id]: e.target.value }))}
                placeholder="https://q.loop-feed.com/v1/topic/…/content (optional — add later)"
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 font-mono text-[11px] text-[color:var(--text-primary)]"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <R365Button type="button" onClick={() => void addClubTemplate()} disabled={busy || !draftName.trim()}>
            {busy ? "Saving…" : "Add club template"}
          </R365Button>
        </div>
        {message ? <p className="mt-3 text-sm text-[#22c55e]">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </Panel>

      <Panel title="Match highlights preview">
        <LoopFeedHighlightsPreview teamNames={teamNames} defaultFeedType="match_highlights" />
      </Panel>

      <Panel title="Saved clubs">
        {grouped.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">
            No clubs yet — add a template above. On a fresh local install, starter clubs appear when no saved store exists.
          </p>
        ) : (
          <ul className="space-y-6">
            {grouped.map((group) => (
              <ClubFeedGroup
                key={group.name}
                group={group}
                busy={busy}
                onSave={patchTeam}
                onDelete={(id) => void removeTeam(id)}
                onEnsureTemplate={() => void ensureTemplate(group.name)}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ClubFeedGroup({
  group,
  busy,
  onSave,
  onDelete,
  onEnsureTemplate,
}: {
  group: LoopFeedTeamGroup;
  busy: boolean;
  onSave: (
    row: LoopFeedTeamRow,
    patch: Partial<Pick<LoopFeedTeamRow, "name" | "topicUrl" | "feedType" | "active">>,
  ) => void;
  onDelete: (id: string) => void;
  onEnsureTemplate: () => void;
}) {
  const missingSlots = LOOP_FEED_TEAM_FEED_TYPES.filter((option) => !group.feeds[option.id]).length;

  return (
    <li className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[color:var(--text-primary)]">{group.name}</h2>
        {missingSlots > 0 ? (
          <R365Button type="button" variant="ghost" disabled={busy} onClick={onEnsureTemplate}>
            Add missing feeds ({missingSlots})
          </R365Button>
        ) : null}
      </div>
      <ul className="space-y-4">
        {LOOP_FEED_TEAM_FEED_TYPES.map((option) => (
          <FeedSlotRow
            key={option.id}
            clubName={group.name}
            feedType={option.id}
            row={group.feeds[option.id]}
            busy={busy}
            onSave={onSave}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </li>
  );
}

function FeedSlotRow({
  clubName,
  feedType,
  row,
  busy,
  onSave,
  onDelete,
}: {
  clubName: string;
  feedType: LoopFeedTeamFeedType;
  row?: LoopFeedTeamRow;
  busy: boolean;
  onSave: (
    row: LoopFeedTeamRow,
    patch: Partial<Pick<LoopFeedTeamRow, "name" | "topicUrl" | "feedType" | "active">>,
  ) => void;
  onDelete: (id: string) => void;
}) {
  const [topicUrl, setTopicUrl] = useState(row?.topicUrl ?? "");

  useEffect(() => {
    setTopicUrl(row?.topicUrl ?? "");
  }, [row?.id, row?.topicUrl]);

  if (!row) {
    return (
      <li className="rounded-xl border border-dashed border-[color:var(--border)] px-4 py-3">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">
          {loopFeedTeamFeedTypeLabel(feedType)}{" "}
          <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            · {loopFeedTeamFeedTypeStudioUsage(feedType)}
          </span>
        </p>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">Not configured — use “Add missing feeds” above.</p>
      </li>
    );
  }

  const unchanged = topicUrl.trim() === (row.topicUrl ?? "").trim();

  return (
    <li className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">
            {loopFeedTeamFeedTypeLabel(feedType)}{" "}
            <span className="text-xs font-bold uppercase tracking-wide text-[#22c55e]">
              · {loopFeedTeamFeedTypeStudioUsage(feedType)}
            </span>
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{loopFeedTeamFeedTypeDescription(feedType)}</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
          <input
            type="checkbox"
            checked={row.active}
            disabled={busy || !topicUrl.trim()}
            onChange={(e) => onSave(row, { active: e.target.checked, name: clubName, topicUrl, feedType })}
          />
          Active
        </label>
      </div>
      <input
        value={topicUrl}
        onChange={(e) => setTopicUrl(e.target.value)}
        placeholder="https://q.loop-feed.com/v1/topic/…/content"
        className="mt-3 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 font-mono text-[11px] text-[color:var(--text-secondary)]"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <R365Button
          type="button"
          variant="ghost"
          disabled={busy || unchanged || !topicUrl.trim()}
          onClick={() => onSave(row, { name: clubName, topicUrl, feedType })}
        >
          Save URL
        </R365Button>
        <R365Button type="button" variant="ghost" disabled={busy} onClick={() => onDelete(row.id)}>
          Remove slot
        </R365Button>
      </div>
      <code className="mt-2 block text-[10px] text-[color:var(--text-muted)]">{row.id}</code>
    </li>
  );
}
