import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { aiChatText } from "@/app/lib/ai";

type Body = {
  adminToken?: string;
  article?: string;
  task?: "article_analysis" | "preview_analysis";
};

const DEFAULT_ARTICLE = `Arsenal beat Chelsea 2-1 at the Emirates. Saka scored in the 34th minute before Palmer equalised. Rice's late winner secured three points. Arteta praised the squad depth; Maresca called for more clinical finishing.`;

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const article = (body.article ?? DEFAULT_ARTICLE).slice(0, 12_000);
  const task = body.task ?? "article_analysis";
  const system =
    "You are a sports editor. Analyse the article briefly: key story, SEO headline suggestion, tone, and one improvement. Keep under 200 words.";

  const [openai, deepseek] = await Promise.allSettled([
    aiChatText({ task, system, user: article, forceProvider: "openai", temperature: 0.35 }),
    aiChatText({ task, system, user: article, forceProvider: "deepseek", temperature: 0.35 }),
  ]);

  return NextResponse.json({
    task,
    openai:
      openai.status === "fulfilled"
        ? {
            text: openai.value.text,
            provider: openai.value.provider,
            model: openai.value.model,
            latencyMs: openai.value.latencyMs,
            costEstimateUsd: openai.value.costEstimateUsd,
          }
        : { error: openai.reason instanceof Error ? openai.reason.message : "OpenAI failed" },
    deepseek:
      deepseek.status === "fulfilled"
        ? {
            text: deepseek.value.text,
            provider: deepseek.value.provider,
            model: deepseek.value.model,
            latencyMs: deepseek.value.latencyMs,
            costEstimateUsd: deepseek.value.costEstimateUsd,
          }
        : { error: deepseek.reason instanceof Error ? deepseek.reason.message : "DeepSeek failed" },
  });
}
