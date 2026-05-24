"use client";

import {
  resolveWizardProgress,
  WIZARD_MILESTONES,
  type WizardScreen,
} from "@/app/lib/match-report/wizard-steps";
import type { MatchReportProject } from "@/app/lib/match-report/types";

type Props = {
  screen: WizardScreen;
  project: MatchReportProject | null;
  eventPictureAcknowledged: boolean;
};

export function WizardStepsIndicator({ screen, project, eventPictureAcknowledged }: Props) {
  const progress = resolveWizardProgress(screen, project, eventPictureAcknowledged);
  const total = WIZARD_MILESTONES.length;
  const barPct = ((progress.published ? total : progress.currentMilestone.step - 1) / total) * 100;

  return (
    <section
      className="overflow-hidden rounded-[1.75rem] border shadow-[var(--shadow-card)]"
      style={{ borderColor: "var(--border-strong)", background: "var(--surface)" }}
      aria-label="Match report builder progress"
    >
      <div
        className="border-b px-4 py-4 sm:px-6 sm:py-5"
        style={{
          borderColor: "var(--border)",
          background: "linear-gradient(135deg, var(--primary-soft) 0%, var(--surface) 55%)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--primary)]">
              Step {progress.currentMilestone.step} of {total}
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[color:var(--text-primary)]">
              {progress.currentMilestone.label}
            </p>
            {progress.sublabel ? (
              <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{progress.sublabel}</p>
            ) : null}
          </div>
          <div className="min-w-[9rem] text-right">
            {progress.published ? (
              <p className="text-sm font-black text-[color:var(--success)]">Complete · Published</p>
            ) : (
              <p className="text-sm font-semibold text-[color:var(--text-secondary)]">
                {total - progress.currentMilestone.step} step{total - progress.currentMilestone.step === 1 ? "" : "s"}{" "}
                to publish
              </p>
            )}
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full"
              style={{ background: "color-mix(in srgb, var(--border) 70%, var(--surface))" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barPct}%`, background: "var(--accent-gradient)" }}
              />
            </div>
          </div>
        </div>
      </div>

      <ol className="hidden items-start px-3 py-4 lg:flex">
        {WIZARD_MILESTONES.map((milestone, index) => {
          const isComplete = progress.published || index < progress.currentIndex;
          const isCurrent = !progress.published && index === progress.currentIndex;

          return (
            <li key={milestone.id} className="flex min-w-0 flex-1 items-start px-1">
              <div className="flex min-w-0 flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  {index > 0 ? (
                    <span
                      className="h-1 flex-1 rounded-full"
                      style={{
                        background: isComplete
                          ? "var(--accent)"
                          : isCurrent
                            ? "color-mix(in srgb, var(--accent) 45%, var(--border))"
                            : "var(--border)",
                      }}
                    />
                  ) : (
                    <span className="flex-1" />
                  )}
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black"
                    style={{
                      borderColor: isComplete
                        ? "var(--success)"
                        : isCurrent
                          ? "var(--accent)"
                          : "var(--border-strong)",
                      background: isComplete
                        ? "var(--success)"
                        : isCurrent
                          ? "var(--accent-soft)"
                          : "var(--surface-muted)",
                      color: isComplete ? "#fff" : isCurrent ? "var(--primary)" : "var(--text-secondary)",
                    }}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {isComplete ? "✓" : milestone.step}
                  </span>
                  {index < WIZARD_MILESTONES.length - 1 ? (
                    <span
                      className="h-1 flex-1 rounded-full"
                      style={{ background: isComplete ? "var(--accent)" : "var(--border)" }}
                    />
                  ) : (
                    <span className="flex-1" />
                  )}
                </div>
                <p
                  className="mt-2 max-w-[5.5rem] text-center text-[10px] font-black uppercase leading-tight tracking-wide"
                  style={{
                    color: isCurrent
                      ? "var(--primary)"
                      : isComplete
                        ? "var(--success)"
                        : "var(--text-secondary)",
                  }}
                >
                  {milestone.shortLabel}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div
        className="flex gap-2 overflow-x-auto px-4 py-3 lg:hidden"
        style={{ background: "var(--surface-muted)" }}
      >
        {WIZARD_MILESTONES.map((milestone, index) => {
          const isComplete = progress.published || index < progress.currentIndex;
          const isCurrent = !progress.published && index === progress.currentIndex;
          return (
            <span
              key={milestone.id}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold"
              style={{
                borderColor: isComplete
                  ? "color-mix(in srgb, var(--success) 45%, var(--border))"
                  : isCurrent
                    ? "color-mix(in srgb, var(--accent) 50%, var(--border))"
                    : "var(--border-strong)",
                background: isComplete
                  ? "var(--primary-soft)"
                  : isCurrent
                    ? "var(--accent-soft)"
                    : "var(--surface-elevated)",
                color: isComplete ? "var(--primary)" : isCurrent ? "var(--primary)" : "var(--text-secondary)",
              }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white"
                style={{ background: isComplete ? "var(--success)" : isCurrent ? "var(--accent)" : "color-mix(in srgb, var(--border-strong) 55%, var(--surface-muted))" }}
              >
                {isComplete ? "✓" : milestone.step}
              </span>
              {milestone.shortLabel}
            </span>
          );
        })}
      </div>
    </section>
  );
}
