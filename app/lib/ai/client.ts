import { loadAiProviderConfig } from "@/app/lib/ai/config";
import { estimateCostUsd } from "@/app/lib/ai/cost-estimate";
import { recordAiCall } from "@/app/lib/ai/logging";
import { deepSeekChatCompletion } from "@/app/lib/ai/providers/deepseek-provider";
import { openAiChatCompletion } from "@/app/lib/ai/providers/openai-provider";
import { fallbackProvider, isDeepseekEligibleTask, resolvePrimaryProvider } from "@/app/lib/ai/task-routing";
import type { AiCompletionParams, AiCompletionResult, AiProviderId } from "@/app/lib/ai/types";

async function callProvider(
  provider: AiProviderId,
  params: AiCompletionParams,
): Promise<{ text: string; model: string; promptTokens?: number; completionTokens?: number }> {
  switch (provider) {
    case "deepseek":
      return deepSeekChatCompletion(params);
    case "openai":
    default:
      return openAiChatCompletion(params);
  }
}

function providerConfigured(
  provider: AiProviderId,
  config: Awaited<ReturnType<typeof loadAiProviderConfig>>,
): boolean {
  if (provider === "deepseek") return config.deepseekConfigured;
  if (provider === "openai") return config.openaiConfigured;
  return false;
}

/**
 * Plexa AI client — routes tasks to OpenAI or DeepSeek with safe fallback.
 *
 * - DeepSeek enabled but no key → OpenAI
 * - DeepSeek fails → retry once, then fallback to OpenAI
 * - Premium tasks always OpenAI
 */
export async function aiChatCompletion(params: AiCompletionParams): Promise<AiCompletionResult> {
  const config = await loadAiProviderConfig();
  const start = Date.now();
  let retryCount = 0;
  let fallbackUsed = false;
  let lastError = "";

  const wantedDeepseek =
    config.enableDeepseek &&
    isDeepseekEligibleTask(params.task) &&
    !params.forceProvider;

  let primary = resolvePrimaryProvider(params.task, {
    defaultProvider: config.defaultProvider,
    enableDeepseek: config.enableDeepseek,
    deepseekConfigured: config.deepseekConfigured,
    forceProvider: params.forceProvider,
  });

  // Safe fallback: DeepSeek enabled but no key → OpenAI
  if (primary === "deepseek" && !config.deepseekConfigured) {
    primary = "openai";
    fallbackUsed = true;
    lastError = "DeepSeek enabled but DEEPSEEK_API_KEY missing";
  } else if (wantedDeepseek && !config.deepseekConfigured && primary === "openai") {
    fallbackUsed = true;
    lastError = "DeepSeek enabled but DEEPSEEK_API_KEY missing";
  }
  if (!providerConfigured(primary, config)) {
    const fb = primary === "deepseek" ? "openai" : "deepseek";
    if (providerConfigured(fb, config)) {
      primary = fb;
      fallbackUsed = true;
      lastError = `Primary provider not configured`;
    } else {
      throw new Error("No AI provider is configured. Set OPENAI_API_KEY or DEEPSEEK_API_KEY.");
    }
  }

  const attempt = async (provider: AiProviderId, isRetry: boolean): Promise<AiCompletionResult> => {
    const result = await callProvider(provider, params);
    const latencyMs = Date.now() - start;
    const costEstimateUsd = estimateCostUsd(provider, result.model, params.system + params.user, result.text, {
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    });
    recordAiCall({
      task: params.task,
      provider,
      model: result.model,
      latencyMs,
      costEstimateUsd,
      fallbackUsed,
      retryCount: isRetry ? retryCount : retryCount,
      success: true,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    });
    return {
      text: result.text,
      provider,
      model: result.model,
      latencyMs,
      costEstimateUsd,
      fallbackUsed,
      retryCount,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    };
  };

  try {
    return await attempt(primary, false);
  } catch (e) {
    lastError = e instanceof Error ? e.message : "AI request failed";
    // Retry once on same provider
    retryCount = 1;
    try {
      return await attempt(primary, true);
    } catch (retryErr) {
      lastError = retryErr instanceof Error ? retryErr.message : lastError;
      // Fallback to alternate provider
      const fb = fallbackProvider(primary);
      if (fb !== primary && providerConfigured(fb, config)) {
        fallbackUsed = true;
        try {
          const result = await attempt(fb, false);
          recordAiCall({
            task: params.task,
            provider: fb,
            model: result.model,
            latencyMs: result.latencyMs,
            costEstimateUsd: result.costEstimateUsd,
            fallbackUsed: true,
            retryCount,
            success: true,
            errorReason: `Fallback after: ${lastError}`,
          });
          return { ...result, fallbackUsed: true, retryCount };
        } catch (fbErr) {
          lastError = fbErr instanceof Error ? fbErr.message : lastError;
        }
      }
      recordAiCall({
        task: params.task,
        provider: primary,
        model: params.model ?? "unknown",
        latencyMs: Date.now() - start,
        costEstimateUsd: 0,
        fallbackUsed,
        retryCount,
        success: false,
        errorReason: lastError,
      });
      throw new Error(lastError);
    }
  }
}

/** JSON-mode completion — parses object from message content. */
export async function aiChatJsonObject<T = unknown>(params: AiCompletionParams): Promise<{
  data: T;
  meta: AiCompletionResult;
}> {
  const result = await aiChatCompletion({ ...params, json: true });
  try {
    return { data: JSON.parse(result.text) as T, meta: result };
  } catch {
    throw new Error(`${result.provider} returned invalid JSON.`);
  }
}

/** Plain-text completion shorthand. */
export async function aiChatText(params: AiCompletionParams): Promise<AiCompletionResult> {
  return aiChatCompletion({ ...params, json: false });
}
