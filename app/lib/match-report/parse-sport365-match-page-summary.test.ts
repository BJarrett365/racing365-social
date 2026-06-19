import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  formatSport365MatchScoreLine,
  formatSport365ScorersLine,
  parseSport365MatchPageSummaryFromHtml,
  sanitizeSport365Scorers,
} from "@/app/lib/match-report/parse-sport365-match-page-summary";

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "sport365-usa-paraguay-next-data.html");

describe("parse-sport365-match-page-summary", () => {
  it("parses score and scorers from Sport365 match page HTML", async () => {
    let html = "";
    try {
      html = readFileSync(FIXTURE, "utf8");
    } catch {
      const res = await fetch(
        "https://www.sport365.com/football/world-cup/group-stage/usa-vs-paraguay/1-4109485",
        { headers: { "User-Agent": "PlanetSportStudio/1.0" } },
      );
      html = await res.text();
    }
    const summary = parseSport365MatchPageSummaryFromHtml(
      html,
      "https://www.sport365.com/football/world-cup/group-stage/usa-vs-paraguay/1-4109485",
    );
    expect(summary).not.toBeNull();
    expect(summary!.homeTeam).toBe("USA");
    expect(summary!.awayTeam).toBe("Paraguay");
    expect(summary!.homeScore).toBe(4);
    expect(summary!.awayScore).toBe(1);
    expect(summary!.statusLabel).toBe("Finished");
    expect(summary!.homeLogoUrl).toContain("flagcdn.com");
    expect(summary!.scorers.length).toBeGreaterThanOrEqual(4);
    expect(summary!.scorers.length).toBeLessThanOrEqual(6);
    for (const scorer of summary!.scorers) {
      expect(scorer.player).not.toMatch(/goal kick|assist|pass for the goal|defensive bl|^G\s*(?:O\s*)+/i);
    }
    expect(summary!.scorers.some((s) => s.player === "Folarin Balogun")).toBe(true);
    expect(summary!.scorers.find((s) => s.player === "Mauricio")?.team).toBe("Paraguay");
    expect(summary!.scorers.find((s) => s.player === "Giovanni Reyna")?.team).toBe("USA");
    expect(formatSport365MatchScoreLine(summary!)).toContain("USA 4");
    expect(formatSport365ScorersLine(summary!)).toMatch(/Balogun|Reyna|Mauricio/i);
    expect(summary!.commentaryDigest).toMatch(/GOAL|whistle/i);
  });

  it("normalizes legacy GOAL-prefixed scorer rows instead of dropping them", () => {
    const cleaned = sanitizeSport365Scorers([
      { minuteLabel: "31'", player: "G O O O A A A L - Folarin Balogun", type: "goal", team: "USA" },
      { minuteLabel: "7'", player: "Damian Bobadilla", type: "own_goal", team: "USA" },
    ]);
    expect(cleaned).toHaveLength(2);
    expect(cleaned[0]?.player).toBe("Folarin Balogun");
  });
});
