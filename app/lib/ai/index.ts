export { aiChatCompletion, aiChatJsonObject, aiChatText } from "@/app/lib/ai/client";
export { loadAiProviderConfig, resolveOpenAiModel, resolveDeepSeekModel } from "@/app/lib/ai/config";
export { getAiCallLogs, clearAiCallLogs, recordAiCall } from "@/app/lib/ai/logging";
export { isDeepseekEligibleTask, isOpenAiOnlyTask, resolvePrimaryProvider } from "@/app/lib/ai/task-routing";
export { testDeepSeekConnection } from "@/app/lib/ai/providers/deepseek-provider";
export { testOpenAiConnection } from "@/app/lib/ai/providers/openai-provider";
export type {
  AiCallLogEntry,
  AiCompletionParams,
  AiCompletionResult,
  AiProviderConfig,
  AiProviderId,
  AiTask,
} from "@/app/lib/ai/types";
