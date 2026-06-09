import { describe, expect, it } from "vitest";
import {
  aggregateDualStatus,
  buildScheduleBrandDualStatus,
  buildScheduleBrandDualStatuses,
} from "@/app/lib/match-report/schedule-brand-status";
import type { SavedReportIndexEntry } from "@/app/lib/match-report/types";

const entries: SavedReportIndexEntry[] = [
  {
    projectId: "preview-1",
    targetBrand: "football365",
    contentType: "match_preview",
    homeTeam: "Arsenal",
    awayTeam: "Burnley",
    displayLabel: "Arsenal vs Burnley · Preview",
    reportCompleted: false,
    updatedAt: "2026-05-28T10:00:00.000Z",
    matchId: "1",
    sport: "football",
    competition: "Premier League",
  },
  {
    projectId: "report-1",
    targetBrand: "football365",
    contentType: "match_report",
    homeTeam: "Arsenal",
    awayTeam: "Burnley",
    displayLabel: "Arsenal 2-0 Burnley",
    reportCompleted: true,
    updatedAt: "2026-05-29T10:00:00.000Z",
    matchId: "1",
    sport: "football",
    competition: "Premier League",
  },
];

describe("schedule-brand-status", () => {
  it("tracks preview and report separately per brand", () => {
    const dual = buildScheduleBrandDualStatus("football365", entries, "Arsenal", "Burnley");
    expect(dual.preview.status).toBe("in_progress");
    expect(dual.preview.projectId).toBe("preview-1");
    expect(dual.report.status).toBe("complete");
    expect(dual.report.projectId).toBe("report-1");
  });

  it("builds dual statuses for all schedule brands", () => {
    const rows = buildScheduleBrandDualStatuses(
      ["football365", "teamtalk"],
      entries,
      "Arsenal",
      "Burnley",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.brand).toBe("football365");
    expect(rows[1]?.brand).toBe("teamtalk");
    expect(rows[1]?.preview.status).toBe("not_started");
  });

  it("aggregates dual status across brands", () => {
    const rows = buildScheduleBrandDualStatuses(
      ["football365", "teamtalk"],
      entries,
      "Arsenal",
      "Burnley",
    );
    const agg = aggregateDualStatus(rows);
    expect(agg.preview).toBe("in_progress");
    expect(agg.report).toBe("complete");
  });
});
