import { describe, expect, it } from "vitest";
import type { MatchReportProject, PlayerRatingEntry } from "@/app/lib/match-report/types";
import type { OptaPlayerIntelligence } from "@/app/lib/match-report/opta-player-types";
import { parseWhoScoredFromHtml } from "@/app/lib/match-report/parse-whoscored";
import {
  reconcileOptaPlayerData,
  reconcilePlayerRatings,
  resolvePlayerTeamSide,
  teamNamesMatch,
} from "@/app/lib/match-report/reconcile-player-ratings";

function makeProject(overrides: Partial<MatchReportProject> = {}): MatchReportProject {
  return {
    id: "test",
    homeTeam: "Leeds United",
    awayTeam: "Brighton and Hove Albion",
    layers: {
      sixLogic: {
        lineups: {
          home: {
            starters: [
              { name: "Illan Meslier", position: "GK" },
              { name: "Ethan Ampadu", position: "DM" },
              { name: "Dominic Calvert-Lewin", position: "ST" },
            ],
            substitutes: [{ name: "Wilfried Gnonto", position: "RW", isSubstitute: true }],
          },
          away: {
            starters: [
              { name: "Bart Verbruggen", position: "GK" },
              { name: "Joao Pedro", position: "ST" },
              { name: "Kaoru Mitoma", position: "LW" },
            ],
            substitutes: [{ name: "Georginio Rutter", position: "AM", isSubstitute: true }],
          },
        },
      },
    },
    ...overrides,
  } as MatchReportProject;
}

describe("teamNamesMatch", () => {
  it("matches Brighton naming variants", () => {
    expect(teamNamesMatch("Brighton and Hove Albion", "Brighton & Hove Albion")).toBe(true);
    expect(teamNamesMatch("Brighton and Hove Albion", "Brighton")).toBe(true);
  });
});

describe("resolvePlayerTeamSide", () => {
  it("maps players to project lineups regardless of incoming team", () => {
    const project = makeProject();
    expect(resolvePlayerTeamSide("Dominic Calvert-Lewin", project, "away")).toBe("home");
    expect(resolvePlayerTeamSide("Kaoru Mitoma", project, "home")).toBe("away");
  });

  it("matches SixLogics surname-first player names to normal display names", () => {
    const project = makeProject({
      layers: {
        sixLogic: {
          lineups: {
            home: {
              starters: [{ name: "Calvert-Lewin Dominic", position: "FW" }],
              substitutes: [],
            },
            away: {
              starters: [],
              substitutes: [],
            },
          },
        },
      },
    } as Partial<MatchReportProject>);

    expect(resolvePlayerTeamSide("Dominic Calvert-Lewin", project, "away")).toBe("home");
  });
});

describe("reconcilePlayerRatings", () => {
  it("puts Leeds players under home and Brighton players under away", () => {
    const project = makeProject();
    const mixed: PlayerRatingEntry[] = [
      { name: "Dominic Calvert-Lewin", team: "away", rating: 8.1, justification: "Goal" },
      { name: "Kaoru Mitoma", team: "home", rating: 7.4, justification: "Busy" },
      { name: "Ethan Ampadu", team: "away", rating: 7.0, justification: "Solid" },
      { name: "Joao Pedro", team: "home", rating: 6.8, justification: "Quiet" },
    ];

    const reconciled = reconcilePlayerRatings(project, mixed);
    expect(reconciled.find((row) => row.name === "Dominic Calvert-Lewin")?.team).toBe("home");
    expect(reconciled.find((row) => row.name === "Kaoru Mitoma")?.team).toBe("away");
    expect(reconciled.filter((row) => row.team === "home").map((row) => row.name).sort()).toEqual([
      "Dominic Calvert-Lewin",
      "Ethan Ampadu",
    ].sort());
    expect(reconciled.filter((row) => row.team === "away").map((row) => row.name).sort()).toEqual([
      "Kaoru Mitoma",
      "Joao Pedro",
    ].sort());
  });

  it("uses SixLogics as the final roster and caps each team at 11 starters plus 9 subs", () => {
    const project = makeProject({
      homeTeam: "Home FC",
      awayTeam: "Away FC",
      layers: {
        sixLogic: {
          lineups: {
            home: {
              starters: Array.from({ length: 12 }, (_, index) => ({
                name: `Home Starter ${index + 1}`,
                position: index === 0 ? "GK" : "MC",
              })),
              substitutes: Array.from({ length: 10 }, (_, index) => ({
                name: `Home Sub ${index + 1}`,
                position: "Sub",
                isSubstitute: true,
              })),
            },
            away: {
              starters: Array.from({ length: 11 }, (_, index) => ({
                name: `Away Starter ${index + 1}`,
                position: index === 0 ? "GK" : "DC",
              })),
              substitutes: Array.from({ length: 9 }, (_, index) => ({
                name: `Away Sub ${index + 1}`,
                position: "Sub",
                isSubstitute: true,
              })),
            },
          },
        },
      },
    } as Partial<MatchReportProject>);
    const mixed: PlayerRatingEntry[] = [
      ...Array.from({ length: 12 }, (_, index) => ({
        name: `Home Starter ${index + 1}`,
        team: "away" as const,
        rating: 7,
        justification: "From feed",
      })),
      ...Array.from({ length: 10 }, (_, index) => ({
        name: `Home Sub ${index + 1}`,
        team: "away" as const,
        rating: 6,
        justification: "From feed",
      })),
      { name: "Jarrod Bowen", team: "home", rating: 8.3, justification: "Wrong match player" },
      { name: "Away Starter 1", team: "home", rating: 7.5, justification: "Wrong side" },
    ];

    const reconciled = reconcilePlayerRatings(project, mixed);
    const home = reconciled.filter((row) => row.team === "home");
    const away = reconciled.filter((row) => row.team === "away");

    expect(home).toHaveLength(20);
    expect(home.some((row) => row.name === "Home Starter 12")).toBe(false);
    expect(home.some((row) => row.name === "Home Sub 10")).toBe(false);
    expect(reconciled.some((row) => row.name === "Jarrod Bowen")).toBe(false);
    expect(away.find((row) => row.name === "Away Starter 1")?.team).toBe("away");
    expect(away.find((row) => row.name === "Away Starter 1")?.position).toBe("GK");
  });
});

