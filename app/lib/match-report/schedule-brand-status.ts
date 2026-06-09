import type {
  MatchReportContentType,
  MatchReportTargetBrand,
  SavedReportIndexEntry,
} from "@/app/lib/match-report/types";
import { fixtureTeamsMatch } from "@/app/lib/match-report/wc2026-schedule";

export type ScheduleContentStatus = "not_started" | "in_progress" | "complete";

export type ScheduleBrandContentStatus = {
  brand: MatchReportTargetBrand;
  contentType: MatchReportContentType;
  status: ScheduleContentStatus;
  projectId?: string;
  displayLabel?: string;
  updatedAt?: string;
};

export type ScheduleBrandDualStatus = {
  brand: MatchReportTargetBrand;
  preview: ScheduleBrandContentStatus;
  report: ScheduleBrandContentStatus;
};

function statusFromIndexEntry(
  brand: MatchReportTargetBrand,
  contentType: MatchReportContentType,
  entries: SavedReportIndexEntry[],
  homeTeam: string,
  awayTeam: string,
): ScheduleBrandContentStatus {
  const match = entries.find(
    (entry) =>
      entry.targetBrand === brand &&
      entry.contentType === contentType &&
      fixtureTeamsMatch(homeTeam, awayTeam, entry.homeTeam, entry.awayTeam),
  );
  if (!match) return { brand, contentType, status: "not_started" };
  if (match.reportCompleted) {
    return {
      brand,
      contentType,
      status: "complete",
      projectId: match.projectId,
      displayLabel: match.displayLabel,
      updatedAt: match.updatedAt,
    };
  }
  return {
    brand,
    contentType,
    status: "in_progress",
    projectId: match.projectId,
    displayLabel: match.displayLabel,
    updatedAt: match.updatedAt,
  };
}

export function buildScheduleBrandDualStatus(
  brand: MatchReportTargetBrand,
  entries: SavedReportIndexEntry[],
  homeTeam: string,
  awayTeam: string,
): ScheduleBrandDualStatus {
  return {
    brand,
    preview: statusFromIndexEntry(brand, "match_preview", entries, homeTeam, awayTeam),
    report: statusFromIndexEntry(brand, "match_report", entries, homeTeam, awayTeam),
  };
}

export function buildScheduleBrandDualStatuses(
  brands: MatchReportTargetBrand[],
  entries: SavedReportIndexEntry[],
  homeTeam: string,
  awayTeam: string,
): ScheduleBrandDualStatus[] {
  return brands.map((brand) => buildScheduleBrandDualStatus(brand, entries, homeTeam, awayTeam));
}

export function aggregateDualStatus(rows: ScheduleBrandDualStatus[]): {
  preview: ScheduleContentStatus;
  report: ScheduleContentStatus;
} {
  const agg = (contentType: MatchReportContentType): ScheduleContentStatus => {
    const statuses = rows.map((row) => (contentType === "match_preview" ? row.preview.status : row.report.status));
    if (statuses.some((s) => s === "complete")) return "complete";
    if (statuses.some((s) => s === "in_progress")) return "in_progress";
    return "not_started";
  };
  return { preview: agg("match_preview"), report: agg("match_report") };
}
