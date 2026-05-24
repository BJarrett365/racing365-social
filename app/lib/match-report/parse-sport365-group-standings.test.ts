import { describe, expect, it } from "vitest";
import { isWorldCupGroupStageImport } from "@/app/lib/match-report/parse-sport365-group-standings";

describe("parse-sport365-group-standings", () => {
  it("detects World Cup group stage imports from URL or competition", () => {
    expect(
      isWorldCupGroupStageImport("https://www.sport365.com/football/world-cup/group-stage#/standings"),
    ).toBe(true);
    expect(isWorldCupGroupStageImport("https://www.sport365.com/football/england/premier-league")).toBe(false);
    expect(isWorldCupGroupStageImport("https://example.com", "FIFA World Cup 2026")).toBe(true);
  });
});
