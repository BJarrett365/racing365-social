import { parseApiJson } from "@/app/lib/parse-api-json";

export type VideoTrimStubResponse = {
  ok?: boolean;
  stub?: boolean;
  message?: string;
  error?: string;
};

export type FrameExtractStubResponse = {
  ok?: boolean;
  stub?: boolean;
  message?: string;
  coverRelPath?: string | null;
  error?: string;
};

export async function postVideoTrimStub(payload: {
  relPath?: string;
  assetId?: string;
  trimStartSec: number;
  trimEndSec: number | null;
}): Promise<VideoTrimStubResponse> {
  const res = await fetch("/api/editing/assets/video-trim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<VideoTrimStubResponse>(res);
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  }
  return data;
}

export async function postFrameExtractStub(payload: {
  relPath?: string;
  assetId?: string;
  timeSec: number;
}): Promise<FrameExtractStubResponse> {
  const res = await fetch("/api/editing/assets/frame", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseApiJson<FrameExtractStubResponse>(res);
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  }
  return data;
}
