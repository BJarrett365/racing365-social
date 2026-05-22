import { readJsonBlob, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import type { BuildShortPayload } from "@/app/lib/build-short-service";

const STORE = "video-build-jobs";

export function sanitizeVideoBuildError(message: string): string {
  const trimmed = message.trim();
  if (/inactivity timeout/i.test(trimmed)) {
    return "Video build stopped by hosting inactivity timeout before completion.";
  }
  if (/^<!doctype html|^<html/i.test(trimmed)) {
    return "Video build failed due to a hosting timeout.";
  }
  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed;
}

export type VideoBuildJobRecord = {
  status: "pending" | "running" | "completed" | "failed";
  createdAt: number;
  updatedAt: number;
  contentId?: string;
  error?: string;
  debug?: unknown;
  videoPath?: string;
  srtPath?: string;
  concatPath?: string;
  audioPath?: string;
  voiceProvider?: string;
  voiceFallbackReason?: string;
  seoTitle?: string;
  seoSlug?: string;
};

export async function createVideoBuildJob(jobId: string, contentId: string): Promise<void> {
  const now = Date.now();
  await writeJsonBlob<VideoBuildJobRecord>(STORE, jobId, {
    status: "pending",
    createdAt: now,
    updatedAt: now,
    contentId,
  });
}

export async function getVideoBuildJob(jobId: string): Promise<VideoBuildJobRecord | null> {
  return readJsonBlob<VideoBuildJobRecord>(STORE, jobId);
}

export async function markVideoBuildJobRunning(jobId: string): Promise<void> {
  const current = await getVideoBuildJob(jobId);
  if (!current) return;
  await writeJsonBlob<VideoBuildJobRecord>(STORE, jobId, {
    ...current,
    status: "running",
    updatedAt: Date.now(),
  });
}

export async function completeVideoBuildJob(jobId: string, payload: BuildShortPayload): Promise<void> {
  const current = await getVideoBuildJob(jobId);
  const now = Date.now();
  await writeJsonBlob<VideoBuildJobRecord>(STORE, jobId, {
    ...(current ?? { createdAt: now, contentId: undefined }),
    ...payload,
    status: "completed",
    updatedAt: now,
  });
}

export async function failVideoBuildJob(jobId: string, error: string, debug?: unknown): Promise<void> {
  const current = await getVideoBuildJob(jobId);
  const now = Date.now();
  await writeJsonBlob<VideoBuildJobRecord>(STORE, jobId, {
    ...(current ?? { createdAt: now, contentId: undefined }),
    status: "failed",
    error: sanitizeVideoBuildError(error),
    debug,
    updatedAt: now,
  });
}
