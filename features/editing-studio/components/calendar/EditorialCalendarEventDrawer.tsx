"use client";

import Link from "next/link";
import type { EditorialCalendarEvent, EditorialCalendarPhaseSlot, MatchEventPhase } from "@/app/lib/editorial-calendar/types";
import type { EditingCalendarPhase } from "@/features/editing-studio/types/domain";
import {
  editingStudioNewFromCalendarPath,
  matchReportFromCalendarPath,
} from "@/features/editing-studio/utils/fixture-routes";
import { editingStudioProjectPath } from "@/features/editing-studio/utils/routes";
import { MATCH_PHASE_LABELS } from "@/app/lib/editorial-calendar/phases";
import { BRAND_LABEL_BY_TARGET } from "@/app/lib/match-report/editorial-governance";
import type { MatchReportTargetBrand } from "@/app/lib/match-report/types";
import { SCHEDULE_EDITORIAL_BRANDS } from "@/app/lib/match-report/schedule-editorial-brands";

const PHASES: MatchEventPhase[] = ["pre_match", "live", "report_post"];

const phaseStatusClass: Record<string, string> = {
  empty: "bg-[var(--surface-muted)] text-[color:var(--text-muted)]",
  planned: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  draft: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  ready: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  published: "bg-[#22c55e] text-black",
};

type Props = {
  event: EditorialCalendarEvent;
  onClose: () => void;
};

function brandTargetFromLabel(label: string): MatchReportTargetBrand | undefined {
  const entry = Object.entries(BRAND_LABEL_BY_TARGET).find(([, v]) => v === label);
  return entry ? (entry[0] as MatchReportTargetBrand) : undefined;
}

export function EditorialCalendarEventDrawer({ event, onClose }: Props) {
  const activePhase = event.matchPhase ?? "pre_match";
  const phases: EditorialCalendarPhaseSlot[] = event.phases?.length
    ? event.phases
    : PHASES.map((phase) => ({
        phase,
        label: MATCH_PHASE_LABELS[phase],
        status: "empty" as const,
        contentLinks: {},
      }));

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40"
        aria-label="Close event drawer"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l shadow-xl"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-start justify-between gap-3 border-b p-4" style={{ borderColor: "var(--border)" }}>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              {event.competition ?? event.type.replace(/_/g, " ")}
              {event.group ? ` · ${event.group}` : ""}
            </p>
            <h2 className="mt-1 text-xl font-black text-[color:var(--text-primary)]">{event.title}</h2>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              {new Date(event.startAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            {event.brands.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {event.brands.map((brand) => (
                  <span
                    key={brand}
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {brand}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-2 py-1 text-sm font-semibold"
            style={{ borderColor: "var(--border)" }}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {event.type === "fixture" ? (
            <p className="mb-4 text-xs text-[color:var(--text-muted)]">
              Active phase: <span className="font-semibold">{MATCH_PHASE_LABELS[activePhase]}</span>
            </p>
          ) : null}

          {phases.map((slot) => {
            const phase = slot.phase as EditingCalendarPhase;
            const brand = event.brands[0] ?? "Football365";
            const brandTarget =
              brandTargetFromLabel(brand) ??
              SCHEDULE_EDITORIAL_BRANDS.find((b) => BRAND_LABEL_BY_TARGET[b] === brand);

            return (
              <section
                key={slot.phase}
                className="mb-4 rounded-xl border p-4"
                style={{ borderColor: slot.phase === activePhase ? "var(--accent)" : "var(--border)" }}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[color:var(--text-primary)]">{slot.label}</h3>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${phaseStatusClass[slot.status] ?? phaseStatusClass.empty}`}>
                    {slot.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(slot.phase === "pre_match" || slot.phase === "live") && (
                    <Link
                      href={editingStudioNewFromCalendarPath({
                        calendarEventId: event.id,
                        calendarPhase: phase,
                        brand,
                        fixtureHome: event.homeTeam,
                        fixtureAway: event.awayTeam,
                        kickoff: event.startAt,
                        competition: event.competition,
                        fixtureSlug: event.fixtureSlug,
                        betwayId: event.externalIds?.betwayMatchId,
                      })}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] hover:bg-[var(--surface-hover)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Create social
                    </Link>
                  )}
                  {slot.phase === "report_post" && event.externalIds?.sixLogicMatchId && brandTarget ? (
                    <Link
                      href={matchReportFromCalendarPath({
                        calendarEventId: event.id,
                        matchId: event.externalIds.sixLogicMatchId,
                        sportId: event.externalIds.sixLogicSportId,
                        brand: brandTarget,
                      })}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] hover:bg-[var(--surface-hover)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Match report
                    </Link>
                  ) : null}
                  {slot.phase === "report_post" && !event.externalIds?.sixLogicMatchId ? (
                    <Link
                      href={`/match-report-builder/schedule?calendarEventId=${encodeURIComponent(event.id)}`}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] hover:bg-[var(--surface-hover)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Open schedule
                    </Link>
                  ) : null}
                </div>

                {(slot.contentLinks.editingProjectIds?.length ?? 0) > 0 ? (
                  <ul className="mt-3 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                      Social projects
                    </p>
                    {slot.contentLinks.editingProjectIds!.map((id) => (
                      <li key={id}>
                        <Link href={editingStudioProjectPath(id)} className="text-xs text-[color:var(--accent)] hover:underline">
                          {id}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {(slot.contentLinks.matchReportProjectIds?.length ?? 0) > 0 ? (
                  <ul className="mt-3 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                      Match reports
                    </p>
                    {slot.contentLinks.matchReportProjectIds!.map((id) => (
                      <li key={id}>
                        <Link
                          href={`/match-report-builder/${encodeURIComponent(id)}`}
                          className="text-xs text-[color:var(--accent)] hover:underline"
                        >
                          {id}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}

          {event.notes ? (
            <div className="rounded-lg border p-3 text-sm text-[color:var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
              {event.notes}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
