import { describe, expect, it } from "vitest";
import { lintPreviewSections } from "@/app/lib/match-report/preview-section-lint";

const FULL_PREVIEW = `
<h1>Arsenal v Chelsea preview</h1>
<h2>The Story</h2><p>Hook</p>
<h2>State Of Play</h2><p>Stakes</p>
<h2>Form Guide With Context</h2><p>Form</p>
<h2>Tactical Preview</h2><p>Tactics</p>
<h2>Key Battles</h2><p>Battles</p>
<h2>Team News</h2><p>News</p>
<h2>Predicted Lineups</h2><p>XI</p>
<h2>What Could Decide The Match</h2><p>Factors</p>
<h2>AI Prediction</h2><p>Pick</p>
<h2>Football365 Verdict</h2><p>Verdict</p>
<h2>What Happens Next</h2><p>Next</p>
`;

describe("lintPreviewSections", () => {
  it("passes when all 11 sections present", () => {
    const result = lintPreviewSections(FULL_PREVIEW);
    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("flags missing sections", () => {
    const result = lintPreviewSections("<h1>Title</h1><h2>The Story</h2><p>x</p>");
    expect(result.ok).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
