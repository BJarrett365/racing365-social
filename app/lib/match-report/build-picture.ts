import { aiChatJsonObject } from "@/app/lib/ai";
import { isMatchPreview } from "@/app/lib/match-report/content-type";
import { assembleMioPrompt } from "@/app/lib/match-report/mio/assemble-mio";
import { parseSignificance } from "@/app/lib/match-report/parse-significance";
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
- Use IMPORT_LAYER_SUMMARIES and each digest section to ground angles in imported Sport365, table, stats, Loop Feed, WhoScored, and manual source context.
- significance must answer post-match stakes: whyCare, whyItMatters, whatHappensNext (table impact, qualification, form narrative).`;

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
    significance: parseSignificance(o.significance),
    generatedAt: new Date().toISOString(),
    model,
  };
}

export async function runBuildPictureJob(project: MatchReportProject): Promise<EventPicture> {
  if (isMatchPreview(project)) {
    throw new Error("match_preview projects use runBuildPreviewPictureJob — not Event Picture.");
  }

  const userPrompt = `${assembleMioPrompt(project)}

Return JSON with keys:
headlineAngle (string)
standfirstHooks (string[])
keyMoments ({ minute?: number, title: string, summary: string }[])
narrativeThreads (string[])
factualAnchors (string[])
toneNotes (string)
significance ({ whyCare, whyItMatters, whatHappensNext, tableImpact?, confidence, sourceLayers })`;

  const { data, meta } = await aiChatJsonObject({
    task: "match_report_analysis",
    system: SYSTEM_PROMPT,
    user: userPrompt,
    temperature: 0.35,
    json: true,
  });
  return parseEventPicture(data, meta.model);
}
