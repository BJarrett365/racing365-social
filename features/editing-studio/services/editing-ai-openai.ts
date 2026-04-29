import { getServerSecret } from "@/app/lib/server-secrets";

const MAX_USER_CHARS = 48_000;
const DEFAULT_MODEL = "gpt-4o-mini";

type ChatCompletionResult = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

export function assertOpenAiConfigured(): void {
  const key = getServerSecret("OPENAI_API_KEY");
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured. Add it in environment or Admin settings.");
  }
}

/**
 * Plain-text chat completion (Editing Studio copy tools).
 */
export async function editingOpenAiCompletion(params: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const key = getServerSecret("OPENAI_API_KEY");
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured. Add it in environment or Admin settings.");
  }
  const user = params.user.slice(0, MAX_USER_CHARS);
  const model = (params.model ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: params.temperature ?? 0.45,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: user },
      ],
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as ChatCompletionResult;
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string" ? data.error.message : `OpenAI request failed (${res.status})`;
    throw new Error(msg);
  }
  const text = data.choices?.[0]?.message?.content;
  const out = typeof text === "string" ? text.trim() : "";
  if (!out) throw new Error("OpenAI returned empty content.");
  return out;
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
  const key = getServerSecret("OPENAI_API_KEY");
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured. Add it in environment or Admin settings.");
  }
  const user = params.user.slice(0, MAX_USER_CHARS);
  const model = (params.model ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: params.temperature ?? 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: user },
      ],
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as ChatCompletionResult;
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string" ? data.error.message : `OpenAI request failed (${res.status})`;
    throw new Error(msg);
  }
  const text = data.choices?.[0]?.message?.content;
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) throw new Error("OpenAI returned empty JSON.");
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }
}
