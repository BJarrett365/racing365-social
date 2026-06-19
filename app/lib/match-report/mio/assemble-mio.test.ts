import { describe, expect, it } from "vitest";
import { assembleMioPrompt, buildMatchIntelligenceObject } from "@/app/lib/match-report/mio/assemble-mio";
import type { MatchReportProject } from "@/app/lib/match-report/types";

function fixture(overrides: Partial<MatchReportProject> = {}): MatchReportProject {
  return {
    id: "p1",
    sport: "football",
    contentType: "match_preview",
    reportScope: "full",
    reportFormat: "neutral",
    editorial: {
      sport: "football",
      contentStyle: "Match preview",
      targetBrand: "football365",
      brandStyle: "",
      rewriteStyle: "",
      useCreatorProfile: false,
      creatorStyleNotes: "",
      articleGuidelines: "",
      layerWeights: {
        sixLogic: 1,
        sport365Commentary: 1,
        leagueTable: 1,
        loopFeed: 1,
        optaPlayerData: 1,
        interviews: 1,
        manualSources: 1,
        playerIntelligence: 1,
      },
    },
    matchId: "m1",
    sportId: "1",
    competition: "Premier League",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    displayLabel: "Arsenal v Chelsea",
    status: "in_progress",
    workflowStep: "build_picture",
    workflowPhase: "generation",
    layers: {
      sixLogic: null,
      sport365Commentary: null,
      leagueTable: null,
      leagueSeasonStats: null,
      fixtureContext: null,
      fotMobPreview: null,
      whoScoredPreview: null,
      loopFeed: null,
      optaPlayerData: null,
      interviews: [],
      manualSources: [],
    },
    health: { ok: true, missingCore: [], skippedLayers: [] },
    confidence: 80,
    eventPicture: null,
    playerIntelligence: null,
    imageIntelligence: null,
    mediaOutputs: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("assembleMio", () => {
  it("uses PIO block for previews", () => {
    const prompt = assembleMioPrompt(fixture());
    expect(prompt).toContain("MATCH_INTELLIGENCE_OBJECT");
    expect(prompt).toContain("phase: preview");
    expect(prompt).toContain("FORM_DIGEST");
    expect(prompt).toContain("SIGNIFICANCE_ENGINE");
  });

  it("uses EIO block for reports", () => {
    const prompt = assembleMioPrompt(fixture({ contentType: "match_report" }));
    expect(prompt).toContain("phase: report");
    expect(prompt).not.toContain("FORM_DIGEST");
  });

  it("builds MIO object with phase", () => {
    const mio = buildMatchIntelligenceObject(fixture());
    expect(mio.phase).toBe("preview");
    expect(mio.projectId).toBe("p1");
    expect(mio.promptBlock.length).toBeGreaterThan(100);
  });
});
