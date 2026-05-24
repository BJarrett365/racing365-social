"use client";

import { R365Button } from "@/app/components/R365Button";
import {
  MATCH_REPORT_FORMAT_OPTIONS,
  type MatchReportFormatOption,
} from "@/app/lib/match-report/match-report-format";
import type { MatchReportFormat } from "@/app/lib/match-report/types";

type Props = {
  value: MatchReportFormat;
  onChange: (format: MatchReportFormat) => void;
  onContinue: () => void;
};

function FormatCard({
  option,
  selected,
  onSelect,
}: {
  option: MatchReportFormatOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border p-4 text-left transition-colors ${
        selected ? "ring-2 ring-[color:var(--accent)]" : "hover:bg-[var(--surface-hover)]"
      }`}
      style={{
        borderColor: selected ? "color-mix(in srgb, var(--accent) 55%, var(--border))" : "var(--border)",
        background: selected ? "var(--accent-soft)" : "var(--surface-muted)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[color:var(--text-primary)]">{option.label}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">{option.description}</p>
        </div>
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black"
          style={{
            borderColor: selected ? "var(--accent)" : "var(--border-strong)",
            background: selected ? "var(--accent)" : "transparent",
            color: selected ? "var(--accent-foreground)" : "transparent",
          }}
          aria-hidden
        >
          {selected ? "✓" : ""}
        </span>
      </div>
      {option.createsDualReports ? (
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-sky-300">Creates 2 linked reports</p>
      ) : null}
    </button>
  );
}

export function MatchReportTypeStep({ value, onChange, onContinue }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Step 1</p>
        <h2 className="mt-2 text-2xl font-black text-[color:var(--text-primary)]">What type of match report?</h2>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-secondary)]">
          Choose the editorial angle before brand, match data, or imports. Pick{" "}
          <strong className="font-semibold text-[color:var(--text-primary)]">Neutral</strong> for one balanced report,
          or <strong className="font-semibold text-[color:var(--text-primary)]">Dual</strong> to create separate
          home- and away-perspective reports from one workflow.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {MATCH_REPORT_FORMAT_OPTIONS.map((option) => (
          <FormatCard
            key={option.id}
            option={option}
            selected={value === option.id}
            onSelect={() => onChange(option.id)}
          />
        ))}
      </div>

      <R365Button onClick={onContinue}>Continue</R365Button>
    </div>
  );
}
