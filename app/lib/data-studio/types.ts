/**
 * Data Studio — sport verticals and editorial learning references.
 */

export type SportVerticalId =
  | "football"
  | "horse_racing"
  | "rugby_union"
  | "rugby_league"
  | "cricket"
  | "tennis"
  | "f1"
  | "multi";

/** POST /api/data-studio/match-copy generation modes. */
export type MatchCopyMode = "preview" | "report" | "sixteen_conclusions";

/** How this row helps models or journalists (not a live feed). */
export type LearningKind = "article_style" | "site" | "brand";

export type LearningLibraryEntry = {
  id: string;
  kind: LearningKind;
  name: string;
  description: string;
  /** Public reference URL — paste into Language Studio URL import when allowed. */
  url?: string;
  verticals: SportVerticalId[];
  /** Editorial note: tone, structure, or rights reminder. */
  notes?: string;
};

export type SportVertical = {
  id: SportVerticalId;
  label: string;
  shortDescription: string;
  dataFeedNote: string;
};
