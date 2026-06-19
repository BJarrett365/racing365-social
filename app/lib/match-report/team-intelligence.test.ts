import { describe, expect, it } from "vitest";
import { extractTeamIntelligence } from "@/app/lib/match-report/team-intelligence";
import type { MatchReportProject } from "@/app/lib/match-report/types";

describe("extractTeamIntelligence", () => {
  it("excludes social rumour sources", () => {
    const project = {
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      layers: {
        manualSources: [
          {
            id: "1",
            type: "Other" as const,
            source: "Twitter rumour mill",
            excerpt: "Rumour on Twitter says striker injured",
            importedAt: new Date().toISOString(),
          },
          {
            id: "2",
            type: "Other" as const,
            source: "BBC Sport",
            excerpt: "Martin Odegaard doubt for weekend with knee issue",
            importedAt: new Date().toISOString(),
          },
        ],
        sixLogic: null,
      },
    } as unknown as MatchReportProject;

    const intel = extractTeamIntelligence(project);
    expect(intel.playerStatuses.length).toBe(1);
    expect(intel.playerStatuses[0]?.source).toBe("BBC Sport");
    expect(intel.playerStatuses[0]?.sourceTier).toBe(2);
  });
});
