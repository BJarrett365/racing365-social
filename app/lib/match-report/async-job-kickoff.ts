import "server-only";

export function matchReportJobSiteOrigin(req: Request): string {
  const fromEnv = process.env.DEPLOY_PRIME_URL?.trim() || process.env.URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* fall through */
    }
  }
  return new URL(req.url).origin;
}

export function matchReportJobInternalAuthHeader(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;
  return headers;
}

export async function invokeMatchReportBackgroundFunction(
  origin: string,
  functionName: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const url = `${origin}/.netlify/functions/${functionName}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: matchReportJobInternalAuthHeader(),
      redirect: "manual",
      body: JSON.stringify(payload),
    });
    if (res.status === 404 || res.status === 502 || res.status === 503) return false;
    return res.ok || res.status === 202;
  } catch {
    return false;
  }
}

export function scheduleMatchReportJob(run: () => Promise<void>): void {
  void run().catch((e) => {
    console.error("[match-report] background job failed", e);
  });
}
