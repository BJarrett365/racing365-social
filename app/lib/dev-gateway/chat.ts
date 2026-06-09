import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";

export type DevGatewayMode =
  | "ask_openai"
  | "ask_cursor"
  | "build_cursor_task"
  | "review_cursor_plan"
  | "review_code"
  | "save_learning";

export type DevGatewaySaveableLearning = {
  type: "knowledge" | "prompt_rule" | "creator_profile" | "dev_note" | "none";
  title: string;
  content: string;
  confidence: number;
};

export type DevGatewayChatResponse = {
  summary: string;
  recommendation: string;
  steps: string[];
  risks: string[];
  filesLikelyAffected: string[];
  cursorPrompt: string;
  testPlan: string[];
  saveableLearning: DevGatewaySaveableLearning;
};

export type DevGatewayUploadedFile = {
  name: string;
  type: string;
  size: number;
  content: string;
  dataUrl?: string;
};

export const EMPTY_DEV_GATEWAY_CHAT_RESPONSE: DevGatewayChatResponse = {
  summary: "",
  recommendation: "",
  steps: [],
  risks: [],
  filesLikelyAffected: [],
  cursorPrompt: "",
  testPlan: [],
  saveableLearning: {
    type: "none",
    title: "",
    content: "",
    confidence: 0,
  },
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeLearningType(value: unknown): DevGatewaySaveableLearning["type"] {
  if (value === "knowledge" || value === "prompt_rule" || value === "creator_profile" || value === "dev_note") return value;
  return "none";
}

export function normalizeDevGatewayChatResponse(value: unknown): DevGatewayChatResponse {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const learning = row.saveableLearning && typeof row.saveableLearning === "object"
    ? (row.saveableLearning as Record<string, unknown>)
    : {};
  return {
    summary: String(row.summary ?? "").trim(),
    recommendation: String(row.recommendation ?? "").trim(),
    steps: asStringArray(row.steps),
    risks: asStringArray(row.risks),
    filesLikelyAffected: asStringArray(row.filesLikelyAffected),
    cursorPrompt: String(row.cursorPrompt ?? "").trim(),
    testPlan: asStringArray(row.testPlan),
    saveableLearning: {
      type: normalizeLearningType(learning.type),
      title: String(learning.title ?? "").trim(),
      content: String(learning.content ?? "").trim(),
      confidence: Math.min(100, Math.max(0, Math.round(Number(learning.confidence ?? 0)))),
    },
  };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    throw new Error("OpenAI returned invalid JSON.");
  }
}

function modeInstruction(mode: DevGatewayMode): string {
  switch (mode) {
    case "build_cursor_task":
      return "Convert the answer into a clear Cursor implementation prompt with small safe steps, affected files, risks and test plan.";
    case "ask_cursor":
      return "Prepare a direct Cursor-ready task response. Include the exact prompt Cursor should receive, smallest safe implementation steps, files likely affected, risks and tests. Do not claim Cursor has executed anything.";
    case "review_cursor_plan":
      return "Review Cursor's plan for risks, missing steps, data model issues, safer build order and missing tests.";
    case "review_code":
      return "Review pasted code, file paths or diffs. Prioritise bugs, security, broken routes, data loss, regressions and missing tests.";
    case "save_learning":
      return "Turn useful content into a proposed learning item. Do not write live knowledge; prepare saveableLearning for approval.";
    case "ask_openai":
    default:
      return [
        "Talk directly to the admin as a conversational assistant.",
        "Put the natural reply in summary, written in first/second person where helpful.",
        "Do not describe the user's prompt or say 'the user is asking'.",
        "Only fill recommendation, risks, testPlan, filesLikelyAffected or cursorPrompt when the admin explicitly asks for planning, review, Cursor handoff or QA.",
        "For normal chat, keep recommendation empty, risks empty, testPlan empty, filesLikelyAffected empty, cursorPrompt empty and saveableLearning.type as none.",
      ].join(" ");
  }
}

