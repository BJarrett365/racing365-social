"use client";

import { RaceSilkPreview } from "@/app/components/RaceSilkPreview";
import { R365Button } from "@/app/components/R365Button";
import { defaultSilksForIndex } from "@/app/lib/silk-presets";
import type { RacecardTemplatePreview } from "@/app/lib/parseRacecardUrl";

type Props = {
  preview: RacecardTemplatePreview;
  busy: boolean;
  onUseTemplate: () => void;
  onSaveContinue: () => void;
  onBack: () => void;
  onCancel: () => void;
};

export function RacecardImportPreview({
  preview,
  busy,
  onUseTemplate,
  onSaveContinue,
  onBack,
  onCancel,
}: Props) {
  const show = preview.runners.slice(0, 5);

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="text-xs font-medium text-[color:var(--text-secondary)] underline-offset-2 hover:underline"
        onClick={onBack}
        disabled={busy}
      >
        ← Back
      </button>

      <div
        className="rounded-lg border p-4 text-left"
        style={{ borderColor: "var(--border-strong)", backgroundColor: "var(--surface-elevated)" }}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {preview.course} · {preview.raceTime}
        </p>
        <p className="mt-1 text-sm font-semibold text-[color:var(--text-primary)]">{preview.raceTitle}</p>
        <p className="mt-1 text-xs text-slate-500">{preview.runnerCount} runners</p>
        {preview.topPicks.length > 0 ? (
          <>
            <p className="mt-3 text-xs font-bold uppercase text-slate-500">Top picks</p>
            <p className="text-sm text-[#eab308]">{preview.topPicks.join(" · ")}</p>
          </>
        ) : null}
        <ul className="mt-4 space-y-2 text-sm">
          {show.map((r, i) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 text-slate-300"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <RaceSilkPreview
                  silks={r.silkUrl ? { imageUrl: r.silkUrl } : defaultSilksForIndex(i)}
                  heightPx={28}
                />
                <span className="truncate">
                  <span className="font-mono text-slate-500">{r.number ?? "—"}.</span> {r.horseName}
                </span>
              </span>
              <span className="shrink-0 font-bold text-[#22c55e]">{r.odds ?? "—"}</span>
            </li>
          ))}
        </ul>
        {preview.runners.length > 5 ? (
          <p className="mt-2 text-xs text-slate-500">+ {preview.runners.length - 5} more in editor…</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <R365Button type="button" onClick={onUseTemplate} disabled={busy}>
          {busy ? "Opening…" : "Use this template"}
        </R365Button>
        <R365Button type="button" variant="ghost" onClick={onSaveContinue} disabled={busy}>
          {busy ? "Saving…" : "Save + continue"}
        </R365Button>
        <R365Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </R365Button>
      </div>
    </div>
  );
}