describe("reconcileOptaPlayerData", () => {
  it("swaps sides when WhoScored home/away is inverted vs SixLogic", () => {
    const project = makeProject();
    const opta: OptaPlayerIntelligence = {
      sourceProvider: "whoscored",
      sourceUrl: "https://example.com",
      externalMatchId: "1",
      homeTeam: "Brighton and Hove Albion",
      awayTeam: "Leeds United",
      players: [
        { name: "Dominic Calvert-Lewin", team: "home", teamName: "Brighton", summary: { rating: 8.1 }, offensive: {}, defensive: {}, passing: {} },
        { name: "Ethan Ampadu", team: "home", teamName: "Brighton", summary: { rating: 7.0 }, offensive: {}, defensive: {}, passing: {} },
        { name: "Illan Meslier", team: "home", teamName: "Brighton", summary: { rating: 6.9 }, offensive: {}, defensive: {}, passing: {} },
        { name: "Wilfried Gnonto", team: "home", teamName: "Brighton", summary: { rating: 6.5 }, offensive: {}, defensive: {}, passing: {} },
        { name: "Kaoru Mitoma", team: "away", teamName: "Leeds", summary: { rating: 7.4 }, offensive: {}, defensive: {}, passing: {} },
        { name: "Joao Pedro", team: "away", teamName: "Leeds", summary: { rating: 6.8 }, offensive: {}, defensive: {}, passing: {} },
        { name: "Bart Verbruggen", team: "away", teamName: "Leeds", summary: { rating: 7.1 }, offensive: {}, defensive: {}, passing: {} },
        { name: "Georginio Rutter", team: "away", teamName: "Leeds", summary: { rating: 6.4 }, offensive: {}, defensive: {}, passing: {} },
      ],
      summaryDigest: "",
      partialParse: false,
      importedAt: new Date().toISOString(),
    };

    const reconciled = reconcileOptaPlayerData(project, opta);
    expect(reconciled.players.find((row) => row.name === "Dominic Calvert-Lewin")?.team).toBe("home");
    expect(reconciled.players.find((row) => row.name === "Kaoru Mitoma")?.team).toBe("away");
    expect(reconciled.homeTeam).toBe("Leeds United");
    expect(reconciled.awayTeam).toBe("Brighton and Hove Albion");
  });
});

describe("parseWhoScoredFromHtml", () => {
  it("keeps home and away players separate when a feed response contains both team IDs", () => {
    const parsed = parseWhoScoredFromHtml(
      "<html><head><title>Leeds United 2-1 West Ham United - Live</title></head><body></body></html>",
      "https://www.whoscored.com/matches/1903453/livestatistics/leeds-united-west-ham-united",
      [
        {
          url: "https://www.whoscored.com/statisticsfeed/1/GetMatchCentrePlayerStatistics?category=summary&teamIds=10,20",
          data: {
            playerTableStats: [
              { name: "Ethan Ampadu", teamId: 10, rating: 7.1, playedPositionsShort: "MC" },
              { name: "Jarrod Bowen", teamId: 20, rating: 8.3, playedPositionsShort: "AMR" },
            ],
          },
        },
      ],
    );

    expect(parsed.players.find((row) => row.name === "Ethan Ampadu")?.team).toBe("home");
    expect(parsed.players.find((row) => row.name === "Ethan Ampadu")?.teamName).toBe("Leeds United");
    expect(parsed.players.find((row) => row.name === "Jarrod Bowen")?.team).toBe("away");
    expect(parsed.players.find((row) => row.name === "Jarrod Bowen")?.teamName).toBe("West Ham United");
  });
});
