import { isMatchPreview } from "@/app/lib/match-report/content-type";
import { runGeneratePreviewMediaJob } from "@/app/lib/match-report/generate-preview-media";
import { runGenerateReportMediaJob } from "@/app/lib/match-report/generate-report-media";
import type { MatchReportProject, MediaOutputs } from "@/app/lib/match-report/types";

export async function runGenerateMediaJob(
  project: MatchReportProject,
  opts?: { includeSixteenConclusions?: boolean },
): Promise<MediaOutputs> {
  if (isMatchPreview(project)) {
    return runGeneratePreviewMediaJob(project);
  }
  return runGenerateReportMediaJob(project, opts);
}
