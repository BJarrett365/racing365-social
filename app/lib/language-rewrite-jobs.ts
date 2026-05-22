import { readJsonBlob, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import type { LanguageTranslation } from "@/app/lib/language-studio/types";

const STORE = "language-rewrite-jobs";

export type LanguageRewriteJobRecord = {
  status: "pending" | "running" | "completed" | "failed";
  createdAt: number;
  updatedAt: number;
  totalArticles?: number;
  completedArticles?: number;
  phase?: string;
  error?: string;
  rewrites?: LanguageTranslation[];
};

export const STALE_RUNNING_REWRITE_JOB_MS = 180_000;
export const STALE_PENDING_REWRITE_JOB_MS = 90_000;

export function isStaleRunningRewriteJob(job: LanguageRewriteJobRecord): boolean {
  return job.status === "running" && Date.now() - job.updatedAt > STALE_RUNNING_REWRITE_JOB_MS;
}

export function isStalePendingRewriteJob(job: LanguageRewriteJobRecord): boolean {
  return job.status === "pending" && Date.now() - job.createdAt > STALE_PENDING_REWRITE_JOB_MS;
}

export async function createLanguageRewriteJob(jobId: string, totalArticles: number): Promise<void> {
  const now = Date.now();
  await writeJsonBlob<LanguageRewriteJobRecord>(STORE, jobId, {
    status: "pending",
    createdAt: now,
    updatedAt: now,
    totalArticles,
    completedArticles: 0,
  });
}

export async function getLanguageRewriteJob(jobId: string): Promise<LanguageRewriteJobRecord | null> {
  return readJsonBlob<LanguageRewriteJobRecord>(STORE, jobId);
}

export async function markLanguageRewriteJobRunning(jobId: string, phase?: string): Promise<void> {
  const current = await getLanguageRewriteJob(jobId);
  if (!current) return;
  await writeJsonBlob<LanguageRewriteJobRecord>(STORE, jobId, {
    ...current,
    status: "running",
    phase,
    updatedAt: Date.now(),
  });
}

export async function touchLanguageRewriteJobProgress(
  jobId: string,
  completedArticles: number,
  phase?: string,
): Promise<void> {
  const current = await getLanguageRewriteJob(jobId);
  if (!current || current.status === "completed" || current.status === "failed") return;
  await writeJsonBlob<LanguageRewriteJobRecord>(STORE, jobId, {
    ...current,
    status: "running",
    completedArticles,
    phase,
    updatedAt: Date.now(),
  });
}

export async function completeLanguageRewriteJob(
  jobId: string,
  rewrites: LanguageTranslation[],
): Promise<void> {
  const current = await getLanguageRewriteJob(jobId);
  const now = Date.now();
  await writeJsonBlob<LanguageRewriteJobRecord>(STORE, jobId, {
    ...(current ?? { createdAt: now, totalArticles: rewrites.length }),
    status: "completed",
    rewrites,
    completedArticles: rewrites.length,
    phase: "completed",
    updatedAt: now,
  });
}

export async function failLanguageRewriteJob(jobId: string, error: string): Promise<void> {
  const current = await getLanguageRewriteJob(jobId);
  const now = Date.now();
  await writeJsonBlob<LanguageRewriteJobRecord>(STORE, jobId, {
    ...(current ?? { createdAt: now }),
    status: "failed",
    error: error.trim().slice(0, 500),
    updatedAt: now,
  });
}

export async function resolveStaleLanguageRewriteJob(jobId: string): Promise<LanguageRewriteJobRecord | null> {
  const job = await getLanguageRewriteJob(jobId);
  if (!job) return null;
  if (isStalePendingRewriteJob(job)) {
    await failLanguageRewriteJob(
      jobId,
      "Background rewrite worker never started — check Netlify function logs or redeploy, then try again.",
    );
    return getLanguageRewriteJob(jobId);
  }
  if (isStaleRunningRewriteJob(job)) {
    await failLanguageRewriteJob(
      jobId,
      "Rewrite stopped unexpectedly — the host likely timed out. Try one article at a time after the latest deploy.",
    );
    return getLanguageRewriteJob(jobId);
  }
  return job;
}
