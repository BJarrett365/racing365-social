import "server-only";

import {
  completeMatchReportJobAny,
  failMatchReportJobAny,
  markMatchReportJobRunningAny,
} from "@/app/lib/match-report/jobs";
import { syncMatchReportToLanguageStudio } from "@/app/lib/match-report/language-studio-bridge";
import { runGenerateMediaJob } from "@/app/lib/match-report/generate-media";
import { ensureFreshWorldCupStandingsById } from "@/app/lib/match-report/refresh-live-standings";
import { getMatchReportRepository } from "@/app/lib/match-report/store";

export async function runMatchReportGenerateMediaJob(
  projectId: string,
  jobId: string,
  opts?: { includeSixteenConclusions?: boolean },
): Promise<void> {
  const repo = getMatchReportRepository();
  const project = await ensureFreshWorldCupStandingsById(repo, projectId);
  if (!project) throw new Error("Project not found");
  await markMatchReportJobRunningAny(jobId, "AI is writing the report…");
  const media = await runGenerateMediaJob(project, opts);
  const withMedia = await repo.setMediaOutputs(projectId, media);
  try {
    const synced = await syncMatchReportToLanguageStudio(withMedia);
    await repo.attachLanguageStudioArticle(projectId, {
      articleId: synced.articleId,
      importId: synced.importId,
      rewriteUrl: synced.rewriteUrl,
    });
  } catch (e) {
    console.error("[match-report] Language Studio sync failed after media generation", e);
  }
  await completeMatchReportJobAny(jobId, undefined, { mediaOutputs: media });
}
