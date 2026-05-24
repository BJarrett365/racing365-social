import "server-only";

import {
  completeMatchReportJobAny,
  failMatchReportJobAny,
  markMatchReportJobRunningAny,
} from "@/app/lib/match-report/jobs";
import { runPlayerIntelligenceJob } from "@/app/lib/match-report/player-intelligence";
import { ensureFreshWorldCupStandingsById } from "@/app/lib/match-report/refresh-live-standings";
import { getMatchReportRepository } from "@/app/lib/match-report/store";

export async function runMatchReportPlayerIntelligenceJob(projectId: string, jobId: string): Promise<void> {
  const repo = getMatchReportRepository();
  const project = await ensureFreshWorldCupStandingsById(repo, projectId);
  if (!project) throw new Error("Project not found");
  await markMatchReportJobRunningAny(jobId, "Generating player ratings…");
  const playerIntelligence = await runPlayerIntelligenceJob(project);
  await repo.setPlayerIntelligence(projectId, playerIntelligence);
  await completeMatchReportJobAny(jobId, undefined, { playerIntelligence });
}
