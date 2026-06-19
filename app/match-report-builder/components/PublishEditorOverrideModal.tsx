"use client";

import { useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { EDITOR_OVERRIDE_REASONS } from "@/app/lib/match-report/preview-publish-gate";
import type { EditorOverrideReason } from "@/app/lib/match-report/mio/types";

type Props = {
  open: boolean;
  overallScore: number;
  gateSummary: string;
  onCancel: () => void;
  onConfirm: (payload: { reason: EditorOverrideReason; detail?: string }) => void;
};

export function PublishEditorOverrideModal({
  open,
  overallScore,
  gateSummary,
  onCancel,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState<EditorOverrideReason>("editorial_decision");
  const [detail, setDetail] = useState("");

  if (!open) return null;

  const needsDetail = reason === "other";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-md rounded-2xl border p-5 shadow-2xl"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        role="dialog"
        aria-labelledby="override-title"
      >
        <p id="override-title" className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
          Editor override required
        </p>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          Editorial score <span className="font-bold text-[color:var(--text-primary)]">{overallScore.toFixed(1)}</span>{" "}
          does not meet the publish threshold. Choose a reason to proceed.
        </p>
        <p className="mt-2 text-xs text-[color:var(--text-muted)]">{gateSummary}</p>

        <div className="mt-4 space-y-2">
          {EDITOR_OVERRIDE_REASONS.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
            >
              <input
                type="radio"
                name="override-reason"
                checked={reason === option.id}
                onChange={() => setReason(option.id)}
              />
              <span className="text-[color:var(--text-primary)]">{option.label}</span>
            </label>
          ))}
        </div>

        {needsDetail ? (
          <label className="mt-4 block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Details</span>
            <textarea
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]"
              style={{ borderColor: "var(--border)", background: "var(--surface-muted)", color: "var(--text-primary)" }}
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Brief note for the scoring feedback loop…"
            />
          </label>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <R365Button variant="ghost" onClick={onCancel}>
            Cancel
          </R365Button>
          <R365Button
            variant="primary"
            onClick={() => onConfirm({ reason, detail: needsDetail ? detail.trim() : undefined })}
            disabled={needsDetail && !detail.trim()}
          >
            Publish with override
          </R365Button>
        </div>
      </div>
    </div>
  );
}
