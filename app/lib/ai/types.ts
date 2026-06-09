/** Supported LLM providers. Future: claude, gemini, local. */
export type AiProviderId = "openai" | "deepseek" | "claude" | "gemini" | "local";

/**
 * Task categories routed to providers.
 * DeepSeek = low-cost processing/learning; OpenAI = premium editorial/quality.
 */
export type AiTask =
  // DeepSeek-eligible (processing / learning layer)
  | "article_analysis"
  | "seo_scoring"
  | "creator_dna_extraction"
  | "journalist_style_learning"
  | "content_classification"
  | "entity_extraction"
  | "preview_analysis"
  | "match_report_analysis"
  | "translation_support"
  | "rewrite_support"
  // OpenAI-only (premium editorial / quality layer)
  | "final_editorial_review"
  | "brand_voice_scoring"
  | "tactical_insight_scoring"
  | "premium_regeneration"
  | "publish_approval"
  | "creator_dna_validation"
  // Admin / dev tooling — always OpenAI
  | "admin_dev_gateway";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiCompletionParams = {
  task: AiTask;
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  /** Force a specific provider (admin compare / override). */
  forceProvider?: AiProviderId;
};

export type AiCompletionResult = {
  text: string;
  provider: AiProviderId;
  model: string;
  latencyMs: number;
  /** Rough USD estimate based on token counts. */
  costEstimateUsd: number;
  fallbackUsed: boolean;
  retryCount: number;
  promptTokens?: number;
  completionTokens?: number;
};

export type AiProviderConfig = {
  defaultProvider: AiProviderId;
  enableDeepseek: boolean;
  openaiConfigured: boolean;
  deepseekConfigured: boolean;
};

export type AiCallLogEntry = {
  id: string;
  timestamp: string;
  task: AiTask;
  provider: AiProviderId;
  model: string;
  latencyMs: number;
  costEstimateUsd: number;
  fallbackUsed: boolean;
  retryCount: number;
  success: boolean;
  errorReason?: string;
  promptTokens?: number;
  completionTokens?: number;
};
