import type { LanguageRewriteRequestBody } from "../../app/lib/language-rewrite-runner";
import { failLanguageRewriteJob } from "../../app/lib/language-rewrite-jobs";
import { runLanguageRewriteJob } from "../../app/lib/language-rewrite-runner";

type BackgroundBody = {
  jobId?: string;
  body?: LanguageRewriteRequestBody;
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
  const body = payload.body;
  if (!jobId || !body?.articleIds?.length) {
    return new Response(JSON.stringify({ error: "jobId and rewrite body required" }), { status: 400 });
  }

  console.info("[language-rewrite-background] starting", {
    jobId,
    articleCount: body.articleIds.length,
  });

  try {
    await runLanguageRewriteJob(jobId, body);
    console.info("[language-rewrite-background] completed", { jobId });
    return new Response(JSON.stringify({ ok: true, jobId }), { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[language-rewrite-background] failed", { jobId, message });
    try {
      await failLanguageRewriteJob(jobId, message);
    } catch (failErr) {
      console.error("[language-rewrite-background] could not record job failure", {
        jobId,
        message: failErr instanceof Error ? failErr.message : String(failErr),
      });
    }
    return new Response(JSON.stringify({ error: message, jobId }), { status: 500 });
  }
};
