import { describe, expect, it } from "vitest";
import { normalizeReleaseCheckResult } from "@/app/lib/dev-gateway/release-check";

describe("normalizeReleaseCheckResult", () => {
  it("normalizes release QA output and defaults unsafe enums", () => {
    const result = normalizeReleaseCheckResult({
      releaseSummary: "Added release QA",
      riskLevel: "unknown",
      decision: "SHIP IT",
      changedAreas: ["UI", 123],
      risks: ["Missing env var"],
      smokeTests: "not-array",
      cursorFixPrompt: "Fix the env check",
    });

    expect(result.riskLevel).toBe("medium");
    expect(result.decision).toBe("NEEDS FIXES");
    expect(result.changedAreas).toEqual(["UI", "123"]);
    expect(result.smokeTests).toEqual([]);
    expect(result.adminChecks).toEqual([]);
    expect(result.rollbackPlan.rollbackSteps).toEqual([]);
    expect(result.audit.approvalRequired).toEqual([]);
    expect(result.cursorFixPrompt).toBe("Fix the env check");
  });

  it("maps old release-check decisions into merge-gate decisions", () => {
    expect(normalizeReleaseCheckResult({ decision: "SAFE TO TEST" }).decision).toBe("SAFE TO MERGE");
    expect(normalizeReleaseCheckResult({ decision: "BLOCK RELEASE" }).decision).toBe("BLOCK MERGE");
  });
});
