import { NextResponse } from "next/server";
import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";
import {
  PLEXA_ASSISTANT_SYSTEM_PROMPT,
  buildPlexaAssistantContext,
} from "@/app/lib/plexa-assistant/context";
import {
  extractResponseText,
  messagesToResponsesInput,
  type PlexaAssistantMessage,
  type OpenAiResponseOutput,
} from "@/app/lib/plexa-assistant/openai-responses";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = {
  messages?: PlexaAssistantMessage[];
  projectId?: string;
};

const APPROVED_SOURCE_PROMPT = `Approved external research sources include ESPN, Sky Sports, BBC, Reuters, Premier League, official club websites, official club social feeds and official competition feeds. Prefer these sources and cite them when used.`;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const latestUser = [...messages].reverse().find((message) => message.role === "user" && message.content.trim());
    if (!latestUser) return NextResponse.json({ error: "Ask a question first." }, { status: 400 });

    const key = await getServerSecretAsync("OPENAI_API_KEY");
    if (!key) return NextResponse.json({ error: "OpenAI API key is not configured." }, { status: 400 });

    const settings = await readStoredSettingsAsync();
    const model =
      process.env.PLEXA_ASSISTANT_MODEL?.trim() ||
      settings.languageOpenaiModel?.trim() ||
      process.env.LANGUAGE_OPENAI_MODEL?.trim() ||
      "gpt-4o-mini";
    const context = await buildPlexaAssistantContext({ projectId: body.projectId });
    const input = messagesToResponsesInput(messages);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: `${PLEXA_ASSISTANT_SYSTEM_PROMPT}\n\n${APPROVED_SOURCE_PROMPT}\n\n${context}`,
          },
          ...input,
        ],
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
      }),
    });

    const data = (await response.json()) as OpenAiResponseOutput & { error?: { message?: string } };
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || `OpenAI HTTP ${response.status}` },
        { status: 500 },
      );
    }
    const extracted = extractResponseText(data);
    if (!extracted.text) return NextResponse.json({ error: "OpenAI returned an empty response." }, { status: 500 });
    return NextResponse.json({ answer: extracted.text, sources: extracted.sources, model });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Assistant request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
