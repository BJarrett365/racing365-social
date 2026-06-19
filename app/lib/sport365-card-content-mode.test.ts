import { describe, expect, it } from "vitest";
import {
  applySport365CardContentMode,
  sport365CardContentModeFromBundle,
} from "@/app/lib/sport365-card-content-mode";
import type { PlanetFootballTableBundle } from "@/types";

const base = {
  id: "t1",
  table: {
    source: "Sport365" as const,
    sourceUrl: "",
    competition: "Group D",
    columns: [],
    rows: [],
  },
} as PlanetFootballTableBundle;

describe("sport365-card-content-mode", () => {
  it("maps table-score to show flags", () => {
    const next = applySport365CardContentMode(base, "table-score");
    expect(next.showStandingsTable).toBe(true);
    expect(next.showMatchScore).toBe(true);
    expect(next.showMatchScorers).toBe(false);
  });

  it("derives mode from legacy boolean flags", () => {
    expect(
      sport365CardContentModeFromBundle({
        ...base,
        showMatchScore: false,
        showMatchScorers: false,
      }),
    ).toBe("table-only");
  });
});
