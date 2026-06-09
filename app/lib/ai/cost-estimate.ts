import type { AiProviderId } from "@/app/lib/ai/types";

/** Rough per-1M-token pricing (USD) for cost estimates — not billing-accurate. */
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "deepseek-chat": { input: 0.14, output: 0.28 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },
};

function roughTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCostUsd(
  provider: AiProviderId,
  model: string,
  promptText: string,
  completionText: string,
  usage?: { promptTokens?: number; completionTokens?: number },
): number {
  const promptTokens = usage?.promptTokens ?? roughTokenCount(promptText);
  const completionTokens = usage?.completionTokens ?? roughTokenCount(completionText);
  const rates = PRICING[model] ?? (provider === "deepseek" ? PRICING["deepseek-chat"]! : PRICING["gpt-4o-mini"]!);
  return (promptTokens * rates.input + completionTokens * rates.output) / 1_000_000;
}
