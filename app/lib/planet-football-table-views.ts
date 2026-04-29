export type PlanetFootballTableViewId =
  | "full-table"
  | "form-table"
  | "home-table"
  | "away-table"
  | "all-time-premier-league-table"
  | "calendar-year-table"
  | "table-on-this-date"
  | "table-between-two-dates"
  | "first-half-table"
  | "second-half-table"
  | "table-by-custom-match-period"
  | "table-v-top-half"
  | "table-v-bottom-half"
  | "table-when-scoring-first"
  | "table-when-conceding-first"
  | "points-gained-from-losing-positions"
  | "points-lost-from-winning-positions"
  | "points-gained-from-score-draw-positions"
  | "both-teams-to-score-table"
  | "big-chances-created"
  | "corners-won"
  | "corners-conceded"
  | "clean-sheets"
  | "wins-to-nil"
  | "possession"
  | "open-play-goals";

export type PlanetFootballTableView = {
  id: PlanetFootballTableViewId;
  label: string;
  slug?: string;
  tableScope?: "overall" | "home" | "away";
};

export const PLANET_FOOTBALL_TABLE_VIEWS: PlanetFootballTableView[] = [
  { id: "full-table", label: "Full Table", slug: "full-table", tableScope: "overall" },
  { id: "form-table", label: "Form Table", slug: "form-table" },
  { id: "home-table", label: "Home Table", slug: "full-table", tableScope: "home" },
  { id: "away-table", label: "Away Table", slug: "full-table", tableScope: "away" },
  { id: "all-time-premier-league-table", label: "All-Time Premier League Table", slug: "all-time-premier-league-table" },
  { id: "calendar-year-table", label: "Calendar Year Table", slug: "calendar-year-table" },
  { id: "table-on-this-date", label: "Table On This Date", slug: "table-on-this-date" },
  { id: "table-between-two-dates", label: "Table Between Two Dates", slug: "table-between-two-dates" },
  { id: "first-half-table", label: "First Half Table", slug: "first-half-table" },
  { id: "second-half-table", label: "Second Half Table", slug: "second-half-table" },
  { id: "table-by-custom-match-period", label: "Table By Custom Match Period", slug: "table-by-custom-match-period" },
  { id: "table-v-top-half", label: "Table v Top Half", slug: "table-v-top-half" },
  { id: "table-v-bottom-half", label: "Table v Bottom Half", slug: "table-v-bottom-half" },
  { id: "table-when-scoring-first", label: "Table When Scoring First", slug: "table-when-scoring-first" },
  { id: "table-when-conceding-first", label: "Table When Conceding First", slug: "table-when-conceding-first" },
  {
    id: "points-gained-from-losing-positions",
    label: "Points Gained from Losing Positions",
    slug: "points-gained-from-losing-positions",
  },
  { id: "points-lost-from-winning-positions", label: "Points Lost from Winning Positions", slug: "points-lost-from-winning-positions" },
  {
    id: "points-gained-from-score-draw-positions",
    label: "Points Gained From Score Draw Positions",
    slug: "points-gained-from-score-draw-positions",
  },
  { id: "both-teams-to-score-table", label: "Both Teams to Score Table", slug: "both-teams-to-score-table" },
  { id: "big-chances-created", label: "Big Chances Created", slug: "big-chances-created" },
  { id: "corners-won", label: "Corners Won", slug: "corners-won" },
  { id: "corners-conceded", label: "Corners Conceded", slug: "corners-conceded" },
  { id: "clean-sheets", label: "Clean Sheets", slug: "clean-sheets" },
  { id: "wins-to-nil", label: "Wins to Nil", slug: "wins-to-nil" },
  { id: "possession", label: "Possession", slug: "possession" },
  { id: "open-play-goals", label: "Open Play Goals", slug: "open-play-goals" },
];

export function planetFootballTableView(id: string | undefined): PlanetFootballTableView {
  return PLANET_FOOTBALL_TABLE_VIEWS.find((view) => view.id === id) ?? PLANET_FOOTBALL_TABLE_VIEWS[0]!;
}
