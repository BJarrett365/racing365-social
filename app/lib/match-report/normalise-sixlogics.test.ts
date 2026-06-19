import { describe, expect, it } from "vitest";
import {
  assessSixLogicHealth,
  buildFoundationImportPreview,
  normaliseSixLogicFoundation,
} from "@/app/lib/match-report/normalise-sixlogics";

describe("normaliseSixLogicFoundation", () => {
  it("keeps all available Sportcc match sections except social links", () => {
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
                    season: "2025/26",
                    match: [
                      {
                        id: 2990368,
                        status: "Finished",
                        date: "2026-05-24 17:00",
                        roundName: "Round 38",
                        fttime: "2026-05-24 18:57",
                        venue: { name: "The American Express Community Stadium", spectators: "31729" },
                        competitor: [
                          { type: "1", name: "Brighton", lineUp: { formation: "4-2-3-1", player: [{ name: "Welbeck Danny" }] } },
                          { type: "2", name: "Manchester United", lineUp: { formation: "4-2-3-1", player: [{ name: "Fernandes Bruno" }] } },
                        ],
                        score: [{ type: "FT", name: "0:3" }],
                        goal: [{ type: "Goal", score: "0-1", team: "2", minute: 33, name: "Dorgu Patrick" }],
                        card: [{ type: "Yellow", team: "2", minute: 45, name: "Mainoo Kobbie" }],
                        substitution: [{ team: "1", minut: 59, playerOut: "Welbeck Danny", playerIn: "March Solly" }],
                        matchCommentary: [{ matchMinute: 33, commenTypeText: "goal", comment: "Goal for United." }],
                        matchTeamStats: [
                          {
                            matchId: 2990368,
                            htPossessionPercentage: 54,
                            atPossessionPercentage: 46,
                            htShotsOnTarget: 2,
                            atShotsOnTarget: 7,
                            statsType: "All",
                          },
                        ],
                        leagueTable: [{ teamName: "Manchester United", place: 3 }],
                        headToHead: [{ homeTeamName: "Brighton", awayTeamName: "Manchester United" }],
                        odds: [{ bookmakerName: "Example", currentAway: "2.00" }],
                        socialLinks: [{ link: "https://social.example" }],
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

    expect(foundation.availableData?.sections.map((section) => section.key)).toContain("leagueTable");
    expect(foundation.availableData?.sections.map((section) => section.key)).toContain("matchTeamStats");
    expect(foundation.availableData?.sections.map((section) => section.key)).not.toContain("socialLinks");
    expect(JSON.stringify(foundation.availableData)).not.toContain("social.example");
    expect(foundation.commentary[0]?.text).toContain("Goal for United");
    expect(foundation.availableData?.matchTeamStats?.[0]).toMatchObject({ statsType: "All" });
  });

  it("normalises pre-match World Cup fixture without scores", () => {
    const foundation = normaliseSixLogicFoundation({
      matchId: "3177321",
      sportId: "1",
      payload: {
        sportccbetdata: {
          sport: {
            category: [
              {
                name: "International",
                tournament: [
                  {
                    name: "World Cup Group A",
                    season: "2026",
                    match: [
                      {
                        id: 3177321,
                        status: "NSY",
                        date: "2026-06-11 21:00",
                        roundName: "Round 1",
                        venue: { name: "Estadio Azteca", capacity: 106187 },
                        competitor: [
                          { type: "1", name: "Mexico", lineUp: null },
                          { type: "2", name: "South Africa", lineUp: null },
                        ],
                        score: [],
                        headToHead: [{ homeTeamName: "Mexico", awayTeamName: "South Africa" }],
                        lastHomeResults: [{ homeTeamName: "Mexico" }],
                        lastAwayResults: [{ awayTeamName: "South Africa" }],
                        upcomingHomeFixtures: [{ matchId: 3177321 }],
                        odds: [{ bookmakerName: "Bet365", currentHome: "1.42", currentDraw: "4.50", currentAway: "7.50" }],
                        leagueTable: [{ teamName: "Mexico", place: 3 }],
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

    expect(foundation.facts.homeTeam).toBe("Mexico");
    expect(foundation.facts.awayTeam).toBe("South Africa");
    expect(foundation.facts.competition).toBe("International · World Cup Group A");
    expect(foundation.facts.homeScore).toBeUndefined();
    expect(foundation.facts.awayScore).toBeUndefined();
    expect(foundation.facts.status).toBe("NSY");

    const previewHealth = assessSixLogicHealth(foundation, { contentType: "match_preview" });
    expect(previewHealth.ok).toBe(true);
    expect(previewHealth.preMatch).toBe(true);
    expect(previewHealth.missingCore).toEqual([]);

    const reportHealth = assessSixLogicHealth(foundation, { contentType: "match_report" });
    expect(reportHealth.ok).toBe(false);
    expect(reportHealth.missingCore).toContain("homeScore");
    expect(reportHealth.missingCore).toContain("awayScore");

    const ui = buildFoundationImportPreview(foundation);
    expect(ui.preMatch).toBe(true);
    expect(ui.matchDetails[0]?.label).toBe("Fixture");
    expect(ui.previewFeedHighlights.some((row) => row.label === "Bookmaker odds")).toBe(true);
  });
});
