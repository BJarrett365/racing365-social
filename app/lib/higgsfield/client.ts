import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { DEFAULT_HIGGSFIELD_IMAGE_EDIT_ENDPOINT } from "@/app/lib/higgsfield/constants";

const PLATFORM_BASE = "https://platform.higgsfield.ai";

export { DEFAULT_HIGGSFIELD_IMAGE_EDIT_ENDPOINT };

export async function getHiggsfieldAuthorizationHeader(override?: {
  apiKey?: string;
  apiSecret?: string;
}): Promise<string | undefined> {
  const overrideKey = override?.apiKey?.trim();
  const overrideSecret = override?.apiSecret?.trim();
  if (overrideKey && overrideSecret) {
    return `Key ${overrideKey}:${overrideSecret}`;
  }

  const hfCred = process.env.HF_CREDENTIALS?.trim();
  if (hfCred) {
    const rest = hfCred.replace(/^Key\s+/i, "").trim();
    return `Key ${rest}`;
  }
  const key = await getServerSecretAsync("HF_API_KEY");
  const secret = await getServerSecretAsync("HF_API_SECRET");
  if (key && secret) return `Key ${key}:${secret}`;
  return undefined;
}

export async function resolveHiggsfieldImageEditEndpoint(): Promise<string> {
  const fromEnv = await getServerSecretAsync("HIGGSFIELD_IMAGE_EDIT_ENDPOINT");
  if (fromEnv?.trim()) return fromEnv.trim().replace(/^\//, "");
  return DEFAULT_HIGGSFIELD_IMAGE_EDIT_ENDPOINT;
}

type PlatformJobPayload = {
  status?: string;
  request_id?: string;
  status_url?: string;
  cancel_url?: string;
  images?: Array<{ url?: string }>;
  error?: string;
  message?: string;
};

function normalizeEndpoint(modelEndpoint: string): string {
  return modelEndpoint.trim().replace(/^\//, "");
}

function readError(data: PlatformJobPayload, httpStatus: number): string {
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  return `Higgsfield API error (${httpStatus})`;
}

/**
 * Submit a generation job and poll until completion, failure, NSFW, or timeout.
 */
export async function higgsfieldSubscribeAndPoll(params: {
  authorization: string;
  modelEndpoint: string;
  body: Record<string, unknown>;
  pollIntervalMs?: number;
  maxPollMs?: number;
}): Promise<{ images: Array<{ url: string }>; status: string }> {
  const pollIntervalMs = params.pollIntervalMs ?? 2000;
  const maxPollMs = params.maxPollMs ?? 55000;
  const pathSeg = normalizeEndpoint(params.modelEndpoint);
  const submitUrl = `${PLATFORM_BASE}/${pathSeg}`;

  const submitRes = await fetch(submitUrl, {
    method: "POST",
    headers: {
      Authorization: params.authorization,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(params.body),
    cache: "no-store",
  });

  const data = (await submitRes.json().catch(() => ({}))) as PlatformJobPayload;

  if (!submitRes.ok) {
    throw new Error(readError(data, submitRes.status));
  }

  if (data.status === "completed" && Array.isArray(data.images) && data.images.length > 0) {
    const urls = data.images.map((i) => i.url).filter((u): u is string => typeof u === "string" && u.trim().length > 0);
    if (urls.length === 0) throw new Error("Higgsfield completed but returned no image URLs.");
    return { images: urls.map((url) => ({ url })), status: "completed" };
  }

  const terminalFail = new Set(["failed", "nsfw"]);
  if (data.status && terminalFail.has(data.status)) {
    throw new Error(readError(data, submitRes.status));
  }

  let statusUrl = typeof data.status_url === "string" ? data.status_url.trim() : "";
  if (!statusUrl && typeof data.request_id === "string" && data.request_id.trim()) {
    statusUrl = `${PLATFORM_BASE}/requests/${encodeURIComponent(data.request_id.trim())}/status`;
  }
  if (!statusUrl) {
    throw new Error("Higgsfield did not return status_url or request_id for polling.");
  }

  const started = Date.now();
  while (Date.now() - started < maxPollMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const stRes = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Authorization: params.authorization,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const st = (await stRes.json().catch(() => ({}))) as PlatformJobPayload;

    if (!stRes.ok) {
      throw new Error(readError(st, stRes.status));
    }

    if (st.status === "completed") {
      const imgs = Array.isArray(st.images) ? st.images : [];
      const urls = imgs.map((i) => i.url).filter((u): u is string => typeof u === "string" && u.trim().length > 0);
      if (urls.length === 0) throw new Error("Higgsfield completed but returned no image URLs.");
      return { images: urls.map((url) => ({ url })), status: "completed" };
    }

    if (st.status && terminalFail.has(st.status)) {
      throw new Error(readError(st, stRes.status));
    }
  }

  throw new Error(
    "Higgsfield job did not finish within the server timeout. Try again, use webhooks in production, or increase host limits.",
  );
}
