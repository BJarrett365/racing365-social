import type {
  EditorialCalendarPhaseSlot,
  EditorialCalendarPhaseStatus,
  MatchEventPhase,
} from "@/app/lib/editorial-calendar/types";

export const MATCH_PHASE_LABELS: Record<MatchEventPhase, string> = {
  pre_match: "Pre-match",
  live: "Live",
  report_post: "Report / Post",
};

const MATCH_DURATION_MS = 105 * 60 * 1000;

export function defaultFixturePhases(): EditorialCalendarPhaseSlot[] {
  return (["pre_match", "live", "report_post"] as const).map((phase) => ({
    phase,
    label: MATCH_PHASE_LABELS[phase],
    status: "empty" as EditorialCalendarPhaseStatus,
    contentLinks: {},
  }));
}

/** Highlight active editorial phase from kickoff time. */
export function computeMatchPhase(startAt: string, now = Date.now()): MatchEventPhase {
  const kickoff = new Date(startAt).getTime();
  if (Number.isNaN(kickoff)) return "pre_match";
  if (now < kickoff) return "pre_match";
  if (now < kickoff + MATCH_DURATION_MS) return "live";
  return "report_post";
}

export function normalizeKickoffIso(date: string, kickoffIso: string): string {
  const trimmed = kickoffIso.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const datePart = date.trim() || trimmed.slice(0, 10);
  const timePart = trimmed.includes(" ") ? trimmed.split(" ").slice(1).join(" ") : trimmed.slice(11).trim() || "15:00";
  const candidate = `${datePart}T${timePart.length === 5 ? `${timePart}:00` : timePart}`;
  const parsed = new Date(candidate);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  const fallback = new Date(`${datePart}T15:00:00`);
  return Number.isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
}

export function fixtureTitle(homeTeam: string, awayTeam: string): string {
  return `${homeTeam} vs ${awayTeam}`;
}
