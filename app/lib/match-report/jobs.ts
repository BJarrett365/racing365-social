import fs from "fs/promises";
import path from "path";
import { localJsonStorePath } from "@/app/lib/local-json-store-dir";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import type { EventPicture, MediaOutputs, PlayerIntelligence } from "@/app/lib/match-report/types";

const STORE = "match-report-jobs";
const LOCAL_JOBS_DIR = localJsonStorePath("plexa-match-report/jobs");

export type MatchReportJobKind = "build_picture" | "player_intelligence" | "generate_media";

export type MatchReportJobRecord = {
  kind: MatchReportJobKind;
  projectId: string;
  status: "pending" | "running" | "completed" | "failed";
  phase?: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
  eventPicture?: EventPicture;
  playerIntelligence?: PlayerIntelligence;
  mediaOutputs?: MediaOutputs;
};

export const STALE_RUNNING_JOB_MS = 180_000;
export const STALE_PENDING_JOB_MS = 90_000;

const localJobs = new Map<string, MatchReportJobRecord>();

const STATUS_RANK: Record<MatchReportJobRecord["status"], number> = {
  pending: 0,
  running: 1,
  failed: 2,
  completed: 3,
};

function localJobPath(jobId: string): string {
  return path.join(LOCAL_JOBS_DIR, `${jobId}.json`);
}

async function readLocalDiskJob(jobId: string): Promise<MatchReportJobRecord | null> {
  if (shouldUseNetlifyBlobStore()) return null;
  try {
    const raw = await fs.readFile(localJobPath(jobId), "utf-8");
    return JSON.parse(raw) as MatchReportJobRecord;
  } catch {
    return null;
  }
}

async function writeLocalDiskJob(jobId: string, record: MatchReportJobRecord): Promise<void> {
  if (shouldUseNetlifyBlobStore()) return;
  await fs.mkdir(LOCAL_JOBS_DIR, { recursive: true });
  await fs.writeFile(localJobPath(jobId), JSON.stringify(record, null, 2), "utf-8");
}

function mergeJobRecords(
  a: MatchReportJobRecord | null,
  b: MatchReportJobRecord | null,
): MatchReportJobRecord | null {
  if (!a) return b;
  if (!b) return a;
  const aRank = STATUS_RANK[a.status];
  const bRank = STATUS_RANK[b.status];
  if (aRank !== bRank) return aRank > bRank ? a : b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

function writeLocalJob(jobId: string, record: MatchReportJobRecord): void {
  localJobs.set(jobId, record);
  void writeLocalDiskJob(jobId, record);
}

async function writeBlobJob(jobId: string, record: MatchReportJobRecord): Promise<void> {
  if (!shouldUseNetlifyBlobStore()) return;
  try {
    await writeJsonBlob<MatchReportJobRecord>(STORE, jobId, record);
  } catch (error) {
    console.error("[match-report-jobs] blob write failed", {
      jobId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function persistJob(jobId: string, record: MatchReportJobRecord): Promise<void> {
  writeLocalJob(jobId, record);
  await writeBlobJob(jobId, record);
}

export function newMatchReportJobId(kind: MatchReportJobKind): string {
  return `mrj-${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function createMatchReportJobAny(
  jobId: string,
  kind: MatchReportJobKind,
  projectId: string,
): Promise<void> {
  const now = Date.now();
  await persistJob(jobId, { kind, projectId, status: "pending", createdAt: now, updatedAt: now });
}

/** @deprecated Prefer createMatchReportJobAny */
export async function createMatchReportJob(
  jobId: string,
  kind: MatchReportJobKind,
  projectId: string,
): Promise<void> {
  await createMatchReportJobAny(jobId, kind, projectId);
}

/** @deprecated Prefer createMatchReportJobAny */
export async function createMatchReportJobLocal(
  jobId: string,
  kind: MatchReportJobKind,
  projectId: string,
): Promise<void> {
  await createMatchReportJobAny(jobId, kind, projectId);
}

export async function getMatchReportJob(jobId: string): Promise<MatchReportJobRecord | null> {
  return readJsonBlob<MatchReportJobRecord>(STORE, jobId);
}

export async function getMatchReportJobAny(jobId: string): Promise<MatchReportJobRecord | null> {
  const blob = await getMatchReportJob(jobId);
  const memory = localJobs.get(jobId) ?? null;
  const disk = await readLocalDiskJob(jobId);
  return mergeJobRecords(mergeJobRecords(blob, memory), disk);
}

export async function markMatchReportJobRunningAny(jobId: string, phase?: string): Promise<void> {
  const current = await getMatchReportJobAny(jobId);
  if (!current) return;
  await persistJob(jobId, { ...current, status: "running", phase, updatedAt: Date.now() });
}

export async function completeMatchReportJobAny(
  jobId: string,
  eventPicture?: EventPicture,
  extra?: { playerIntelligence?: PlayerIntelligence; mediaOutputs?: MediaOutputs },
): Promise<void> {
  const current = await getMatchReportJobAny(jobId);
  const now = Date.now();
  await persistJob(jobId, {
    ...(current ?? { kind: "build_picture", projectId: "", createdAt: now }),
    status: "completed",
    phase: "completed",
    eventPicture,
    playerIntelligence: extra?.playerIntelligence,
    mediaOutputs: extra?.mediaOutputs,
    updatedAt: now,
  });
}

export async function failMatchReportJobAny(jobId: string, error: string): Promise<void> {
  const current = await getMatchReportJobAny(jobId);
  const now = Date.now();
  await persistJob(jobId, {
    ...(current ?? { kind: "build_picture", projectId: "", createdAt: now }),
    status: "failed",
    error: error.trim().slice(0, 500),
    updatedAt: now,
  });
}

export async function resolveStaleMatchReportJob(jobId: string): Promise<MatchReportJobRecord | null> {
  const job = await getMatchReportJobAny(jobId);
  if (!job) return null;
  if (job.status === "pending" && Date.now() - job.createdAt > STALE_PENDING_JOB_MS) {
    await failMatchReportJobAny(jobId, "Background worker never started.");
    return getMatchReportJobAny(jobId);
  }
  if (job.status === "running" && Date.now() - job.updatedAt > STALE_RUNNING_JOB_MS) {
    await failMatchReportJobAny(jobId, "Background worker timed out.");
    return getMatchReportJobAny(jobId);
  }
  return job;
}

/** @deprecated Prefer completeMatchReportJobAny */
export async function completeMatchReportJob(jobId: string, eventPicture: EventPicture): Promise<void> {
  await completeMatchReportJobAny(jobId, eventPicture);
}

/** @deprecated Prefer failMatchReportJobAny */
export async function failMatchReportJob(jobId: string, error: string): Promise<void> {
  await failMatchReportJobAny(jobId, error);
}

/** @deprecated Prefer markMatchReportJobRunningAny */
export async function markMatchReportJobRunning(jobId: string, phase?: string): Promise<void> {
  await markMatchReportJobRunningAny(jobId, phase);
}
