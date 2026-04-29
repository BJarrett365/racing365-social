import { getServerSecret } from "@/app/lib/server-secrets";

type ConvertInput = {
  title?: string;
  importedText: string;
  prompt: string;
  model?: string;
  speakers?: Array<{ name?: string; role?: string }>;
};

export class OpenAiScriptService {
  async convertArticleToScript(input: ConvertInput): Promise<string> {
    const key = getServerSecret("OPENAI_API_KEY");
    if (!key) throw new Error("OpenAI API key is not configured.");
    const prompt = input.prompt.trim();
    if (!prompt) throw new Error("Conversion prompt is required.");
    const article = input.importedText.trim();
    if (!article) throw new Error("Imported text is empty.");
    const model = (input.model ?? "gpt-4o-mini").trim() || "gpt-4o-mini";
    const speakerLines = (input.speakers ?? [])
      .map((sp) => {
        const name = String(sp.name ?? "").trim();
        const role = String(sp.role ?? "").trim();
        if (!name) return "";
        return role ? `${name} (${role})` : name;
      })
      .filter(Boolean);

    const userPrompt = [
      `Article title: ${input.title?.trim() || "Untitled"}`,
      "",
      speakerLines.length
        ? `Speaker list (use only these labels in the script): ${speakerLines.join(", ")}`
        : "Speaker list: use suitable speaker labels from the prompt.",
      "",
      "Article body:",
      article,
      "",
      "Instruction:",
      prompt,
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content:
              "You convert sports articles into multi-speaker podcast scripts. Return plain text only in SPEAKER: line format. If a speaker list is supplied, use only those speaker labels.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as
      | { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
      | Record<string, unknown>;
    if (!res.ok) {
      const message =
        typeof data === "object" &&
        data &&
        "error" in data &&
        data.error &&
        typeof data.error === "object" &&
        "message" in data.error &&
        typeof data.error.message === "string"
          ? data.error.message
          : `OpenAI request failed (${res.status})`;
      throw new Error(message);
    }
    const content = Array.isArray((data as { choices?: Array<{ message?: { content?: string } }> }).choices)
      ? (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content
      : "";
    const script = typeof content === "string" ? content.trim() : "";
    if (!script) throw new Error("OpenAI returned empty script.");
    return script;
  }
}
