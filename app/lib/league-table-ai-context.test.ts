import { describe, expect, it } from "vitest";
import { formatLeagueTableAiContext } from "@/app/lib/league-table-ai-context";
import type { GeneratedContent } from "@/types";

describe("league-table-ai-context", () => {
  it("formats standings from planet-football-table bundle for AI", () => {
    const content: GeneratedContent = {
      format: "planet-football-table",
      headline: "Group D standings",
      caption: "",
      script: "",
      scenes: [
        {
          id: "intro",
          templateId: "planet-football-intro",
          durationSec: 2,
          captionLine: "Group D is heating up!",
          data: {},
        },
        {
          id: "table-1",
          templateId: "planet-football-table",
          durationSec: 4,
          captionLine: "Group D table",
          data: {
            rows: [
              { position: 1, team: "USA", played: 1, won: 1, drawn: 0, lost: 0, pointsDifference: "+3", points: 3 },
            ],
          },
        },
      ],
      templateSource: {
        format: "planet-football-table",
        bundle: {
          id: "t1",
          table: {
            source: "Sport365",
            sourceUrl: "https://www.sport365.com/example",
            competition: "Group D · Group Stage",
            groupCode: "D",
            columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
            rows: [
              { position: 1, team: "USA", played: 1, won: 1, drawn: 0, lost: 0, pointsDifference: "+3", points: 3 },
              { position: 2, team: "Australia", played: 0, won: 0, drawn: 0, lost: 0, pointsDifference: "0", points: 0 },
              { position: 3, team: "Turkey", played: 0, won: 0, drawn: 0, lost: 0, pointsDifference: "0", points: 0 },
              { position: 4, team: "Paraguay", played: 1, won: 0, drawn: 0, lost: 1, pointsDifference: "-3", points: 0 },
            ],
          },
        } as GeneratedContent["templateSource"] extends { format: "planet-football-table"; bundle: infer B } ? B : never,
      },
    };

    const block = formatLeagueTableAiContext(content);
    expect(block).toContain("USA");
    expect(block).toContain("Paraguay");
    expect(block).toContain("Australia");
    expect(block).not.toContain("Portugal");
    expect(block).not.toContain("Ghana");
  });

  it("includes match score and scorers for AI when matchContext is present", () => {
    const content: GeneratedContent = {
      format: "planet-football-table",
      headline: "Group D standings",
      caption: "",
      script: "",
      scenes: [],
      templateSource: {
        format: "planet-football-table",
        bundle: {
          id: "t1",
          table: {
            source: "Sport365",
            sourceUrl: "https://www.sport365.com/example",
            competition: "Group D · Group Stage",
            groupCode: "D",
            columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
            rows: [{ position: 1, team: "USA", played: 1, won: 1, drawn: 0, lost: 0, pointsDifference: "+3", points: 3 }],
          },
          matchContext: {
            sourceUrl: "https://www.sport365.com/example",
            homeTeam: "USA",
            awayTeam: "Paraguay",
            homeScore: 4,
            awayScore: 1,
            statusLabel: "Finished",
            scorers: [
              { minuteLabel: "31'", player: "Folarin Balogun", type: "goal", team: "USA" },
              { minuteLabel: "73'", player: "Mauricio", type: "goal", team: "Paraguay" },
            ],
          },
        } as GeneratedContent["templateSource"] extends { format: "planet-football-table"; bundle: infer B } ? B : never,
      },
    };

    const block = formatLeagueTableAiContext(content);
    expect(block).toContain("=== MATCH RESULT ===");
    expect(block).toContain("Folarin Balogun");
    expect(block).toContain("Mauricio");
    expect(block).toContain("4");
    expect(block).toContain("=== STANDINGS ON SCREEN ===");
  });
});
