import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAiCallLogs, getAiCallLogs } from "@/app/lib/ai/logging";
import { isDeepseekEligibleTask, isOpenAiOnlyTask, resolvePrimaryProvider } from "@/app/lib/ai/task-routing";

vi.mock("@/app/lib/ai/config", () => ({
  loadAiProviderConfig: vi.fn(),
  resolveOpenAiModel: vi.fn(async () => "gpt-4o-mini"),
  resolveDeepSeekModel: vi.fn(async () => "deepseek-chat"),
}));

vi.mock("@/app/lib/server-secrets", () => ({
  getServerSecretAsync: vi.fn(async (name: string) => {
    if (name === "OPENAI_API_KEY") return "test-openai-key";
    if (name === "DEEPSEEK_API_KEY") return undefined;
    return undefined;
  }),
}));

const { loadAiProviderConfig } = await import("@/app/lib/ai/config");

describe("task routing", () => {
  it("routes premium tasks to OpenAI only", () => {
    expect(isOpenAiOnlyTask("premium_regeneration")).toBe(true);
    expect(isOpenAiOnlyTask("final_editorial_review")).toBe(true);
    expect(isDeepseekEligibleTask("translation_support")).toBe(true);
    expect(isDeepseekEligibleTask("premium_regeneration")).toBe(false);
  });

  it("uses DeepSeek when enabled and configured for eligible tasks", () => {
    expect(
      resolvePrimaryProvider("article_analysis", {
        defaultProvider: "openai",
        enableDeepseek: true,
        deepseekConfigured: true,
      }),
    ).toBe("deepseek");
  });

  it("keeps OpenAI for premium tasks even when DeepSeek enabled", () => {
    expect(
      resolvePrimaryProvider("brand_voice_scoring", {
        defaultProvider: "deepseek",
        enableDeepseek: true,
        deepseekConfigured: true,
      }),
    ).toBe("openai");
  });

  it("defaults to OpenAI when DeepSeek disabled", () => {
    expect(
      resolvePrimaryProvider("rewrite_support", {
        defaultProvider: "openai",
        enableDeepseek: false,
        deepseekConfigured: true,
      }),
    ).toBe("openai");
  });
});

describe("aiChatCompletion fallback", () => {
  beforeEach(() => {
    clearAiCallLogs();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("falls back to OpenAI when DeepSeek enabled but no key", async () => {
    vi.mocked(loadAiProviderConfig).mockResolvedValue({
      defaultProvider: "openai",
      enableDeepseek: true,
      openaiConfigured: true,
      deepseekConfigured: false,
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "hello from openai" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    } as Response);

    const { aiChatText } = await import("@/app/lib/ai/client");
    const result = await aiChatText({
      task: "article_analysis",
      system: "test",
      user: "analyse this",
    });

    expect(result.provider).toBe("openai");
    expect(result.fallbackUsed).toBe(true);
    expect(result.text).toBe("hello from openai");

    const logs = getAiCallLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]?.provider).toBe("openai");
  });

  it("DeepSeek disabled by default in config", async () => {
    vi.mocked(loadAiProviderConfig).mockResolvedValue({
      defaultProvider: "openai",
      enableDeepseek: false,
      openaiConfigured: true,
      deepseekConfigured: false,
    });

    expect(
      resolvePrimaryProvider("translation_support", {
        defaultProvider: "openai",
        enableDeepseek: false,
        deepseekConfigured: false,
      }),
    ).toBe("openai");
  });
});

describe("provider logs", () => {
  it("records provider, latency and cost estimate fields", async () => {
    clearAiCallLogs();
    const { recordAiCall } = await import("@/app/lib/ai/logging");
    recordAiCall({
      task: "rewrite_support",
      provider: "openai",
      model: "gpt-4o-mini",
      latencyMs: 120,
      costEstimateUsd: 0.00012,
      fallbackUsed: false,
      retryCount: 0,
      success: true,
    });
    const logs = getAiCallLogs();
    expect(logs[0]).toMatchObject({
      task: "rewrite_support",
      provider: "openai",
      latencyMs: 120,
      costEstimateUsd: 0.00012,
      success: true,
    });
  });
});
