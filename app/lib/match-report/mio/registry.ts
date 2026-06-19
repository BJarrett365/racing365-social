import type { MioMatchPhase, MioSectionId } from "@/app/lib/match-report/mio/types";

export type MioSectionDef = {
  id: MioSectionId;
  label: string;
  phases: MioMatchPhase[];
};

export const MIO_SECTIONS: MioSectionDef[] = [
  { id: "governance", label: "Editorial governance", phases: ["preview", "report"] },
  { id: "foundation", label: "Match foundation", phases: ["preview", "report"] },
  { id: "form", label: "Form with context", phases: ["preview"] },
  { id: "h2h", label: "Head-to-head", phases: ["preview"] },
  { id: "stakes", label: "State of play / stakes", phases: ["preview", "report"] },
  { id: "tactical_context", label: "Tactical context", phases: ["preview", "report"] },
  { id: "team_intelligence", label: "Team intelligence", phases: ["preview"] },
  { id: "team_news", label: "Team news", phases: ["preview"] },
  { id: "lineups", label: "Predicted / confirmed XI", phases: ["preview"] },
  { id: "odds", label: "Odds (source only)", phases: ["preview"] },
  { id: "loop_feed", label: "Loop Feed", phases: ["preview", "report"] },
  { id: "manual_sources", label: "Manual sources", phases: ["preview", "report"] },
  { id: "significance", label: "Significance engine", phases: ["preview", "report"] },
  { id: "creator_signals", label: "Creator signals (30%)", phases: ["preview", "report"] },
  { id: "next_match", label: "What happens next", phases: ["preview", "report"] },
  { id: "post_match_events", label: "Post-match events", phases: ["report"] },
  { id: "player_ratings", label: "Player ratings", phases: ["report"] },
  { id: "interviews", label: "Interviews", phases: ["report"] },
];

export const PREVIEW_HTML_SECTIONS = [
  "The Story",
  "State Of Play",
  "Form Guide With Context",
  "Tactical Preview",
  "Key Battles",
  "Team News",
  "Predicted Lineups",
  "What Could Decide The Match",
  "AI Prediction",
  "Football365 Verdict",
  "What Happens Next",
] as const;

export const REPORT_HTML_SECTIONS = [
  "The Story",
  "Turning Point",
  "How The Match Was Won",
  "Key Battles",
  "Standout Players",
  "What It Means",
  "What Happens Next",
  "Football365 Verdict",
] as const;

export function activeSectionsForPhase(phase: MioMatchPhase): MioSectionDef[] {
  return MIO_SECTIONS.filter((s) => s.phases.includes(phase));
}
