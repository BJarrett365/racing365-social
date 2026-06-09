import type { AiProviderId, AiTask } from "@/app/lib/ai/types";

/** Tasks that must always use OpenAI (premium editorial / quality layer). */
const OPENAI_ONLY_TASKS = new Set<AiTask>([
  "final_editorial_review",
  "brand_voice_scoring",
  "tactical_insight_scoring",
  "premium_regeneration",
  "publish_approval",
  "creator_dna_validation",
  "admin_dev_gateway",
]);

/** Tasks eligible for DeepSeek when enabled and configured. */
const DEEPSEEK_ELIGIBLE_TASKS = new Set<AiTask>([
  "article_analysis",
  "seo_scoring",
  "creator_dna_extraction",
  "journalist_style_learning",
  "content_classification",
  "entity_extraction",
  "preview_analysis",
  "match_report_analysis",
  "translation_support",
  "rewrite_support",
]);

export function isDeepseekEligibleTask(task: AiTask): boolean {
  return DEEPSEEK_ELIGIBLE_TASKS.has(task);
}

export function isOpenAiOnlyTask(task: AiTask): boolean {
  return OPENAI_ONLY_TASKS.has(task);
}

/**
 * Resolve primary provider for a task given config.
 * DeepSeek is used only when enabled, configured, and task is eligible.
 */
export function resolvePrimaryProvider(
  task: AiTask,
  opts: {
    defaultProvider: AiProviderId;
    enableDeepseek: boolean;
    deepseekConfigured: boolean;
    forceProvider?: AiProviderId;
  },
): AiProviderId {
  if (opts.forceProvider) return opts.forceProvider;
  if (isOpenAiOnlyTask(task)) return "openai";
  if (
    opts.enableDeepseek &&
    opts.deepseekConfigured &&
    isDeepseekEligibleTask(task) &&
    (opts.defaultProvider === "deepseek" || opts.defaultProvider === "openai")
  ) {
    // When DeepSeek is enabled for eligible tasks, prefer DeepSeek as the processing layer.
    return "deepseek";
  }
  return opts.defaultProvider === "deepseek" && opts.deepseekConfigured ? "deepseek" : "openai";
}

export function fallbackProvider(primary: AiProviderId): AiProviderId {
  return primary === "deepseek" ? "openai" : "deepseek";
}
