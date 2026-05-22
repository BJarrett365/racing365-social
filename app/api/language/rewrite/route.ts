import { after, NextResponse } from "next/server";
import { isNetlifyHostedLambdaRuntime } from "@/app/lib/netlify-hosted-runtime";
import {
  createLanguageRewriteJob,
  failLanguageRewriteJob,
  resolveStaleLanguageRewriteJob,
} from "@/app/lib/language-rewrite-jobs";
import {
  runLanguageRewriteJob,
  type LanguageRewriteRequestBody,
} from "@/app/lib/language-rewrite-runner";
import { readLanguageStudioData } from "@/app/lib/language-studio/store";
import type {
  LanguageContentStyle,
  LanguageProviderMode,
  LanguageSportContext,
} from "@/app/lib/language-studio/types";

/** Inline fallback on Netlify when the background function is unreachable. */
export const maxDuration = 900;

type Body = {
  articleId?: string;
  articleIds?: string[];
  clientIds?: string[];
  providerMode?: LanguageProviderMode;
  journalistProfileId?: string;
  rewriteStyle?: string;
  journalistStyle?: string;
  editorialGuidelines?: string;
  contentStyle?: LanguageContentStyle;
  sportContext?: LanguageSportContext;
};

function siteOrigin(req: Request): string {
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

function internalAuthHeader(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;
  return headers;
}

function normaliseBody(body: Body): LanguageRewriteRequestBody | null {
  const articleIds = Array.isArray(body.articleIds) && body.articleIds.length > 0
    ? body.articleIds
    : body.articleId
      ? [body.articleId]
      : [];
  if (articleIds.length === 0) return null;
  return {
    articleIds,
    clientIds: body.clientIds,
    providerMode: body.providerMode,
    journalistProfileId: body.journalistProfileId,
    rewriteStyle: body.rewriteStyle,
    journalistStyle: body.journalistStyle,
    editorialGuidelines: body.editorialGuidelines,
    contentStyle: body.contentStyle,
    sportContext: body.sportContext,
  };
}

type InvokeResult = "background" | "fallback";

async function invokeBackgroundRewrite(
  origin: string,
  jobId: string,
  body: LanguageRewriteRequestBody,
): Promise<InvokeResult> {
  const url = `${origin}/.netlify/functions/language-rewrite-background`;
  console.info("[language-rewrite] invoking background function", { jobId, origin, url });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: internalAuthHeader(),
      redirect: "manual",
      body: JSON.stringify({ jobId, body }),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") ?? "";
      await failLanguageRewriteJob(
        jobId,
        `Background rewrite invoke was redirected (${res.status}) to ${location || "login"}`,
      );
      return "background";
    }

    if (res.status === 404 || res.status === 502 || res.status === 503) {
      console.warn("[language-rewrite] background function unavailable — using inline fallback", {
        jobId,
        status: res.status,
      });
      return "fallback";
    }

    if (!res.ok && res.status !== 202) {
      const text = await res.text().catch(() => "");
      await failLanguageRewriteJob(jobId, text || `Background rewrite invoke failed (${res.status})`);
      return "background";
    }

    console.info("[language-rewrite] background invoke accepted", { jobId, status: res.status });
    return "background";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Background rewrite invoke failed";
    console.warn("[language-rewrite] background invoke network error — using inline fallback", { jobId, message });
    return "fallback";
  }
}

export async function GET(req: Request) {
  const jobId = new URL(req.url).searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }
  const job = await resolveStaleLanguageRewriteJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const requestBody = normaliseBody(body);
  if (!requestBody) {
    return NextResponse.json({ error: "Select at least one article." }, { status: 400 });
  }

  try {
    const data = await readLanguageStudioData();
    const articles = requestBody.articleIds
      .map((id) => data.articles[id])
      .filter((article): article is NonNullable<typeof article> => Boolean(article));
    if (articles.length === 0) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }

    if (isNetlifyHostedLambdaRuntime()) {
      const jobId = `lr-${Date.now()}-${requestBody.articleIds[0]}`;
      await createLanguageRewriteJob(jobId, articles.length);
      const origin = siteOrigin(req);

      after(async () => {
        try {
          const mode = await invokeBackgroundRewrite(origin, jobId, requestBody);
          if (mode === "fallback") {
            console.info("[language-rewrite] running inline fallback", { jobId });
            await runLanguageRewriteJob(jobId, requestBody);
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : "Rewrite invoke failed";
          console.error("[language-rewrite] after() handler failed", { jobId, message });
          await failLanguageRewriteJob(jobId, message);
        }
      });

      return NextResponse.json(
        {
          async: true,
          jobId,
          status: "pending",
          message: "Rewrite started in the background. Poll until completed.",
        },
        { status: 202 },
      );
    }

    const jobId = `lr-local-${Date.now()}`;
    await createLanguageRewriteJob(jobId, articles.length);
    await runLanguageRewriteJob(jobId, requestBody);
    const job = await resolveStaleLanguageRewriteJob(jobId);
    if (!job || job.status === "failed") {
      return NextResponse.json({ error: job?.error || "Rewrite failed." }, { status: 500 });
    }
    return NextResponse.json({ success: true, rewrites: job.rewrites ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Rewrite failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
