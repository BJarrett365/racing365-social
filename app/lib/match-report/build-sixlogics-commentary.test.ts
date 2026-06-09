import { describe, expect, it } from "vitest";
import {
  buildCommentaryFromSixLogicFoundation,
  buildFixtureContextFromSixLogicFoundation,
  buildSixLogicMatchIntelligence,
} from "@/app/lib/match-report/build-sixlogics-commentary";
import { normaliseSixLogicFoundation } from "@/app/lib/match-report/normalise-sixlogics";

describe("buildSixLogicMatchIntelligence", () => {
  it("maps matchCommentary from Six Logic into commentary lines", () => {
    const foundation = normaliseSixLogicFoundation({
      matchId: "2990368",
      sportId: "1",
      payload: {
        sportccbetdata: {
          sport: {
            category: [
              {
                name: "England",
                tournament: [
                  {
                    name: "Premier League",
                    match: [
                      {
                        id: 2990368,
                        competitor: [
                          { type: "1", name: "Brighton" },
                          { type: "2", name: "Manchester United" },
                        ],
                        matchCommentary: [
                          { matchMinute: 33, commenTypeText: "goal", comment: "Goal for United." },
                          { matchMinute: 45, commenTypeText: "card", comment: "Yellow card." },
                        ],
                        headToHead: [
                          {
                            homeTeamName: "Brighton",
                            awayTeamName: "Manchester United",
                            name: "1:2",
                            date: "2025-11-01",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    const { commentary, fixtureContext } = buildSixLogicMatchIntelligence(foundation);
    expect(commentary.lines).toHaveLength(2);
    expect(commentary.lines[0]?.text).toContain("Goal for United");
    expect(commentary.sourceUrl).toBe("sixlogics://match/2990368");
    expect(fixtureContext?.headToHead).toHaveLength(1);
  });

  it("falls back to events when commentary array is empty", () => {
    const foundation = buildCommentaryFromSixLogicFoundation({
      matchId: "1",
      sportId: "1",
      facts: {
        homeTeam: "Home",
        awayTeam: "Away",
        competition: "Test",
      },
      lineups: { home: { starters: [], substitutes: [] }, away: { starters: [], substitutes: [] } },
      events: [{ minute: 10, type: "Goal", text: "10' Goal for Home" }],
      commentary: [],
      normalisedAt: new Date().toISOString(),
    });
    expect(foundation.lines).toHaveLength(1);
    expect(foundation.lines[0]?.text).toContain("Goal for Home");
  });

  it("returns null fixture context when feed has no H2H or form", () => {
    const foundation = normaliseSixLogicFoundation({
      matchId: "1",
      sportId: "1",
      payload: { fixture: { home_team: "A", away_team: "B", competition: { name: "League" } } },
    });
    expect(buildFixtureContextFromSixLogicFoundation(foundation)).toBeNull();
  });
});
