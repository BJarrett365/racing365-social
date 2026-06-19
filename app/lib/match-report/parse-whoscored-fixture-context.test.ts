import { describe, expect, it } from "vitest";
import { mergeFixtureContextIntelligence } from "@/app/lib/match-report/merge-fixture-context";
import {
  parseWhoScoredFixtureContextFromFetched,
  resolveWhoScoredPreviewUrl,
} from "@/app/lib/match-report/parse-whoscored-fixture-context";

describe("resolveWhoScoredPreviewUrl", () => {
  it("normalises show URLs without rewriting to live statistics", () => {
    expect(
      resolveWhoScoredPreviewUrl(
        "https://www.whoscored.com/matches/1953853/show/international-fifa-world-cup-2026-mexico-south-africa",
      ),
    ).toBe(
      "https://www.whoscored.com/matches/1953853/show/international-fifa-world-cup-2026-mexico-south-africa",
    );
  });
});

describe("parseWhoScoredFixtureContextFromFetched", () => {
  it("parses head-to-head, form, and match facts from feed captures", () => {
    const parsed = parseWhoScoredFixtureContextFromFetched({
      html: `<html><head><title>Mexico-South Africa - FIFA World Cup 2026 Head to Head Statistics</title></head><body><h2>Match Forecast</h2><ul><li>Mexico have conceded only 2 goals in their last 8 games.</li></ul></body></html>`,
      sourceUrl:
        "https://www.whoscored.com/matches/1953853/show/international-fifa-world-cup-2026-mexico-south-africa",
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      jsonCaptures: [
        {
          url: "https://www.whoscored.com/StatisticsFeed/1/GetPreviousMeetings?matchId=1953853",
          data: {
            previousMeetings: [
              {
                homeTeamName: "Mexico",
                awayTeamName: "South Africa",
                homeScore: 2,
                awayScore: 1,
                startTime: "2010-06-11",
                tournamentName: "World Cup",
              },
            ],
          },
        },
        {
          url: "https://www.whoscored.com/StatisticsFeed/1/GetTeamRecentForm?matchId=1953853",
          data: {
            lastHomeResults: [
              {
                homeTeamName: "Mexico",
                awayTeamName: "Ecuador",
                homeScore: 2,
                awayScore: 0,
                startTime: "2026-05-20",
              },
            ],
            lastAwayResults: [
              {
                homeTeamName: "South Africa",
                awayTeamName: "Ghana",
                homeScore: 1,
                awayScore: 1,
                startTime: "2026-05-18",
              },
            ],
          },
        },
      ],
    });

    expect(parsed?.headToHead).toHaveLength(1);
    expect(parsed?.homeRecentResults).toHaveLength(1);
    expect(parsed?.awayRecentResults).toHaveLength(1);
    expect(parsed?.matchFacts?.[0]).toContain("conceded only 2 goals");
    expect(parsed?.digest).toContain("Head-to-head");
    expect(parsed?.digest).toContain("Match facts");
  });
});

describe("mergeFixtureContextIntelligence", () => {
  it("fills empty SixLogic H2H from WhoScored supplemental feed", () => {
    const merged = mergeFixtureContextIntelligence(
      {
        sourceUrl: "sixlogics://match/3177321",
        matchPageId: "3177321",
        headToHead: [],
        homeRecentResults: [],
        awayRecentResults: [],
        digest: "Six Logic shell only.",
        importedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        sourceUrl:
          "https://www.whoscored.com/matches/1953853/show/international-fifa-world-cup-2026-mexico-south-africa",
        matchPageId: "1953853",
        headToHead: [
          {
            homeTeam: "Mexico",
            awayTeam: "South Africa",
            homeScore: 2,
            awayScore: 1,
          },
        ],
        homeRecentResults: [{ homeTeam: "Mexico", awayTeam: "Ecuador", homeScore: 2, awayScore: 0 }],
        awayRecentResults: [{ homeTeam: "South Africa", awayTeam: "Ghana", homeScore: 1, awayScore: 1 }],
        matchFacts: ["Mexico are unbeaten in five."],
        digest: "WhoScored digest",
        importedAt: "2026-01-01T00:00:00.000Z",
      },
    );

    expect(merged?.headToHead).toHaveLength(1);
    expect(merged?.homeRecentResults).toHaveLength(1);
    expect(merged?.matchFacts).toContain("Mexico are unbeaten in five.");
    expect(merged?.sourceUrl).toContain("whoscored.com");
  });
});
