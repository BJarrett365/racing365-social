import { describe, expect, it } from "vitest";
import { normalizeDevGatewayChatResponse } from "@/app/lib/dev-gateway/chat";

describe("normalizeDevGatewayChatResponse", () => {
  it("normalizes structured gateway chat output", () => {
    const result = normalizeDevGatewayChatResponse({
      summary: "Plan ready",
      recommendation: "Build small",
      steps: ["One", 2],
      risks: ["Risk"],
      filesLikelyAffected: ["app/test.ts"],
      cursorPrompt: "Implement it",
      testPlan: ["Run tests"],
      saveableLearning: {
        type: "prompt_rule",
        title: "Prompt rule",
        content: "Keep changes small",
        confidence: 108,
      },
    });

    expect(result.steps).toEqual(["One", "2"]);
    expect(result.saveableLearning.type).toBe("prompt_rule");
    expect(result.saveableLearning.confidence).toBe(100);
  });

  it("keeps Cursor handoff fields available", () => {
    const result = normalizeDevGatewayChatResponse({
      summary: "Cursor task",
      cursorPrompt: "Implement the smallest safe fix.",
      filesLikelyAffected: ["app/components/Test.tsx"],
      testPlan: ["Run build"],
    });

    expect(result.cursorPrompt).toContain("smallest safe fix");
    expect(result.filesLikelyAffected).toEqual(["app/components/Test.tsx"]);
  });
});
