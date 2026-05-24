import type { InterviewIntelligence } from "@/app/lib/match-report/types";

/**
 * Single-project match reports: partition imported interviews into home vs away columns.
 * Legacy rows without `team` — and explicit `neutral` — are listed under Home so they stay visible.
 */
export function interviewsForTranscriptPanelSide(
  interviews: InterviewIntelligence[],
  side: "home" | "away",
): InterviewIntelligence[] {
  if (side === "away") {
    return interviews.filter((i) => i.team === "away");
  }
  const homeRows = interviews.filter((i) => i.team === "home");
  const neutralOrUntagged = interviews.filter((i) => i.team == null || i.team === "neutral");
  return [...neutralOrUntagged, ...homeRows];
}
