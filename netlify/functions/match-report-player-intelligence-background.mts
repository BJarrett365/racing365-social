import { failMatchReportJobAny } from "../../app/lib/match-report/jobs";
import { runMatchReportPlayerIntelligenceJob } from "../../app/lib/match-report/player-intelligence-runner";

type BackgroundBody = {
  jobId?: string;
  projectId?: string;
};

function authorizedInternal(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = req.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
  }
  if (!authorizedInternal(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let payload: BackgroundBody;
  try {
    payload = (await req.json()) as BackgroundBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const jobId = payload.jobId?.trim();
  const projectId = payload.projectId?.trim();
  if (!jobId || !projectId) {
    return new Response(JSON.stringify({ error: "jobId and projectId required" }), { status: 400 });
  }

  try {
    await runMatchReportPlayerIntelligenceJob(projectId, jobId);
    return new Response(JSON.stringify({ ok: true, jobId }), { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    try {
      await failMatchReportJobAny(jobId, message);
    } catch {
      /* ignore */
    }
    return new Response(JSON.stringify({ error: message, jobId }), { status: 500 });
  }
};
