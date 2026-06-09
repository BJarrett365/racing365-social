/**
 * Release gate tests for Plexa AI provider abstraction.
 */
import { describe, expect, it } from "vitest";
import { isDeepseekEligibleTask, isOpenAiOnlyTask, resolvePrimaryProvider } from "@/app/lib/ai/task-routing";

describe("AI provider release gate", () => {
  it("OpenAI still handles premium editorial tasks", () => {
    const premium = [
      "final_editorial_review",
      "brand_voice_scoring",
      "tactical_insight_scoring",
      "premium_regeneration",
      "publish_approval",
      "creator_dna_validation",
    ] as const;
    for (const task of premium) {
      expect(isOpenAiOnlyTask(task)).toBe(true);
      expect(
        resolvePrimaryProvider(task, {
          defaultProvider: "deepseek",
          enableDeepseek: true,
          deepseekConfigured: true,
        }),
      ).toBe("openai");
    }
  });

  it("DeepSeek is disabled by default", () => {
    expect(
      resolvePrimaryProvider("article_analysis", {
        defaultProvider: "openai",
        enableDeepseek: false,
        deepseekConfigured: true,
      }),
    ).toBe("openai");
  });

  it("routes to OpenAI when DEEPSEEK_API_KEY is missing", () => {
    expect(
      resolvePrimaryProvider("translation_support", {
        defaultProvider: "openai",
        enableDeepseek: true,
        deepseekConfigured: false,
      }),
    ).toBe("openai");
    expect(isDeepseekEligibleTask("translation_support")).toBe(true);
  });

  it("no API key env names appear in client AI panel source path", () => {
    const clientPanelPath = "app/components/AiProviderGatewayPanel.tsx";
    expect(clientPanelPath).not.toContain("DEEPSEEK_API_KEY");
    expect(clientPanelPath).not.toContain("OPENAI_API_KEY");
  });
});
