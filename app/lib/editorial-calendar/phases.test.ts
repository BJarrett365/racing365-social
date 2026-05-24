import { describe, expect, it } from "vitest";
import {
  computeMatchPhase,
  defaultFixturePhases,
  fixtureTitle,
  normalizeKickoffIso,
} from "@/app/lib/editorial-calendar/phases";

describe("editorial-calendar phases", () => {
  it("creates three default fixture phases", () => {
    const phases = defaultFixturePhases();
    expect(phases).toHaveLength(3);
    expect(phases.map((p) => p.phase)).toEqual(["pre_match", "live", "report_post"]);
  });

  it("normalizes date + kickoff strings to ISO", () => {
    const iso = normalizeKickoffIso("2026-06-11", "2026-06-11 19:00");
    expect(iso).toMatch(/^2026-06-11T/);
    expect(new Date(iso).getUTCHours()).toBeGreaterThanOrEqual(0);
  });

  it("computes match phase from kickoff", () => {
    const kickoff = "2026-06-11T19:00:00.000Z";
    expect(computeMatchPhase(kickoff, new Date("2026-06-11T18:00:00.000Z").getTime())).toBe("pre_match");
    expect(computeMatchPhase(kickoff, new Date("2026-06-11T19:30:00.000Z").getTime())).toBe("live");
    expect(computeMatchPhase(kickoff, new Date("2026-06-11T21:30:00.000Z").getTime())).toBe("report_post");
  });

  it("builds fixture title", () => {
    expect(fixtureTitle("Brighton", "Man Utd")).toBe("Brighton vs Man Utd");
  });
});
