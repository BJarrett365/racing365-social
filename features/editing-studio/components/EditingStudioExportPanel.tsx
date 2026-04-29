"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildEditingProjectExport } from "@/features/editing-studio/export/build-editing-project-export";
import type { EditingProject, PlatformType } from "@/features/editing-studio/types/domain";
import { formatPlatformLabel } from "@/features/editing-studio/utils/display-labels";
import { parseEditingProjectExportPayload } from "@/features/editing-studio/validators/editing-project-export-payload-schema";

type Props = {
  draft: EditingProject;
};

export function EditingStudioExportPanel({ draft }: Props) {
  const [platformSet, setPlatformSet] = useState<Set<PlatformType>>(() => new Set(draft.platforms));
  const [assetSet, setAssetSet] = useState<Set<string>>(() => new Set(draft.assets.map((a) => a.id)));
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setPlatformSet((prev) => {
      const next = new Set(prev);
      for (const p of draft.platforms) {
        next.add(p);
      }
      for (const p of [...next]) {
        if (!draft.platforms.includes(p)) {
          next.delete(p);
        }
      }
      return next;
    });
  }, [draft.platforms]);

  useEffect(() => {
    setAssetSet((prev) => {
      const next = new Set(prev);
      const ids = new Set(draft.assets.map((a) => a.id));
      for (const id of ids) {
        next.add(id);
      }
      for (const id of [...next]) {
        if (!ids.has(id)) {
          next.delete(id);
        }
      }
      return next;
    });
  }, [draft.assets]);

  const parsed = useMemo(() => {
    const platforms = [...platformSet];
    const assetIds = [...assetSet];
    const raw = buildEditingProjectExport(draft, { platforms, assetIds });
    return parseEditingProjectExportPayload(raw);
  }, [draft, platformSet, assetSet]);

  const jsonText = useMemo(() => {
    if (!parsed.ok) return "";
    return JSON.stringify(parsed.data, null, 2);
  }, [parsed]);

  const togglePlatform = useCallback((p: PlatformType) => {
    setFeedback(null);
    setPlatformSet((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  }, []);

  const toggleAsset = useCallback((id: string) => {
    setFeedback(null);
    setAssetSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllPlatforms = useCallback(() => {
    setFeedback(null);
    setPlatformSet(new Set(draft.platforms));
  }, [draft.platforms]);

  const clearPlatforms = useCallback(() => {
    setFeedback(null);
    setPlatformSet(new Set());
  }, []);

  const selectAllAssets = useCallback(() => {
    setFeedback(null);
    setAssetSet(new Set(draft.assets.map((a) => a.id)));
  }, [draft.assets]);

  const clearAssets = useCallback(() => {
    setFeedback(null);
    setAssetSet(new Set());
  }, []);

  const copyJson = useCallback(async () => {
    if (!parsed.ok) {
      setFeedback(parsed.error);
      return;
    }
    try {
      await navigator.clipboard.writeText(jsonText);
      setFeedback("Copied to clipboard.");
    } catch {
      setFeedback("Could not copy — try Download instead.");
    }
  }, [jsonText, parsed]);

  const downloadJson = useCallback(() => {
    if (!parsed.ok) {
      setFeedback(parsed.error);
      return;
    }
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `editing-project-${draft.id}-r${draft.revision}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback("Download started.");
  }, [draft.id, draft.revision, jsonText, parsed]);

  return (
    <div className="space-y-4 text-sm text-[color:var(--text-secondary)]">
      <p className="text-xs leading-relaxed text-[color:var(--text-muted)]">
        Export a versioned JSON handoff (schema v1) for downstream publishers. Choose platforms and assets to
        narrow the snapshot; publish plan, metadata, brand, content type, and status are always included.
      </p>

      {!parsed.ok ? (
        <p className="rounded-md border border-red-800/60 bg-red-950/30 px-2 py-1.5 text-xs text-red-200" role="alert">
          Validation error: {parsed.error}
        </p>
      ) : null}

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Variants by platform
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              className="text-[10px] font-medium text-[color:var(--accent)] hover:underline"
              onClick={selectAllPlatforms}
            >
              All
            </button>
            <span className="text-[color:var(--text-muted)]" aria-hidden>
              ·
            </span>
            <button
              type="button"
              className="text-[10px] font-medium text-[color:var(--accent)] hover:underline"
              onClick={clearPlatforms}
            >
              None
            </button>
          </div>
        </div>
        {draft.platforms.length === 0 ? (
          <p className="text-xs text-[color:var(--text-muted)]">No target platforms on this project.</p>
        ) : (
          <ul className="max-h-32 space-y-1 overflow-auto">
            {draft.platforms.map((p) => (
              <li key={p}>
                <label className="flex cursor-pointer items-center gap-2 text-[color:var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={platformSet.has(p)}
                    onChange={() => togglePlatform(p)}
                    className="rounded border-[color:var(--border)]"
                  />
                  <span>{formatPlatformLabel(p)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Assets</span>
          <div className="flex gap-1">
            <button
              type="button"
              className="text-[10px] font-medium text-[color:var(--accent)] hover:underline"
              onClick={selectAllAssets}
            >
              All
            </button>
            <span className="text-[color:var(--text-muted)]" aria-hidden>
              ·
            </span>
            <button
              type="button"
              className="text-[10px] font-medium text-[color:var(--accent)] hover:underline"
              onClick={clearAssets}
            >
              None
            </button>
          </div>
        </div>
        {draft.assets.length === 0 ? (
          <p className="text-xs text-[color:var(--text-muted)]">No assets — add from the Media tab.</p>
        ) : (
          <ul className="max-h-32 space-y-1 overflow-auto">
            {draft.assets.map((a) => (
              <li key={a.id}>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={assetSet.has(a.id)}
                    onChange={() => toggleAsset(a.id)}
                    className="rounded border-[color:var(--border)]"
                  />
                  <span className="truncate text-[color:var(--text-primary)]">{a.label || a.kind}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyJson()}
          disabled={!parsed.ok}
          className="inline-flex flex-1 items-center justify-center rounded-lg border border-transparent bg-[color:var(--accent)] px-3 py-2 text-xs font-semibold text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-hover)] disabled:opacity-50 min-[360px]:flex-none"
        >
          Copy JSON
        </button>
        <button
          type="button"
          onClick={downloadJson}
          disabled={!parsed.ok}
          className="inline-flex flex-1 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-50 min-[360px]:flex-none"
          style={{ borderColor: "var(--border)" }}
        >
          Download JSON
        </button>
      </div>

      {feedback ? (
        <p className="text-xs text-[color:var(--text-muted)]" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
