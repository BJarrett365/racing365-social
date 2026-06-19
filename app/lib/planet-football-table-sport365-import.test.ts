import { describe, expect, it } from "vitest";
import { importSport365GroupTablesForTemplate } from "@/app/lib/planet-football-table-sport365-import";

const MATCH_URL =
  "https://www.sport365.com/football/world-cup/group-stage/usa-vs-paraguay/1-4109485";

describe("importSport365GroupTablesForTemplate", () => {
  it("returns group tables and match score for a Sport365 match URL", async () => {
    const result = await importSport365GroupTablesForTemplate(MATCH_URL);
    expect(result.groupTables.length).toBeGreaterThan(0);
    expect(result.data.rows.length).toBeGreaterThan(0);
    expect(result.matchContext?.homeTeam).toBe("USA");
    expect(result.matchContext?.awayTeam).toBe("Paraguay");
    expect(result.matchContext?.homeScore).toBe(4);
    expect(result.matchContext?.awayScore).toBe(1);
  }, 30_000);
});
