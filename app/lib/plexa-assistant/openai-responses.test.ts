import { describe, expect, it } from "vitest";
import { extractResponseText, messagesToResponsesInput } from "@/app/lib/plexa-assistant/openai-responses";

describe("openai response helpers", () => {
  it("limits chat history for Responses API input", () => {
    const messages = Array.from({ length: 14 }, (_, index) => ({
      role: (index % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `message ${index}`,
    }));

    const input = messagesToResponsesInput(messages);
    expect(input).toHaveLength(12);
    expect(input[0]?.content).toBe("message 2");
  });

  it("extracts text and citation annotations", () => {
    const output = extractResponseText({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: "Use UEFA Conference League wording.",
              annotations: [{ type: "url_citation", title: "Premier League", url: "https://www.premierleague.com/" }],
            },
          ],
        },
      ],
    });

    expect(output.text).toContain("UEFA Conference League");
    expect(output.sources).toEqual([{ title: "Premier League", url: "https://www.premierleague.com/" }]);
  });
});
