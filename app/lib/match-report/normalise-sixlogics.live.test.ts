import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assessSixLogicHealth, normaliseSixLogicFoundation } from "@/app/lib/match-report/normalise-sixlogics";
import { fetchSportccFixture } from "@/app/lib/data-studio/sixlogics-fixture";

try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const key = line.slice(0, i);
    if (!process.env[key]) process.env[key] = line.slice(i + 1);
  }
} catch {
  // optional for CI without credentials
}

const LIVE_MATCH_ID = "3177321";
const hasCreds = Boolean(process.env.SIXLOGICS_USER_ID?.trim() && process.env.SIXLOGICS_PASS?.trim());

describe.runIf(hasCreds)("SixLogic live preview fixture", () => {
  it("imports Mexico vs South Africa pre-match preview without scores", async () => {
    const { payload, endpoint } = await fetchSportccFixture({ sportId: "1", matchId: LIVE_MATCH_ID });
    expect(endpoint).toBe("Match");

    const foundation = normaliseSixLogicFoundation({
      payload,
      matchId: LIVE_MATCH_ID,
      sportId: "1",
    });

    expect(foundation.facts.homeTeam).not.toBe("Home");
    expect(foundation.facts.awayTeam).not.toBe("Away");
    expect(foundation.facts.competition).not.toBe("Unknown competition");

    const previewHealth = assessSixLogicHealth(foundation, { contentType: "match_preview" });
    expect(previewHealth.ok).toBe(true);
    expect(previewHealth.missingCore).toEqual([]);
  }, 60_000);
});
