import { describe, expect, it } from "vitest";
import { runMatchReportFactCheck } from "@/app/lib/match-report/fact-check";
import { buildMatchStoryContext } from "@/app/lib/match-report/story-engine";
import type { MatchReportProject } from "@/app/lib/match-report/types";

function project(overrides: Partial<MatchReportProject> = {}): MatchReportProject {
  return {
    id: "mr-test",
    sport: "football",
    contentType: "match_report",
    reportScope: "full",
    reportFormat: "neutral",
    editorial: {
      sport: "football",
      contentStyle: "Match report",
      targetBrand: "football365",
      brandStyle: "Football365",
      rewriteStyle: "sharp",
      useCreatorProfile: true,
      creatorName: "Test Writer",
      creatorStyleNotes: "Witty, analytical and direct.",
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
    matchId: "2990368",
    sportId: "1",
    competition: "Premier League",
    homeTeam: "Brighton and Hove Albion",
    awayTeam: "Manchester United",
    homeScore: 0,
    awayScore: 3,
    displayLabel: "Brighton 0-3 Man Utd",
    status: "in_progress",
    workflowStep: "fact_check",
    workflowPhase: "generation",
    layers: {
      sixLogic: {
        matchId: "2990368",
        sportId: "1",
        facts: {
          homeTeam: "Brighton and Hove Albion",
          awayTeam: "Manchester United",
          homeScore: 0,
          awayScore: 3,
          competition: "Premier League",
          venue: "American Express Stadium",
        },
        lineups: {
          home: {
            starters: [{ name: "Welbeck Danny" }, { name: "Milner James" }],
            substitutes: [],
          },
          away: {
            starters: [{ name: "Mainoo Kobbie" }, { name: "Fernandes Bruno" }],
            substitutes: [],
          },
        },
        events: [
          {
            minute: 33,
            type: "Goal",
            text: "33' Goal Dorgu Patrick assisted by Fernandes Bruno",
            teamSide: "away",
            playerName: "Dorgu Patrick",
          },
          {
            minute: 44,
            type: "Goal",
            text: "44' Goal Mbeumo Bryan assisted by Diallo Amad",
            teamSide: "away",
            playerName: "Mbeumo Bryan",
          },
          {
            minute: 48,
            type: "Goal",
            text: "48' Goal Fernandes Bruno assisted by Dorgu Patrick",
            teamSide: "away",
            playerName: "Fernandes Bruno",
          },
        ],
        commentary: [],
        availableData: {
          matchTeamStats: [
            {
              htPossessionPercentage: 54,
              atPossessionPercentage: 46,
              htShotsOnTarget: 2,
              atShotsOnTarget: 7,
              statsType: "All",
            },
          ],
          sections: [
            {
              key: "matchTeamStats",
              title: "Team stats",
              description: "Possession and shots.",
              count: 1,
            },
          ],
        },
        normalisedAt: "2026-05-25T00:00:00.000Z",
      },
      sport365Commentary: {
        sourceUrl: "https://example.test",
        matchPageId: "2990368",
        lines: [{ text: "[90'] Ball possession: Brighton and Hove Albion: 52%, Manchester United: 48%." }],
        digest: "",
        importedAt: "2026-05-25T00:00:00.000Z",
      },
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
    confidence: 90,
    eventPicture: null,
    playerIntelligence: null,
    imageIntelligence: null,
    mediaOutputs: {
      headline: "Brighton 0-3 Manchester United",
      standfirst: "United won well.",
      reportHtml:
        "<p>Brighton's Kobbie Mainoo was booked as United dominated from start to finish with 55% possession.</p><p>Dorgu, Mbeumo and Fernandes scored.</p>",
      generatedAt: "2026-05-25T00:00:00.000Z",
    },
    factCheck: null,
    archive: null,
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("match report fact check", () => {
  it("flags player/team and stat conflicts", () => {
    const result = runMatchReportFactCheck(project());
    expect(result.status).toBe("blocked");
    expect(result.issues.some((issue) => issue.type === "team_player_mismatch")).toBe(true);
    expect(result.issues.some((issue) => issue.type === "stat_conflict")).toBe(true);
    expect(result.articleScore.overall).toBeLessThanOrEqual(65);
  });

  it("allows away-winner perspective scoreline when canonical home-away score is present", () => {
    const result = runMatchReportFactCheck(
      project({
        mediaOutputs: {
          headline: "Brighton 0-3 Manchester United: United cruise",
          standfirst: "Manchester United delivered a powerful performance, defeating Brighton 3-0.",
          reportHtml:
            "<p>Brighton and Hove Albion 0-3 Manchester United. Dorgu, Mbeumo and Fernandes scored for United.</p>",
          generatedAt: "2026-05-25T00:00:00.000Z",
        },
      }),
    );
    expect(result.issues.some((issue) => issue.title === "Possible reversed scoreline")).toBe(false);
  });

  it("builds story context from Tier 1 match data", () => {
    const story = buildMatchStoryContext(project());
    expect(story.matchInfo.score).toBe("Brighton and Hove Albion 0-3 Manchester United");
    expect(story.derived.turningPoint).toBe("Patrick Dorgu goal 33'");
    expect(story.statisticsByPeriod.fullTime?.groups.matchOverview.ballPossession).toEqual({
      home: 54,
      away: 46,
      homeRaw: "54%",
      awayRaw: "46%",
    });
    expect(story.statisticsByPeriod.fullTime?.groups.matchOverview.shotsOnTarget).toEqual({
      home: 2,
      away: 7,
      homeRaw: "2",
      awayRaw: "7",
    });
  });
});
