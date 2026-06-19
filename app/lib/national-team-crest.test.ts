import { describe, expect, it } from "vitest";
import { nationalTeamCrestUrl } from "@/app/lib/national-team-crest";
import { sport365MatchStatusLabel } from "@/app/lib/match-report/parse-sport365-match-page-summary";

describe("national-team-crest", () => {
  it("returns flag URLs for World Cup teams", () => {
    expect(nationalTeamCrestUrl("USA")).toContain("/us.png");
    expect(nationalTeamCrestUrl("Paraguay")).toContain("/py.png");
    expect(nationalTeamCrestUrl("Algeria")).toContain("/dz.png");
    expect(nationalTeamCrestUrl("Argentina")).toContain("/ar.png");
  });
});

describe("sport365MatchStatusLabel", () => {
  it("maps full-time Sport365 status to Finished", () => {
    expect(sport365MatchStatusLabel({ statusCode: 6, statusTxt: "90+9'" })).toBe("Finished");
  });
});
