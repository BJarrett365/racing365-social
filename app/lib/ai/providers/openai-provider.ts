import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { resolveOpenAiModel } from "@/app/lib/ai/config";
import type { AiCompletionParams } from "@/app/lib/ai/types";

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export async function openAiChatCompletion(
  params: AiCompletionParams,
): Promise<{
  text: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  const model = await resolveOpenAiModel(params.model);
  const user = params.user.slice(0, 120_000);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: params.temperature ?? 0.4,
      max_tokens: params.maxTokens,
      ...(params.json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: user },
      ],
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as ChatCompletionResponse;
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string" ? data.error.message : `OpenAI request failed (${res.status})`;
    throw new Error(msg);
  }
  const text = data.choices?.[0]?.message?.content;
  const out = typeof text === "string" ? text.trim() : "";
  if (!out) throw new Error("OpenAI returned empty content.");
  return {
    text: out,
    model,
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
  };
}

export async function testOpenAiConnection(): Promise<{ ok: boolean; modelCount?: number; error?: string }> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) return { ok: false, error: "OPENAI_API_KEY is not configured." };
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { data?: unknown[]; error?: { message?: string } };
    if (!res.ok) {
      return { ok: false, error: data.error?.message || `OpenAI API error (${res.status})` };
    }
    return { ok: true, modelCount: Array.isArray(data.data) ? data.data.length : 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "OpenAI connection failed" };
  }
}
