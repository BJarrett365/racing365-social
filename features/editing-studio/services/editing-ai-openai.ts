import { getServerSecret } from "@/app/lib/server-secrets";
import { aiChatJsonObject, aiChatText } from "@/app/lib/ai";

const MAX_USER_CHARS = 48_000;

export function assertOpenAiConfigured(): void {
  const key = getServerSecret("OPENAI_API_KEY");
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured. Add it in environment or Admin settings.");
  }
}

/**
 * Plain-text chat completion (Editing Studio copy tools).
 * Routed via Plexa AI — DeepSeek when enabled, with OpenAI fallback.
 */
export async function editingOpenAiCompletion(params: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const result = await aiChatText({
    task: "rewrite_support",
    system: params.system,
    user: params.user.slice(0, MAX_USER_CHARS),
    model: params.model,
    temperature: params.temperature ?? 0.45,
  });
  return result.text;
}

/**
 * JSON-mode completion; parses object from message content.
 */
export async function editingOpenAiJsonObject(params: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<unknown> {
  const { data } = await aiChatJsonObject({
    task: "rewrite_support",
    system: params.system,
    user: params.user.slice(0, MAX_USER_CHARS),
    model: params.model,
    temperature: params.temperature ?? 0.4,
    json: true,
  });
  return data;
}
