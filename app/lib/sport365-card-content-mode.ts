import type { PlanetFootballTableBundle } from "@/types";

export type Sport365CardContentMode = "table-only" | "table-score" | "table-score-scorers";

export const SPORT365_CARD_CONTENT_OPTIONS: { value: Sport365CardContentMode; label: string }[] = [
  { value: "table-only", label: "Table only" },
  { value: "table-score", label: "Table and score line" },
  { value: "table-score-scorers", label: "Table, score line and scorers" },
];

export function sport365CardContentModeFromBundle(bundle: PlanetFootballTableBundle): Sport365CardContentMode {
  if (bundle.cardContentMode) return bundle.cardContentMode;
  const table = bundle.showStandingsTable !== false;
  const score = bundle.showMatchScore !== false;
  const scorers = bundle.showMatchScorers !== false;
  if (table && !score && !scorers) return "table-only";
  if (table && score && !scorers) return "table-score";
  if (table && score && scorers) return "table-score-scorers";
  return "table-score-scorers";
}

export function applySport365CardContentMode(
  bundle: PlanetFootballTableBundle,
  mode: Sport365CardContentMode,
): PlanetFootballTableBundle {
  switch (mode) {
    case "table-only":
      return {
        ...bundle,
        cardContentMode: mode,
        showStandingsTable: true,
        showMatchScore: false,
        showMatchScorers: false,
      };
    case "table-score":
      return {
        ...bundle,
        cardContentMode: mode,
        showStandingsTable: true,
        showMatchScore: true,
        showMatchScorers: false,
      };
    case "table-score-scorers":
      return {
        ...bundle,
        cardContentMode: mode,
        showStandingsTable: true,
        showMatchScore: true,
        showMatchScorers: true,
      };
  }
}