export async function runDevGatewayChat(params: {
  mode: DevGatewayMode;
  userPrompt: string;
  selectedContext: Record<string, unknown>;
  currentPage?: string;
  uploadedFiles?: DevGatewayUploadedFile[];
}): Promise<{ response: DevGatewayChatResponse; model: string }> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) throw new Error("OpenAI API key is not configured.");
  const settings = await readStoredSettingsAsync();
  const model = settings.languageOpenaiModel?.trim() || process.env.LANGUAGE_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const payload = {
    mode: params.mode,
    userPrompt: params.userPrompt.slice(0, 16000),
    selectedContext: params.selectedContext,
    currentPage: params.currentPage ?? "",
    project: "Plexa",
    instruction:
      "You are the planning and review layer for Plexa. Do not invent facts. Ask for missing context only when essential. Prefer safe, testable implementation steps.",
  };
  const uploadedFiles = (params.uploadedFiles ?? []).slice(0, 8);
  const textFileContext = uploadedFiles
    .filter((file) => !file.dataUrl && file.content)
    .map((file) => `--- ${file.name} (${file.type || "unknown"}, ${file.size} bytes) ---\n${file.content}`)
    .join("\n\n");
  const imageFiles = uploadedFiles.filter((file) => file.dataUrl?.startsWith("data:image/"));

  if (params.mode === "ask_openai") {
    const userText = [
      params.userPrompt.slice(0, 16000),
      textFileContext ? `Temporary uploaded file context:\n${textFileContext}` : "",
      imageFiles.length ? `Temporary uploaded images attached: ${imageFiles.map((file) => file.name).join(", ")}` : "",
      Object.keys(params.selectedContext).length ? `Selected Plexa context:\n${JSON.stringify(params.selectedContext, null, 2).slice(0, 12000)}` : "",
    ].filter(Boolean).join("\n\n");
    const content: Array<Record<string, unknown>> = [{ type: "text", text: userText }];
    for (const file of imageFiles) {
      content.push({ type: "image_url", image_url: { url: file.dataUrl, detail: "auto" } });
    }
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
            content: [
              "You are Plexa Gateway, a conversational OpenAI assistant inside the Plexa admin product.",
              "Talk directly to the admin in a natural, helpful way.",
              "Do not describe the prompt. Do not say 'the user is asking'.",
              "If files or images are attached, use them as temporary chat context only.",
              "Never claim anything has been saved to Library, Knowledge Base, prompts or creator profiles unless the admin explicitly chooses a save action.",
              "If asked to plan implementation, keep it practical and safe.",
            ].join(" "),
          },
          { role: "user", content },
        ],
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message || `OpenAI gateway chat failed (${res.status}).`);
    const summary = json.choices?.[0]?.message?.content?.trim() || "I did not get a response back from OpenAI.";
    return { response: { ...EMPTY_DEV_GATEWAY_CHAT_RESPONSE, summary }, model };
  }

  const prompt = [
    modeInstruction(params.mode),
    "",
    "Safety rules:",
    "- OpenAI is thinking/review only; Plexa stores approved truth and Cursor builds.",
    "- Never approve production or merge automatically.",
    "- Never recommend automatic writes to knowledge, prompts, creator profiles, reporter weighting or fact-check rules.",
    "- All learning must go to an approval queue.",
    "- No secrets, no API keys, no full database dumps.",
    "- Prefer smallest safe implementation steps.",
    "",
    "Return strict JSON matching this exact shape:",
    JSON.stringify(EMPTY_DEV_GATEWAY_CHAT_RESPONSE, null, 2),
    "",
    "Structured request:",
    JSON.stringify({
      ...payload,
      uploadedFiles: uploadedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        content: file.content,
      })),
    }, null, 2),
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a senior product and engineering reviewer for Plexa. Return strict JSON only." },
        { role: "user", content: prompt },
      ],
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message || `OpenAI gateway chat failed (${res.status}).`);
  const content = json.choices?.[0]?.message?.content ?? "{}";
  return { response: normalizeDevGatewayChatResponse(extractJsonObject(content)), model };
}
