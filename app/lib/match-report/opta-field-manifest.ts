/**
 * Documents which Opta/WhoScored fields the Match Report Builder uses.
 * Handoff spec for direct Opta API integration (post-prototype).
 */
export const OPTA_FIELD_MANIFEST = {
  version: 1,
  usedInRatingsTable: ["summary.rating", "summary.goals", "summary.assists", "summary.minutes", "name", "team", "position"],
  usedInJustificationProse: [
    "offensive.shots",
    "offensive.xG",
    "offensive.keyPasses",
    "defensive.tackles",
    "defensive.interceptions",
    "passing.passAccuracy",
    "passing.passes",
  ],
  primarySource: "whoscored_summary_tab",
  notes: "V1 uses WhoScored livestatistics URL. Direct Opta API should map to the same OptaPlayerProfile shape.",
} as const;
