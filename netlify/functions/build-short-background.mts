import type { BuildShortRequestBody } from "../../app/lib/build-short-service";
import { runVideoBuildJob } from "../../app/lib/video-build-runner";

type BackgroundBody = {
  jobId?: string;
  body?: BuildShortRequestBody;
};

function authorizedInternalBuild(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = req.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
  }
  if (!authorizedInternalBuild(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let payload: BackgroundBody;
  try {
    payload = (await req.json()) as BackgroundBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const jobId = payload.jobId?.trim();
  const body = payload.body;
  if (!jobId || !body?.contentId || !body?.scenes?.length || !body?.script) {
    return new Response(JSON.stringify({ error: "jobId and build body required" }), { status: 400 });
  }

  // #region agent log
  fetch("http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6387c1" },
    body: JSON.stringify({
      sessionId: "6387c1",
      runId: "post-fix-v5",
      hypothesisId: "H13,H17",
      location: "netlify/functions/build-short-background.mts:start",
      message: "background function accepted build job",
      data: { jobId, contentId: body.contentId, sceneCount: body.scenes.length },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  await runVideoBuildJob(jobId, body);

  // #region agent log
  fetch("http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6387c1" },
    body: JSON.stringify({
      sessionId: "6387c1",
      runId: "post-fix-v5",
      hypothesisId: "H13,H17",
      location: "netlify/functions/build-short-background.mts:done",
      message: "background function finished build job",
      data: { jobId },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return new Response(JSON.stringify({ ok: true, jobId }), { status: 200 });
};
