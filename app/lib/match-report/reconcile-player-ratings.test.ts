import { describe, expect, it } from "vitest";
import type { MatchReportProject, PlayerRatingEntry } from "@/app/lib/match-report/types";
import type { OptaPlayerIntelligence } from "@/app/lib/match-report/opta-player-types";
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
    expect(reconciled.filter((row) => row.team === "home").map((row) => row.name)).toEqual([
      "Dominic Calvert-Lewin",
      "Ethan Ampadu",
    ]);
    expect(reconciled.filter((row) => row.team === "away").map((row) => row.name)).toEqual([
      "Kaoru Mitoma",
      "Joao Pedro",
    ]);
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
