import { isMatchPreview } from "@/app/lib/match-report/content-type";
import { runMatchReportFactCheck } from "@/app/lib/match-report/fact-check";
import {
  previewFactCheckToMatchReportFactCheck,
  runPreviewFactCheck,
} from "@/app/lib/match-report/preview-fact-check";
import { runEditorialReview, type EditorialReviewResult } from "@/app/lib/match-report/run-editorial-review";
import type { MatchReportRepository } from "@/app/lib/match-report/store";
import type { MatchReportFactCheck, MatchReportProject } from "@/app/lib/match-report/types";

export function runProjectFactCheck(project: MatchReportProject): MatchReportFactCheck {
  if (!project.mediaOutputs) {
    throw new Error("Generate media outputs before fact-checking.");
  }
  if (isMatchPreview(project)) {
    return previewFactCheckToMatchReportFactCheck(
      project,
      project.mediaOutputs,
      runPreviewFactCheck(project, project.mediaOutputs),
    );
  }
  return runMatchReportFactCheck(project);
}

export async function persistFactCheckAndEditorialReview(
  repo: MatchReportRepository,
  projectId: string,
  factCheck?: MatchReportFactCheck,
): Promise<{
  project: MatchReportProject;
  factCheck: MatchReportFactCheck;
  editorialReview: EditorialReviewResult;
  deepseekError?: string;
}> {
  const project = await repo.getProject(projectId);
  if (!project) throw new Error("Project not found.");
  const resolvedFactCheck = factCheck ?? runProjectFactCheck(project);
  let updated = await repo.setFactCheck(projectId, resolvedFactCheck);
  const editorial = await runEditorialReview(updated, { includeDeepSeek: true });
  updated = await repo.setEditorialReview(projectId, {
    editorialScore: editorial.editorialScore,
    sectionLint: editorial.sectionLint,
    publishGate: editorial.publishGate,
    deepseekReview: editorial.deepseekReview,
  });
  return {
    project: updated,
    factCheck: resolvedFactCheck,
    editorialReview: editorial,
    deepseekError: editorial.deepseekError,
  };
}
