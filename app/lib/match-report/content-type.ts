import type { MatchReportContentType, MatchReportProject } from "@/app/lib/match-report/types";

export const MATCH_REPORT_CONTENT_TYPE: MatchReportContentType = "match_report";
export const MATCH_PREVIEW_CONTENT_TYPE: MatchReportContentType = "match_preview";

export function isMatchPreview(project: Pick<MatchReportProject, "contentType">): boolean {
  return project.contentType === "match_preview";
}

export function isMatchReport(project: Pick<MatchReportProject, "contentType">): boolean {
  return project.contentType === "match_report";
}

export function contentTypeLabel(contentType: MatchReportContentType): string {
  return contentType === "match_preview" ? "Match preview" : "Match report";
}

export function contentTypeShortLabel(contentType: MatchReportContentType): string {
  return contentType === "match_preview" ? "Preview" : "Report";
}

export function defaultEditorialContentStyle(
  contentType: MatchReportContentType,
): "Match report" | "Match preview" {
  return contentType === "match_preview" ? "Match preview" : "Match report";
}

export function parseContentTypeParam(value: string | null | undefined): MatchReportContentType {
  return value?.trim() === "match_preview" ? "match_preview" : "match_report";
}
