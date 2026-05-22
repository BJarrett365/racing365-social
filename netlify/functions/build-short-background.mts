import type { BuildShortRequestBody } from "../../app/lib/build-short-service";
import { failVideoBuildJob } from "../../app/lib/video-build-jobs";
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

  console.info("[build-short-background] starting", {
    jobId,
    contentId: body.contentId,
    sceneCount: body.scenes.length,
  });

  try {
    await runVideoBuildJob(jobId, body);
    console.info("[build-short-background] completed", { jobId });
    return new Response(JSON.stringify({ ok: true, jobId }), { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[build-short-background] failed", { jobId, message });
    try {
      await failVideoBuildJob(jobId, message);
    } catch (failErr) {
      console.error("[build-short-background] could not record job failure", {
        jobId,
        message: failErr instanceof Error ? failErr.message : String(failErr),
      });
    }
    return new Response(JSON.stringify({ error: message, jobId }), { status: 500 });
  }
};
