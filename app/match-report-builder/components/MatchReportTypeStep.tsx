"use client";

import { R365Button } from "@/app/components/R365Button";
import type { MatchReportContentType } from "@/app/lib/match-report/types";
import {
  MATCH_PREVIEW_CONTENT_TYPE,
  MATCH_REPORT_CONTENT_TYPE,
} from "@/app/lib/match-report/content-type";
import {
  MATCH_REPORT_FORMAT_OPTIONS,
  type MatchReportFormatOption,
} from "@/app/lib/match-report/match-report-format";
import type { MatchReportFormat } from "@/app/lib/match-report/types";

type Props = {
  contentType: MatchReportContentType;
  onContentTypeChange: (contentType: MatchReportContentType) => void;
  value: MatchReportFormat;
  onChange: (format: MatchReportFormat) => void;
  onContinue: () => void;
};

function FormatCard({
  option,
  selected,
  onSelect,
  disabled,
}: {
  option: MatchReportFormatOption;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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

export function MatchReportTypeStep({
  contentType,
  onContentTypeChange,
  value,
  onChange,
  onContinue,
}: Props) {
  const isPreview = contentType === MATCH_PREVIEW_CONTENT_TYPE;
  const formatOptions = isPreview
    ? MATCH_REPORT_FORMAT_OPTIONS.filter((option) => !option.createsDualReports)
    : MATCH_REPORT_FORMAT_OPTIONS;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Step 1</p>
        <h2 className="mt-2 text-2xl font-black text-[color:var(--text-primary)]">What are you building?</h2>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-secondary)]">
          Choose <strong className="font-semibold text-[color:var(--text-primary)]">Match preview</strong> for
          pre-match content (form, H2H, team news, prediction) or{" "}
          <strong className="font-semibold text-[color:var(--text-primary)]">Match report</strong> for post-match
          journalism.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onContentTypeChange(MATCH_PREVIEW_CONTENT_TYPE)}
          className={`rounded-2xl border p-4 text-left transition-colors ${
            isPreview ? "ring-2 ring-[color:var(--accent)]" : "hover:bg-[var(--surface-hover)]"
          }`}
          style={{
            borderColor: isPreview ? "color-mix(in srgb, var(--accent) 55%, var(--border))" : "var(--border)",
            background: isPreview ? "var(--accent-soft)" : "var(--surface-muted)",
          }}
        >
          <p className="text-sm font-black text-[color:var(--text-primary)]">Match preview</p>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Pre-match: form, head-to-head, stakes, team news, prediction. Uses the Preview Intelligence Object (PIO).
          </p>
        </button>
        <button
          type="button"
          onClick={() => onContentTypeChange(MATCH_REPORT_CONTENT_TYPE)}
          className={`rounded-2xl border p-4 text-left transition-colors ${
            !isPreview ? "ring-2 ring-[color:var(--accent)]" : "hover:bg-[var(--surface-hover)]"
          }`}
          style={{
            borderColor: !isPreview ? "color-mix(in srgb, var(--accent) 55%, var(--border))" : "var(--border)",
            background: !isPreview ? "var(--accent-soft)" : "var(--surface-muted)",
          }}
        >
          <p className="text-sm font-black text-[color:var(--text-primary)]">Match report</p>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Post-match: commentary, ratings, 16 conclusions, fact-check against the final score.
          </p>
        </button>
      </div>

      {!isPreview ? (
        <div>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Report perspective</p>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Neutral for one balanced report, or Dual for separate home and away projects.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {formatOptions.map((option) => (
              <FormatCard
                key={option.id}
                option={option}
                selected={value === option.id}
                onSelect={() => onChange(option.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Preview perspective</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {formatOptions.map((option) => (
              <FormatCard
                key={option.id}
                option={option}
                selected={value === option.id}
                onSelect={() => onChange(option.id)}
              />
            ))}
          </div>
        </div>
      )}

      <R365Button onClick={onContinue}>Continue</R365Button>
    </div>
  );
}
