import "server-only";

import { runBuildPictureJob } from "@/app/lib/match-report/build-picture";
import { buildImportLayerSummaries } from "@/app/lib/match-report/import-layer-summaries";
import {
  completeMatchReportJobAny,
  failMatchReportJobAny,
  markMatchReportJobRunningAny,
} from "@/app/lib/match-report/jobs";
import { ensureFreshWorldCupStandingsById } from "@/app/lib/match-report/refresh-live-standings";
import { getMatchReportRepository } from "@/app/lib/match-report/store";

export async function runMatchReportBuildPictureJob(jobId: string, projectId: string): Promise<void> {
  const repo = getMatchReportRepository();
  const project = await ensureFreshWorldCupStandingsById(repo, projectId);
  if (!project) {
    await failMatchReportJobAny(jobId, "Project not found.");
    return;
  }
  try {
    await markMatchReportJobRunningAny(jobId, "Building event picture…");
    const eventPicture = {
      ...(await runBuildPictureJob(project)),
      layerSummaries: buildImportLayerSummaries(project),
    };
    await repo.setEventPicture(projectId, eventPicture);
    await completeMatchReportJobAny(jobId, eventPicture);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Build Picture failed.";
    await failMatchReportJobAny(jobId, message);
    throw e;
  }
}
