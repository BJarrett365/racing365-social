import { describe, expect, it } from "vitest";
import { matchReportBrandStylePacketForTarget } from "@/app/lib/match-report/brand-knowledge";

describe("match report brand style packets", () => {
  it("provides deep Football365 report guidance beyond the short UI label", () => {
    const packet = matchReportBrandStylePacketForTarget("football365");
    expect(packet).toContain("FOOTBALL365 MATCH REPORT STYLE PACKET");
    expect(packet).toContain("opinionated");
    expect(packet).toContain("Stats use");
    expect(packet.length).toBeGreaterThan(500);
  });
});
