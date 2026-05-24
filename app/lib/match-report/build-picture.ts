import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";
import { assembleEioPromptSections } from "@/app/lib/match-report/eio-summaries";
import type { EventPicture, MatchReportProject } from "@/app/lib/match-report/types";

const SYSTEM_PROMPT = `You are a senior football editor building an Event Picture — a structured editorial brief before writing a match report.

Rules:
- Use ONLY facts from the provided EIO sections. Never invent scorelines, scorers, or stats.
- Brand voice may shape tone and emphasis, never facts.
- Output valid JSON only (no markdown fences).
- keyMoments: 4–8 items with minute when known.
- standfirstHooks: 2–4 punchy hook lines grounded in facts.
- narrativeThreads: 2–4 storylines for the report body.
- factualAnchors: bullet facts that must appear in the final report.
- Use IMPORT_LAYER_SUMMARIES and each digest section to ground angles in imported Sport365, table, stats, Loop Feed, WhoScored, and manual source context.`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1]!.trim() : trimmed;
  return JSON.parse(raw) as unknown;
}

function parseEventPicture(raw: unknown, model: string): EventPicture {
  if (!raw || typeof raw !== "object") throw new Error("Model returned invalid Event Picture JSON.");
  const o = raw as Record<string, unknown>;
  const keyMoments: EventPicture["keyMoments"] = [];
  if (Array.isArray(o.keyMoments)) {
    for (const row of o.keyMoments) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const title = typeof r.title === "string" ? r.title.trim() : "";
      const summary = typeof r.summary === "string" ? r.summary.trim() : "";
      if (!title || !summary) continue;
      keyMoments.push({
        minute: typeof r.minute === "number" ? r.minute : undefined,
        title,
        summary,
      });
    }
  }
  const headlineAngle = typeof o.headlineAngle === "string" ? o.headlineAngle.trim() : "";
  if (!headlineAngle || keyMoments.length === 0) {
    throw new Error("Event Picture missing headlineAngle or keyMoments.");
  }
  return {
    headlineAngle,
    standfirstHooks: Array.isArray(o.standfirstHooks)
      ? o.standfirstHooks.map(String).filter(Boolean).slice(0, 6)
      : [],
    keyMoments,
    narrativeThreads: Array.isArray(o.narrativeThreads)
      ? o.narrativeThreads.map(String).filter(Boolean).slice(0, 6)
      : [],
    factualAnchors: Array.isArray(o.factualAnchors)
      ? o.factualAnchors.map(String).filter(Boolean).slice(0, 12)
      : [],
    toneNotes: typeof o.toneNotes === "string" ? o.toneNotes.trim() : "",
    generatedAt: new Date().toISOString(),
    model,
  };
}

export async function runBuildPictureJob(project: MatchReportProject): Promise<EventPicture> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) {
    throw new Error("OpenAI API key is not configured.");
  }
  const settings = await readStoredSettingsAsync();
  const model =
    settings.languageOpenaiModel?.trim() ||
    process.env.LANGUAGE_OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const userPrompt = `${assembleEioPromptSections(project)}

Return JSON with keys:
headlineAngle (string)
standfirstHooks (string[])
keyMoments ({ minute?: number, title: string, summary: string }[])
narrativeThreads (string[])
factualAnchors (string[])
toneNotes (string)`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const body = (await res.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!res.ok) {
    throw new Error(body.error?.message || `OpenAI HTTP ${res.status}`);
  }
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content.");
  return parseEventPicture(extractJson(content), model);
}
