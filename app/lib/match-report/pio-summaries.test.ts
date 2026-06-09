import { describe, expect, it } from "vitest";
import {
  assemblePioPromptSections,
  buildFormDigestBlock,
  buildH2HDigestBlock,
  buildTeamNewsDigestBlock,
} from "@/app/lib/match-report/pio-summaries";
import type { MatchReportProject } from "@/app/lib/match-report/types";

function previewProject(overrides: Partial<MatchReportProject> = {}): MatchReportProject {
  return {
    id: "mr-preview",
    sport: "football",
    contentType: "match_preview",
    reportScope: "full",
    reportFormat: "neutral",
    editorial: {
      sport: "football",
      contentStyle: "Match preview",
      targetBrand: "football365",
      brandStyle: "Football365",
      rewriteStyle: "sharp",
      useCreatorProfile: false,
      creatorStyleNotes: "",
      articleGuidelines: "",
      layerWeights: {
        sixLogic: 100,
        sport365Commentary: 80,
        leagueTable: 80,
        loopFeed: 70,
        optaPlayerData: 70,
        interviews: 60,
        manualSources: 60,
        playerIntelligence: 70,
      },
    },
    matchId: "12345",
    sportId: "1",
    competition: "Premier League",
    homeTeam: "Arsenal",
    awayTeam: "Burnley",
    displayLabel: "Arsenal vs Burnley · Preview",
    status: "in_progress",
    workflowStep: "league_table",
    workflowPhase: "import_layers",
    confidence: 92,
    layers: {
      sixLogic: {
        matchId: "12345",
        sportId: "1",
        facts: {
          homeTeam: "Arsenal",
          awayTeam: "Burnley",
          competition: "Premier League",
          kickoffIso: "2026-05-30 15:00",
          status: "Not Started",
        },
        lineups: { home: { starters: [], substitutes: [] }, away: { starters: [], substitutes: [] } },
        events: [],
        commentary: [],
        availableData: {
          sections: [{ id: "form", label: "Recent form", count: 5 }],
          odds: [{ market: "1X2", home: 1.4, draw: 4.5, away: 7.0 }],
        },
      },
      sport365Commentary: null,
      fixtureContext: {
        sourceUrl: "sixlogic",
        digest: "Arsenal unbeaten in five.",
        headToHead: [
          {
            date: "2025-02-01",
            homeTeam: "Arsenal",
            awayTeam: "Burnley",
            homeScore: 3,
            awayScore: 1,
          },
        ],
        homeRecentResults: [
          {
            date: "2026-05-20",
            homeTeam: "Arsenal",
            awayTeam: "Chelsea",
            homeScore: 2,
            awayScore: 0,
          },
        ],
        awayRecentResults: [
          {
            date: "2026-05-21",
            homeTeam: "Burnley",
            awayTeam: "Wolves",
            homeScore: 0,
            awayScore: 2,
          },
        ],
        homeNextFixture: { team: "Arsenal", opponent: "Liverpool", date: "2026-06-06" },
        awayNextFixture: null,
      },
      leagueTable: null,
      leagueSeasonStats: null,
      loopFeed: null,
      optaPlayerData: null,
      interviews: [],
      manualSources: [
        {
          id: "ms-1",
          source: "BBC Sport",
          type: "Other",
          confidence: "high",
          title: "Team news",
          excerpt: "Burnley striker ruled out with injury.",
        },
      ],
    },
    health: { skippedLayers: [], sixLogicHealth: { status: "ok", missingCore: [] } },
    createdAt: "2026-05-28T00:00:00.000Z",
    updatedAt: "2026-05-28T00:00:00.000Z",
    ...overrides,
  };
}

describe("pio-summaries", () => {
  it("builds form and H2H digests from fixture context", () => {
    const project = previewProject();
    expect(buildFormDigestBlock(project)).toContain("Arsenal");
    expect(buildH2HDigestBlock(project)).toContain("3-1");
  });

  it("filters team news manual sources", () => {
    const project = previewProject();
    expect(buildTeamNewsDigestBlock(project)).toContain("injury");
  });

  it("assembles PIO sections for match preview projects", () => {
    const text = assemblePioPromptSections(previewProject());
    expect(text).toContain("FORM_DIGEST");
    expect(text).toContain("H2H_DIGEST");
    expect(text).toContain("TEAM_NEWS_DIGEST");
    expect(text).toContain("ODDS_DIGEST");
    expect(text).not.toContain("COMMENTARY_DIGEST");
  });

  it("rejects non-preview projects", () => {
    expect(() => assemblePioPromptSections(previewProject({ contentType: "match_report" }))).toThrow(
      "match_preview",
    );
  });
});
