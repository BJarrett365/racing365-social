"use client";

import type { ReactNode } from "react";
import { IMPORT_LAYER_STEPS } from "@/app/lib/match-report/workflow";
import type { MatchReportWorkflowStep } from "@/app/lib/match-report/types";
import { stepLabel } from "@/app/lib/match-report/workflow";
import type { LoopFeedTeamRow } from "@/app/lib/tools/loop-feed-teams-store";

type StatusVariant = "success" | "info" | "warning" | "error";

const STATUS_STYLES: Record<
  StatusVariant,
  { border: string; background: string; iconBg: string; label: string; icon: string }
> = {
  success: {
    border: "color-mix(in srgb, var(--success) 40%, var(--border))",
    background: "var(--primary-soft)",
    iconBg: "var(--success)",
    label: "var(--primary)",
    icon: "✓",
  },
  info: {
    border: "color-mix(in srgb, var(--info) 35%, var(--border))",
    background: "color-mix(in srgb, var(--info) 8%, var(--surface))",
    iconBg: "var(--info)",
    label: "var(--info)",
    icon: "i",
  },
  warning: {
    border: "color-mix(in srgb, var(--warning) 40%, var(--border))",
    background: "color-mix(in srgb, var(--warning) 10%, var(--surface))",
    iconBg: "var(--warning)",
    label: "var(--warning)",
    icon: "!",
  },
  error: {
    border: "color-mix(in srgb, var(--danger) 40%, var(--border))",
    background: "var(--danger-soft)",
    iconBg: "var(--danger)",
    label: "var(--danger)",
    icon: "×",
  },
};

export function ImportStatusCard({
  variant,
  title,
  children,
}: {
  variant: StatusVariant;
  title: string;
  children: ReactNode;
}) {
  const s = STATUS_STYLES[variant];
  return (
    <div
      className="rounded-2xl border px-4 py-3.5 shadow-[var(--shadow)]"
      style={{ borderColor: s.border, background: s.background }}
    >
      <div className="flex gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
          style={{ background: s.iconBg }}
          aria-hidden
        >
          {s.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.12em]" style={{ color: s.label }}>
            {title}
          </p>
          <div className="mt-1 text-sm leading-6 text-[color:var(--text-primary)]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ImportStepHeader({
  eyebrow,
  title,
  description,
  skipPenalty,
}: {
  eyebrow: string;
  title: string;
  description: string;
  skipPenalty?: number;
}) {
  return (
    <div className="mrb-step-header rounded-2xl border px-4 py-4 sm:px-5">
      <p className="mrb-step-eyebrow text-[11px] font-black uppercase tracking-[0.22em]">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-black tracking-tight text-[color:var(--text-primary)]">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--text-secondary)]">{description}</p>
      {skipPenalty ? (
        <p className="mrb-skip-penalty mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold">
          Skip costs <strong>−{skipPenalty}</strong> confidence
        </p>
      ) : null}
    </div>
  );
}

export function ImportLayerProgress({ currentStep }: { currentStep: MatchReportWorkflowStep }) {
  const idx = IMPORT_LAYER_STEPS.indexOf(currentStep as (typeof IMPORT_LAYER_STEPS)[number]);
  if (idx === -1 && currentStep !== "build_picture") return null;

  return (
    <div className="mrb-layer-progress flex flex-wrap gap-2 rounded-2xl border px-3 py-3">
      {IMPORT_LAYER_STEPS.map((layer, i) => {
        const done = currentStep === "build_picture" || i < idx;
        const current = i === idx && currentStep !== "build_picture";
        const stateClass = done ? "mrb-layer-tab--done" : current ? "mrb-layer-tab--current" : "mrb-layer-tab--idle";
        return (
          <span
            key={layer}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${stateClass}`}
          >
            <span className="mrb-layer-tab-badge flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black">
              {done ? "✓" : i + 1}
            </span>
            {stepLabel(layer)}
          </span>
        );
      })}
    </div>
  );
}

export const importLabelClass =
  "mrb-field-label text-xs font-black uppercase tracking-[0.12em] text-[color:var(--text-secondary)]";

export const importFieldClass =
  "mrb-import-field w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]";

export const importFieldStyle = {
  borderColor: "var(--border-strong)",
  background: "var(--surface-elevated)",
  color: "var(--text-primary)",
} as const;

export function LoopFeedTeamCard({
  teamLabel,
  side,
  pick,
  onPickChange,
  teams,
  formatTeamLabel,
  customValue,
  url,
  onCustomLabelChange,
  onUrlChange,
  customPickValue,
  disabled,
}: {
  teamLabel: string;
  side: "home" | "away";
  pick: string;
  onPickChange: (value: string) => void;
  teams: LoopFeedTeamRow[];
  formatTeamLabel?: (team: LoopFeedTeamRow) => string;
  customValue: string;
  url: string;
  onCustomLabelChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  customPickValue: string;
  disabled?: boolean;
}) {
  const sideColor = side === "home" ? "var(--info)" : "var(--accent)";
  return (
    <div
      className="space-y-3 rounded-2xl border p-4 shadow-[var(--shadow)]"
      style={{ borderColor: "var(--border-strong)", background: "var(--surface-elevated)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black text-[color:var(--text-primary)]">{teamLabel}</p>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white"
          style={{ background: sideColor }}
        >
          {side === "home" ? "Home" : "Away"}
        </span>
      </div>
      <label className={`flex flex-col gap-1.5 ${importLabelClass}`}>
        Loop Feed team
        <select
          value={pick}
          onChange={(e) => onPickChange(e.target.value)}
          className={importFieldClass}
          style={importFieldStyle}
          disabled={disabled}
        >
          <option value="">— Select team —</option>
          <option value={customPickValue}>Custom URL…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {formatTeamLabel ? formatTeamLabel(t) : t.name}
            </option>
          ))}
        </select>
      </label>
      {pick === customPickValue ? (
        <>
          <label className={`block space-y-1.5 ${importLabelClass}`}>
            Display label
            <input
              className={importFieldClass}
              style={importFieldStyle}
              value={customValue}
              onChange={(e) => onCustomLabelChange(e.target.value)}
              disabled={disabled}
            />
          </label>
          <label className={`block space-y-1.5 ${importLabelClass}`}>
            Topic URL
            <input
              className={importFieldClass}
              style={importFieldStyle}
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://q.loop-feed.com/v1/topic/…/content"
              disabled={disabled}
            />
          </label>
        </>
      ) : pick ? (
        <p
          className="break-all rounded-lg border px-3 py-2 font-mono text-[11px] leading-relaxed text-[color:var(--text-secondary)]"
          style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
        >
          {url}
        </p>
      ) : (
        <p className="text-xs text-[color:var(--text-muted)]">Choose a catalog team or enter a custom topic URL.</p>
      )}
    </div>
  );
}
