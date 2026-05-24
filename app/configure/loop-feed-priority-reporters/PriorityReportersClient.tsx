"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import type { SportVerticalId } from "@/app/lib/data-studio/types";
import { SPORT_VERTICALS } from "@/app/lib/data-studio/sport-verticals";
import {
  compareReporterEditorialRank,
  DEFAULT_REPORTER_AFFILIATION,
  DEFAULT_REPORTER_PRIORITY,
  DEFAULT_REPORTER_ROLE,
  DEFAULT_REPORTER_WEIGHT,
  formatReporterAffiliationBadge,
  LOOP_FEED_REPORTER_AFFILIATION_SCOPES,
  LOOP_FEED_REPORTER_OUTLETS,
  LOOP_FEED_REPORTER_ROLE_CATEGORIES,
  type LoopFeedPriorityReporterRow,
  type LoopFeedReporterAffiliationScope,
  type LoopFeedReporterRoleCategory,
} from "@/app/lib/tools/loop-feed-priority-reporters-shared";
import {
  CONFIGURE_PATH,
  LOOP_FEED_TEAMS_PATH,
} from "@/app/lib/configure/paths";

const SPORTS_FOR_REPORTERS = SPORT_VERTICALS.filter((v) => v.id !== "multi");

export function PriorityReportersClient() {
  const [reporters, setReporters] = useState<LoopFeedPriorityReporterRow[]>([]);
  const [filterSport, setFilterSport] = useState<SportVerticalId>("football");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draftSport, setDraftSport] = useState<SportVerticalId>("football");
  const [draftName, setDraftName] = useState("");
  const [draftHandle, setDraftHandle] = useState("");
  const [draftTopicUrl, setDraftTopicUrl] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftRole, setDraftRole] = useState<LoopFeedReporterRoleCategory>(DEFAULT_REPORTER_ROLE);
  const [draftAffiliation, setDraftAffiliation] = useState<LoopFeedReporterAffiliationScope>(DEFAULT_REPORTER_AFFILIATION);
  const [draftTeamName, setDraftTeamName] = useState("");
  const [draftOutlet, setDraftOutlet] = useState("");
  const [draftPriority, setDraftPriority] = useState(String(DEFAULT_REPORTER_PRIORITY));
  const [draftWeight, setDraftWeight] = useState(String(DEFAULT_REPORTER_WEIGHT));

  const load = useCallback(async () => {
    const res = await fetch("/api/tools/loop-feed-priority-reporters");
    const data = (await res.json()) as { reporters?: LoopFeedPriorityReporterRow[] };
    setReporters(Array.isArray(data.reporters) ? data.reporters : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      reporters
        .filter((r) => r.sportKey === filterSport)
        .sort(compareReporterEditorialRank),
    [reporters, filterSport],
  );

  const addReporter = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/tools/loop-feed-priority-reporters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sportKey: draftSport,
          name: draftName.trim(),
          xHandle: draftHandle.trim() || undefined,
          loopTopicUrl: draftTopicUrl.trim() || undefined,
          editorialNote: draftNote.trim() || undefined,
          affiliationScope: draftAffiliation,
          teamName: draftAffiliation === "team" ? draftTeamName.trim() || undefined : undefined,
          outlet: draftOutlet.trim() || undefined,
          roleCategory: draftRole,
          priority: Number.parseInt(draftPriority, 10),
          weight: Number.parseInt(draftWeight, 10),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) throw new Error(data.error || `Save failed (${res.status})`);
      setDraftName("");
      setDraftHandle("");
      setDraftTopicUrl("");
      setDraftNote("");
      setDraftRole(DEFAULT_REPORTER_ROLE);
      setDraftAffiliation(DEFAULT_REPORTER_AFFILIATION);
      setDraftTeamName("");
      setDraftOutlet("");
      setDraftPriority(String(DEFAULT_REPORTER_PRIORITY));
      setDraftWeight(String(DEFAULT_REPORTER_WEIGHT));
      setMessage("Reporter saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const patchReporter = async (
    row: LoopFeedPriorityReporterRow,
    patch: Partial<
      Pick<
        LoopFeedPriorityReporterRow,
        "name" | "xHandle" | "loopTopicUrl" | "editorialNote" | "affiliationScope" | "teamName" | "outlet" | "active" | "sportKey" | "roleCategory" | "priority" | "weight"
      >
    >,
  ) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/tools/loop-feed-priority-reporters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          sportKey: patch.sportKey ?? row.sportKey,
          name: patch.name ?? row.name,
          xHandle: patch.xHandle !== undefined ? patch.xHandle : row.xHandle,
          loopTopicUrl: patch.loopTopicUrl !== undefined ? patch.loopTopicUrl : row.loopTopicUrl,
          editorialNote: patch.editorialNote !== undefined ? patch.editorialNote : row.editorialNote,
          affiliationScope: patch.affiliationScope ?? row.affiliationScope,
          teamName: patch.teamName !== undefined ? patch.teamName : row.teamName,
          outlet: patch.outlet !== undefined ? patch.outlet : row.outlet,
          roleCategory: patch.roleCategory ?? row.roleCategory,
          priority: patch.priority ?? row.priority,
          weight: patch.weight ?? row.weight,
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

  const removeReporter = async (id: string) => {
    if (!confirm("Remove this priority reporter?")) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/tools/loop-feed-priority-reporters", {
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
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[color:var(--text-primary)]">
          Loop Feed · Priority reporters
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Maintain trusted handles, Loop topics, voice type, team or generic affiliation, outlet, priority, and weight
          per sport. Example: Adam Pope · BBC · Team · Leeds United. Lower priority number = higher rank (1 is top).
          Weight 1–100 controls editorial pull in match reports and manual sources.
        </p>
      </div>

      <Panel title="Add reporter">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Sport
            <select
              value={draftSport}
              onChange={(e) => setDraftSport(e.target.value as SportVerticalId)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              {SPORTS_FOR_REPORTERS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Display name
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Samuel Luckhurst"
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            X handle (optional)
            <input
              value={draftHandle}
              onChange={(e) => setDraftHandle(e.target.value)}
              placeholder="@samuelluckhurst or samuelluckhurst"
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Loop topic URL (optional)
            <input
              value={draftTopicUrl}
              onChange={(e) => setDraftTopicUrl(e.target.value)}
              placeholder="https://q.loop-feed.com/v1/topic/…/content"
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Affiliation
            <select
              value={draftAffiliation}
              onChange={(e) => setDraftAffiliation(e.target.value as LoopFeedReporterAffiliationScope)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              {LOOP_FEED_REPORTER_AFFILIATION_SCOPES.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          {draftAffiliation === "team" ? (
            <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
              Team
              <input
                value={draftTeamName}
                onChange={(e) => setDraftTeamName(e.target.value)}
                placeholder="e.g. Leeds United"
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Outlet (optional)
            <select
              value={draftOutlet}
              onChange={(e) => setDraftOutlet(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              <option value="">Not set</option>
              {LOOP_FEED_REPORTER_OUTLETS.map((row) => (
                <option key={row.id} value={row.label}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Voice type
            <select
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value as LoopFeedReporterRoleCategory)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              {LOOP_FEED_REPORTER_ROLE_CATEGORIES.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Priority (1 = highest)
            <input
              type="number"
              min={1}
              max={100}
              value={draftPriority}
              onChange={(e) => setDraftPriority(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Weight (1–100)
            <input
              type="number"
              min={1}
              max={100}
              value={draftWeight}
              onChange={(e) => setDraftWeight(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <label className="md:col-span-2 flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Editorial note (optional)
            <input
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="e.g. BBC Sport · Leeds United correspondent"
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <R365Button type="button" onClick={() => void addReporter()} disabled={busy || !draftName.trim()}>
            {busy ? "Saving…" : "Add reporter"}
          </R365Button>
        </div>
        {message ? <p className="mt-3 text-sm text-[#22c55e]">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </Panel>

      <Panel title="Saved reporters">
        <label className="mb-4 flex max-w-xs flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Filter by sport
          <select
            value={filterSport}
            onChange={(e) => setFilterSport(e.target.value as SportVerticalId)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            {SPORTS_FOR_REPORTERS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        {filtered.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">
            No reporters for this sport yet — add beat writers, transfer specialists, or outlets above.
          </p>
        ) : (
          <ul className="space-y-4">
            {filtered.map((row) => (
              <li key={row.id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                <ReporterEditorRow row={row} busy={busy} sports={SPORTS_FOR_REPORTERS} onSave={patchReporter} onDelete={() => void removeReporter(row.id)} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ReporterEditorRow({
  row,
  busy,
  sports,
  onSave,
  onDelete,
}: {
  row: LoopFeedPriorityReporterRow;
  busy: boolean;
  sports: typeof SPORT_VERTICALS;
  onSave: (
    row: LoopFeedPriorityReporterRow,
    patch: Partial<
      Pick<
        LoopFeedPriorityReporterRow,
        "name" | "xHandle" | "loopTopicUrl" | "editorialNote" | "affiliationScope" | "teamName" | "outlet" | "active" | "sportKey" | "roleCategory" | "priority" | "weight"
      >
    >,
  ) => void;
  onDelete: () => void;
}) {
  const [sportKey, setSportKey] = useState(row.sportKey);
  const [name, setName] = useState(row.name);
  const [xHandle, setXHandle] = useState(row.xHandle ?? "");
  const [loopTopicUrl, setLoopTopicUrl] = useState(row.loopTopicUrl ?? "");
  const [editorialNote, setEditorialNote] = useState(row.editorialNote ?? "");
  const [affiliationScope, setAffiliationScope] = useState(row.affiliationScope);
  const [teamName, setTeamName] = useState(row.teamName ?? "");
  const [outlet, setOutlet] = useState(row.outlet ?? "");
  const [roleCategory, setRoleCategory] = useState(row.roleCategory);
  const [priority, setPriority] = useState(String(row.priority));
  const [weight, setWeight] = useState(String(row.weight));

  useEffect(() => {
    setSportKey(row.sportKey);
    setName(row.name);
    setXHandle(row.xHandle ?? "");
    setLoopTopicUrl(row.loopTopicUrl ?? "");
    setEditorialNote(row.editorialNote ?? "");
    setAffiliationScope(row.affiliationScope);
    setTeamName(row.teamName ?? "");
    setOutlet(row.outlet ?? "");
    setRoleCategory(row.roleCategory);
    setPriority(String(row.priority));
    setWeight(String(row.weight));
  }, [row.id, row.sportKey, row.name, row.xHandle, row.loopTopicUrl, row.editorialNote, row.affiliationScope, row.teamName, row.outlet, row.roleCategory, row.priority, row.weight]);

  const unchanged =
    sportKey === row.sportKey &&
    name === row.name &&
    xHandle === (row.xHandle ?? "") &&
    loopTopicUrl === (row.loopTopicUrl ?? "") &&
    editorialNote === (row.editorialNote ?? "") &&
    affiliationScope === row.affiliationScope &&
    teamName === (row.teamName ?? "") &&
    outlet === (row.outlet ?? "") &&
    roleCategory === row.roleCategory &&
    priority === String(row.priority) &&
    weight === String(row.weight);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <span className="text-xs font-black uppercase tracking-wide text-[color:var(--text-muted)]">
            {row.active ? "Active" : "Inactive"}
          </span>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">
            {formatReporterAffiliationBadge(row) ?? "Generic"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <R365Button type="button" variant="ghost" disabled={busy} onClick={() => onSave(row, { active: !row.active })}>
            {row.active ? "Deactivate" : "Activate"}
          </R365Button>
          <R365Button type="button" variant="danger" disabled={busy} onClick={onDelete}>
            Remove
          </R365Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Sport
          <select
            value={sportKey}
            onChange={(e) => setSportKey(e.target.value as SportVerticalId)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            {sports.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Display name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          X handle
          <input
            value={xHandle}
            onChange={(e) => setXHandle(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Loop topic URL
          <input
            value={loopTopicUrl}
            onChange={(e) => setLoopTopicUrl(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Affiliation
          <select
            value={affiliationScope}
            onChange={(e) => setAffiliationScope(e.target.value as LoopFeedReporterAffiliationScope)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            {LOOP_FEED_REPORTER_AFFILIATION_SCOPES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {affiliationScope === "team" ? (
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Team
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Leeds United"
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Outlet
          <select
            value={outlet}
            onChange={(e) => setOutlet(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <option value="">Not set</option>
            {LOOP_FEED_REPORTER_OUTLETS.map((option) => (
              <option key={option.id} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Voice type
          <select
            value={roleCategory}
            onChange={(e) => setRoleCategory(e.target.value as LoopFeedReporterRoleCategory)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            {LOOP_FEED_REPORTER_ROLE_CATEGORIES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Priority (1 = highest)
          <input
            type="number"
            min={1}
            max={100}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Weight (1–100)
          <input
            type="number"
            min={1}
            max={100}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
        <label className="md:col-span-2 flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Editorial note
          <input
            value={editorialNote}
            onChange={(e) => setEditorialNote(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
      </div>
      <R365Button
        type="button"
        disabled={busy || unchanged}
        onClick={() =>
          onSave(row, {
            sportKey,
            name,
            xHandle,
            loopTopicUrl,
            editorialNote,
            affiliationScope,
            teamName: affiliationScope === "team" ? teamName : undefined,
            outlet,
            roleCategory,
            priority: Number.parseInt(priority, 10),
            weight: Number.parseInt(weight, 10),
          })
        }
      >
        Save changes
      </R365Button>
    </div>
  );
}
