"use client";

import type { ReactNode } from "react";
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

type ContentTypeCardConfig = {
  id: MatchReportContentType;
  label: string;
  timing: string;
  tagline: string;
  highlights: string[];
  icon: ReactNode;
};

const CONTENT_TYPE_OPTIONS: ContentTypeCardConfig[] = [
  {
    id: MATCH_PREVIEW_CONTENT_TYPE,
    label: "Match preview",
    timing: "Before kick-off",
    tagline: "Build anticipation — why this game matters and what could decide it.",
    highlights: ["Form, table stakes & head-to-head", "Team news & predicted line-ups", "11-section preview with verdict"],
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: MATCH_REPORT_CONTENT_TYPE,
    label: "Match report",
    timing: "After full-time",
    tagline: "Tell the story of the match — moments, ratings and what it means.",
    highlights: ["Report 2.0 narrative sections", "Player ratings & 16 conclusions", "Fact-check vs final score"],
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M5 5h14v14H5z" strokeLinejoin="round" />
        <path d="M8 9h8M8 12h8M8 15h5" strokeLinecap="round" />
      </svg>
    ),
  },
];

function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black transition-colors"
      style={{
        borderColor: selected ? "var(--accent)" : "var(--border-strong)",
        background: selected ? "var(--accent)" : "transparent",
        color: selected ? "var(--accent-foreground)" : "transparent",
      }}
      aria-hidden
    >
      {selected ? "✓" : ""}
    </span>
  );
}

function ContentTypeCard({
  option,
  selected,
  onSelect,
}: {
  option: ContentTypeCardConfig;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`group rounded-2xl border p-5 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] ${
        selected ? "ring-2 ring-[color:var(--accent)] shadow-[var(--shadow)]" : "hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-hover)]"
      }`}
      style={{
        borderColor: selected ? "color-mix(in srgb, var(--accent) 55%, var(--border))" : "var(--border)",
        background: selected ? "var(--accent-soft)" : "var(--surface-muted)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors"
          style={{
            background: selected ? "color-mix(in srgb, var(--accent) 22%, transparent)" : "var(--surface)",
            color: selected ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          {option.icon}
        </div>
        <SelectionMark selected={selected} />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-black text-[color:var(--text-primary)]">{option.label}</p>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: selected ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "var(--surface)",
              color: selected ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {option.timing}
          </span>
        </div>
        <p className="text-sm leading-6 text-[color:var(--text-secondary)]">{option.tagline}</p>
      </div>

      <ul className="mt-4 space-y-1.5">
        {option.highlights.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-[color:var(--text-secondary)]">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: selected ? "var(--accent)" : "var(--text-muted)" }}
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

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
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={`rounded-2xl border p-4 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? "ring-2 ring-[color:var(--accent)]" : "hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-hover)]"
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
        <SelectionMark selected={selected} />
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
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Step 1</p>
        <h2 className="mt-2 text-2xl font-black text-[color:var(--text-primary)]">What are you building?</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Pick the workflow that matches where the fixture is in its lifecycle. You can always come back and start a
          different type for the same match later.
        </p>
      </div>

      <div
        className="grid gap-4 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Content type"
      >
        {CONTENT_TYPE_OPTIONS.map((option) => (
          <ContentTypeCard
            key={option.id}
            option={option}
            selected={contentType === option.id}
            onSelect={() => onContentTypeChange(option.id)}
          />
        ))}
      </div>

      <div
        className="rounded-2xl border p-4 sm:p-5"
        style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
      >
        <p className="text-sm font-bold text-[color:var(--text-primary)]">
          {isPreview ? "Preview perspective" : "Report perspective"}
        </p>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          {isPreview
            ? "Neutral gives one balanced preview for the whole fixture."
            : "Neutral for one balanced report, or Dual for separate home and away projects."}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Perspective">
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

      <div className="flex flex-wrap items-center gap-3">
        <R365Button onClick={onContinue}>Continue</R365Button>
        <p className="text-xs text-[color:var(--text-muted)]">Next: editorial brief → match ID → import data</p>
      </div>
    </div>
  );
}
