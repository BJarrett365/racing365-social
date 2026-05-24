"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import type { ManualSourceFormDraft } from "@/app/lib/match-report/extract-manual-sources-from-loop-feed";
import {
  mergeManualSourceDraftFromPick,
  type ManualSourceReporterPickerOption,
} from "@/app/lib/match-report/manual-source-reporter-picker";

export type ManualSourceDraft = ManualSourceFormDraft;

import { LOOP_FEED_PRIORITY_REPORTERS_PATH } from "@/app/lib/configure/paths";
import {
  importFieldClass,
  importFieldStyle,
  importLabelClass,
} from "@/app/match-report-builder/components/ImportStepUi";

const inputClass = importFieldClass;

type Props = {
  onSubmit: (draft: ManualSourceDraft) => Promise<void>;
  busy?: boolean;
  sourceCount: number;
  loopFeedPreloaded?: number;
  sourcePickerOptions?: ManualSourceReporterPickerOption[];
};

export function ManualSourceForm({
  onSubmit,
  busy,
  sourceCount,
  loopFeedPreloaded = 0,
  sourcePickerOptions = [],
}: Props) {
  const [draft, setDraft] = useState<ManualSourceDraft>({
    source: "Notes",
    type: "Other",
    confidence: "Medium",
    title: "",
    url: "",
    excerpt: "",
  });
  const [selectedSourceId, setSelectedSourceId] = useState("");

  const pickerGroups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, ManualSourceReporterPickerOption[]>();
    for (const row of sourcePickerOptions) {
      const label = row.groupLabel ?? row.sideLabel ?? "Loop Feed";
      if (!map.has(label)) {
        map.set(label, []);
        order.push(label);
      }
      map.get(label)!.push(row);
    }
    return order.map((label) => ({ label, options: map.get(label)! }));
  }, [sourcePickerOptions]);

  const handleSourcePick = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    if (!sourceId) return;
    const picked = sourcePickerOptions.find((row) => row.id === sourceId);
    if (!picked) return;
    setDraft((prev) => mergeManualSourceDraftFromPick(prev, picked.draft));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(draft);
    setDraft((prev) => ({ ...prev, excerpt: "", title: "", url: "" }));
    setSelectedSourceId("");
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      {loopFeedPreloaded > 0 ? (
        <p className="text-xs text-[color:var(--text-secondary)]">
          Add optional desk sources below ({loopFeedPreloaded} Loop Feed post{loopFeedPreloaded === 1 ? "" : "s"}{" "}
          already loaded).
        </p>
      ) : null}
      {sourcePickerOptions.length > 0 ? (
        <label className="block space-y-2">
          <span className={importLabelClass}>Source(s)</span>
          <select
            className={inputClass}
            style={importFieldStyle}
            value={selectedSourceId}
            onChange={(e) => handleSourcePick(e.target.value)}
            disabled={busy}
          >
            <option value="">Pick a reporter from Loop Feed…</option>
            {pickerGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-[color:var(--text-muted)]">
            Journalists from both home and away Loop Feed sides. Selecting fills empty Source, Type, title, URL, and
            notes from the latest matching post on that team&apos;s feed. Configure reporters in{" "}
            <Link href={LOOP_FEED_PRIORITY_REPORTERS_PATH} className="font-semibold text-[color:var(--primary)] hover:underline">
              Loop Feed priority reporters
            </Link>
            .
          </p>
        </label>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block space-y-2">
          <span className={importLabelClass}>Source</span>
          <select
            className={inputClass}
            style={importFieldStyle}
            value={draft.source}
            onChange={(e) => {
              setSelectedSourceId("");
              const source = e.target.value as ManualSourceDraft["source"];
              setDraft((prev) => ({
                ...prev,
                source,
                type: source === "Quotes" ? "Quotes" : prev.type,
              }));
            }}
          >
            <option value="BBC">BBC</option>
            <option value="Sky">Sky</option>
            <option value="Athletic">The Athletic</option>
            <option value="Quotes">Quotes</option>
            <option value="Blog">Blog</option>
            <option value="URL">URL</option>
            <option value="Notes">Notes</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className={importLabelClass}>Type</span>
          <select
            className={inputClass}
            style={importFieldStyle}
            value={draft.type}
            onChange={(e) => {
              setSelectedSourceId("");
              setDraft((prev) => ({ ...prev, type: e.target.value as ManualSourceDraft["type"] }));
            }}
          >
            <option value="Journalist opinion">Journalist opinion</option>
            <option value="Match report">Match report</option>
            <option value="Quotes">Quotes</option>
            <option value="Tactical note">Tactical note</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className={importLabelClass}>Confidence</span>
          <select
            className={inputClass}
            style={importFieldStyle}
            value={draft.confidence}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, confidence: e.target.value as ManualSourceDraft["confidence"] }))
            }
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-2">
          <span className={importLabelClass}>Title (optional)</span>
          <input
            className={inputClass}
            style={importFieldStyle}
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
          />
        </label>
        <label className="block space-y-2">
          <span className={importLabelClass}>URL (optional)</span>
          <input
            className={inputClass}
            style={importFieldStyle}
            value={draft.url}
            onChange={(e) => setDraft((prev) => ({ ...prev, url: e.target.value }))}
          />
        </label>
      </div>
      <label className="block space-y-2">
        <span className={importLabelClass}>Notes</span>
        <textarea
          className={`${inputClass} min-h-[120px]`}
          style={importFieldStyle}
          value={draft.excerpt}
          onChange={(e) => setDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
          placeholder={
            draft.source === "Quotes"
              ? "Paste post-match quotes — speaker name, outlet, and quoted text…"
              : "Paste editorial notes or excerpt…"
          }
          required
        />
      </label>
      <R365Button type="submit" variant="ghost" disabled={busy || !draft.excerpt.trim()}>
        Add source
      </R365Button>
      {sourceCount > 0 ? (
        <p className="text-xs text-[color:var(--text-muted)]">
          {sourceCount} additional manual source{sourceCount === 1 ? "" : "s"} added.
        </p>
      ) : null}
    </form>
  );
}
