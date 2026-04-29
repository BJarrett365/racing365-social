import { getServerSecret } from "@/app/lib/server-secrets";

/**
 * Stub for OpenAI: when OPENAI_API_KEY is set, replace implementation
 * with real chat completion calls. UI and pipelines stay unchanged.
 */
export async function enhanceCaption(_prompt: string, fallback: string): Promise<string> {
  if (!getServerSecret("OPENAI_API_KEY")) {
    return fallback;
  }
  // Phase 2: const openai = new OpenAI(); return completion...
  return fallback;
}
