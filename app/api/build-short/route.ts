import { after, NextResponse } from "next/server";
import { buildShortPayload, type BuildShortRequestBody } from "@/app/lib/build-short-service";
import { ffmpegResolutionDebug } from "@/app/features/video/ffmpeg-utils";
import { isNetlifyHostedLambdaRuntime } from "@/app/lib/netlify-hosted-runtime";
import { runVideoBuildJob } from "@/app/lib/video-build-runner";
import {
  createVideoBuildJob,
  failVideoBuildJob,
  resolveStaleVideoBuildJob,
} from "@/app/lib/video-build-jobs";

/** Fallback inline encode on Netlify when the background function is unreachable (still capped by hosting). */
export const maxDuration = 900;

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

function internalBuildAuthHeader(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;
  return headers;
}

type InvokeResult = "background" | "fallback";

async function invokeBackgroundBuild(
  origin: string,
  jobId: string,
  body: BuildShortRequestBody,
): Promise<InvokeResult> {
  const url = `${origin}/.netlify/functions/build-short-background`;
  console.info("[build-short] invoking background function", { jobId, origin, url });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: internalBuildAuthHeader(),
      redirect: "manual",
      body: JSON.stringify({ jobId, body }),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") ?? "";
      await failVideoBuildJob(
        jobId,
        `Background build invoke was redirected (${res.status}) to ${location || "login"}`,
      );
      return "background";
    }

    if (res.status === 404 || res.status === 502 || res.status === 503) {
      console.warn("[build-short] background function unavailable — using inline fallback", {
        jobId,
        status: res.status,
      });
      return "fallback";
    }

    if (!res.ok && res.status !== 202) {
      const text = await res.text().catch(() => "");
      await failVideoBuildJob(jobId, text || `Background build invoke failed (${res.status})`);
      return "background";
    }

    console.info("[build-short] background invoke accepted", { jobId, status: res.status });
    return "background";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Background build invoke failed";
    console.warn("[build-short] background invoke network error — using inline fallback", { jobId, message });
    return "fallback";
  }
}

export async function GET(req: Request) {
  const jobId = new URL(req.url).searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }
  const job = await resolveStaleVideoBuildJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BuildShortRequestBody;

    if (isNetlifyHostedLambdaRuntime()) {
      const jobId = `vb-${body.contentId}-${Date.now()}`;
      await createVideoBuildJob(jobId, body.contentId);
      const origin = siteOrigin(req);

      after(async () => {
        try {
          const mode = await invokeBackgroundBuild(origin, jobId, body);
          if (mode === "fallback") {
            console.info("[build-short] running inline fallback encode", { jobId });
            await runVideoBuildJob(jobId, body);
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : "Video build invoke failed";
          console.error("[build-short] after() handler failed", { jobId, message });
          await failVideoBuildJob(jobId, message);
        }
      });

      return NextResponse.json(
        {
          async: true,
          jobId,
          status: "pending",
          message: "Video build started in the background. Poll until completed.",
        },
        { status: 202 },
      );
    }

    const payload = await buildShortPayload(body);
    if (payload.error) {
      return NextResponse.json(payload, { status: 400 });
    }
    if (!payload.videoPath) {
      return NextResponse.json({ error: "Video build finished without returning a video path." }, { status: 500 });
    }
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const ffmpegDebug = message.toLowerCase().includes("ffmpeg") ? ffmpegResolutionDebug() : undefined;
    return NextResponse.json({ error: message, debug: ffmpegDebug ? { ffmpeg: ffmpegDebug } : undefined }, { status: 500 });
  }
}
