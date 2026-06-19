import { isMatchPreview } from "@/app/lib/match-report/content-type";
import { runDeepSeekEditorialReview } from "@/app/lib/match-report/deepseek-editorial-review";
import type {
  DeepSeekEditorialReview,
  EditorialPublishGate,
  EditorialScoreResult,
  EditorialSectionLintResult,
} from "@/app/lib/match-report/mio/types";
import { evaluateEditorialPublishGate } from "@/app/lib/match-report/preview-publish-gate";
import { scorePreviewEditorial } from "@/app/lib/match-report/preview-editorial-score";
import { lintPreviewSections } from "@/app/lib/match-report/preview-section-lint";
import { scoreReportEditorial } from "@/app/lib/match-report/report-editorial-score";
import { lintReportSections } from "@/app/lib/match-report/report-section-lint";
import type { MatchReportProject } from "@/app/lib/match-report/types";

export type EditorialReviewResult = {
  editorialScore: EditorialScoreResult;
  sectionLint: EditorialSectionLintResult;
  deepseekReview: DeepSeekEditorialReview | null;
  publishGate: EditorialPublishGate;
  deepseekError?: string;
};

function articleHtml(project: MatchReportProject): string {
  const media = project.mediaOutputs!;
  return [media.headline, media.standfirst, media.reportHtml].filter(Boolean).join("\n");
}

export async function runEditorialReview(
  project: MatchReportProject,
  options?: { includeDeepSeek?: boolean },
): Promise<EditorialReviewResult> {
  if (!project.mediaOutputs) {
    throw new Error("Generate media outputs before editorial review.");
  }

  const html = articleHtml(project);
  const sectionLint = isMatchPreview(project) ? lintPreviewSections(html) : lintReportSections(html);
  const editorialScore = isMatchPreview(project)
    ? scorePreviewEditorial(project, html)
    : scoreReportEditorial(project, html);

  let deepseekReview: DeepSeekEditorialReview | null = null;
  let deepseekError: string | undefined;
  if (options?.includeDeepSeek !== false) {
    try {
      deepseekReview = await runDeepSeekEditorialReview(project, html);
    } catch (e) {
      deepseekError = e instanceof Error ? e.message : "DeepSeek review unavailable";
    }
  }

  const publishGate = evaluateEditorialPublishGate(project, editorialScore);

  return { editorialScore, sectionLint, deepseekReview, publishGate, deepseekError };
}

export function getProjectEditorialScore(project: MatchReportProject): EditorialScoreResult | null {
  return project.previewEditorialScore ?? project.reportEditorialScore ?? null;
}
