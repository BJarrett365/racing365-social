import { describe, expect, it } from "vitest";
import { lintReportSections } from "@/app/lib/match-report/report-section-lint";

describe("lintReportSections", () => {
  it("passes Report 2.0 structure", () => {
    const html = `
      <h1>Brighton 0-3 Manchester United</h1>
      <h2>The Story</h2><p>Hook.</p>
      <h2>Turning Point</h2><p>Moment.</p>
      <h2>How The Match Was Won</h2><p>Tactics.</p>
      <h2>Key Battles</h2><p>Duels.</p>
      <h2>Standout Players</h2><p>Stars.</p>
      <h2>What It Means</h2><p>Table.</p>
      <h2>What Happens Next</h2><p>Fixture.</p>
      <h2>Football365 Verdict</h2><p>Take.</p>
    `;
    const lint = lintReportSections(html);
    expect(lint.ok).toBe(true);
    expect(lint.missing).toHaveLength(0);
  });

  it("flags legacy Match Analysis template", () => {
    const html = `
      <h2>Match Summary</h2><p>x</p>
      <h2>Match Analysis</h2><p>x</p>
      <h2>Extended Report</h2><p>x</p>
    `;
    const lint = lintReportSections(html);
    expect(lint.ok).toBe(false);
    expect(lint.missing).toContain("Turning Point");
    expect(lint.missing).toContain("What Happens Next");
    expect(lint.notes.some((n) => n.includes("legacy"))).toBe(true);
  });
});
