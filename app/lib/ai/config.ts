import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";
import type { AiProviderConfig, AiProviderId } from "@/app/lib/ai/types";

const VALID_PROVIDERS = new Set<AiProviderId>(["openai", "deepseek", "claude", "gemini", "local"]);

function parseProvider(value: string | undefined): AiProviderId {
  const v = (value ?? "").trim().toLowerCase();
  if (VALID_PROVIDERS.has(v as AiProviderId)) return v as AiProviderId;
  return "openai";
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function loadAiProviderConfig(): Promise<AiProviderConfig> {
  const settings = await readStoredSettingsAsync();
  const openaiKey = await getServerSecretAsync("OPENAI_API_KEY");
  const deepseekKey = await getServerSecretAsync("DEEPSEEK_API_KEY");

  const defaultProvider = parseProvider(
    settings.defaultAiProvider?.trim() ||
      process.env.DEFAULT_AI_PROVIDER?.trim() ||
      "openai",
  );

  const enableDeepseek =
    typeof settings.enableDeepseek === "boolean"
      ? settings.enableDeepseek
      : parseBool(process.env.ENABLE_DEEPSEEK, false);

  return {
    defaultProvider,
    enableDeepseek,
    openaiConfigured: Boolean(openaiKey),
    deepseekConfigured: Boolean(deepseekKey),
  };
}

export async function resolveOpenAiModel(override?: string): Promise<string> {
  if (override?.trim()) return override.trim();
  const settings = await readStoredSettingsAsync();
  return (
    settings.languageOpenaiModel?.trim() ||
    process.env.LANGUAGE_OPENAI_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

export async function resolveDeepSeekModel(override?: string): Promise<string> {
  if (override?.trim()) return override.trim();
  const settings = await readStoredSettingsAsync();
  return (
    settings.deepseekModel?.trim() ||
    process.env.DEEPSEEK_MODEL?.trim() ||
    "deepseek-chat"
  );
}
