import { NextResponse } from "next/server";
import { readLanguageStudioData } from "@/app/lib/language-studio/store";
import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function truncate(value: string, max = 900): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function parseSuggestions(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

export async function GET() {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  const data = await readLanguageStudioData();
  const counts = {
    sourceBrands: Object.keys(data.sourceBrands).length,
    knowledgeFiles: Object.keys(data.knowledgeFiles).length,
    journalistProfiles: Object.keys(data.journalistProfiles).length,
    sportRules: Object.keys(data.sportRules).length,
    promptRules: Object.keys(data.promptRules).length,
    glossary: Object.keys(data.glossary).length,
    protectedTerms: Object.keys(data.protectedTerms).length,
    guardrails: Object.keys(data.guardrails).length,
  };

  if (!key) {
    return NextResponse.json({
      ok: false,
      status: "missing_key",
      counts,
      summary: "OpenAI is not configured yet, so the Knowledge Base can show stored learning but cannot run an AI review.",
      suggestions: [
        "Add or verify OPENAI_API_KEY in Admin before running AI Knowledge Assistant.",
        "Expand sport rules for every active sport before enabling automated rewrites.",
        "Keep creator profiles tied to source brands so imported journalist style can shape output.",
      ],
    });
  }

  const settings = await readStoredSettingsAsync();
  const model = settings.languageOpenaiModel?.trim() || "gpt-4o-mini";
  const sportRules = Object.values(data.sportRules).map((rule) => ({
    sport: rule.sport,
    keyTerms: rule.keyTerms.slice(0, 12),
    dataRules: truncate(rule.dataRules, 400),
  }));
  const promptRules = Object.values(data.promptRules).slice(0, 12).map((rule) => ({
    contentType: rule.contentType,
    instruction: truncate(rule.promptInstruction, 350),
    priority: rule.priority,
  }));
  const creators = Object.values(data.journalistProfiles).slice(0, 12).map((profile) => ({
    name: profile.name,
    brand: profile.brand,
    sports: profile.sports,
    styleNotes: truncate(profile.styleNotes, 350),
  }));

  const prompt = [
    "You are reviewing the Planet Sport Studio Knowledge Base for sports editorial AI workflows.",
    "Return exactly 5-8 concise bullet suggestions. Focus on missing governance, sport-rule coverage, style learning and prompt safety.",
    "Do not include secrets or ask for API keys.",
    "",
    JSON.stringify({ counts, sportRules, promptRules, creators }, null, 2),
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: "You are a concise senior sports media operations editor.",
          },
          { role: "user", content: prompt },
        ],
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as OpenAiChatResponse;
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: res.status === 401 || res.status === 403 ? "permission_required" : "provider_error",
          counts,
          summary: json.error?.message || `OpenAI Knowledge Base review failed (${res.status}).`,
          suggestions: [],
        },
        { status: 200 },
      );
    }

    const content = json.choices?.[0]?.message?.content?.trim() || "";
    return NextResponse.json({
      ok: true,
      status: "ready",
      counts,
      model,
      summary: "AI Knowledge Assistant reviewed the current governance sources.",
      suggestions: parseSuggestions(content),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        status: "provider_error",
        counts,
        summary: e instanceof Error ? e.message : "OpenAI Knowledge Base review failed.",
        suggestions: [],
      },
      { status: 200 },
    );
  }
}
