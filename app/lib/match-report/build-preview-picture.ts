import { aiChatJsonObject } from "@/app/lib/ai";
import { assembleMioPrompt } from "@/app/lib/match-report/mio/assemble-mio";
import type { PreviewPicture } from "@/app/lib/match-report/mio/types";
import { parseSignificance } from "@/app/lib/match-report/parse-significance";
import { extractTeamIntelligence } from "@/app/lib/match-report/team-intelligence";
import type { MatchReportProject } from "@/app/lib/match-report/types";

const SYSTEM_PROMPT = `You are a senior Football365 editor building a Preview Picture — structured pre-match editorial brief.

Rules:
- Use ONLY facts from the MIO sections. Never invent injuries, line-ups, odds or quotes.
- Team news must match Team Intelligence confidence labels (Confirmed / Expected / Predicted / Probable changes).
- Exclude social rumours — Tier 1–2 sources only for team news.
- Brand voice 70%, creator 30%.
- Output valid JSON only (no markdown fences).
- significance must answer: whyCare, whyItMatters, whatHappensNext.
- keyBattles: 2–4 items grounded in tactical matchup from the feed.`;

function parsePreviewPicture(raw: unknown, model: string): PreviewPicture {
  if (!raw || typeof raw !== "object") throw new Error("Model returned invalid Preview Picture JSON.");
  const o = raw as Record<string, unknown>;
  const headlineAngle = typeof o.headlineAngle === "string" ? o.headlineAngle.trim() : "";
  if (!headlineAngle) throw new Error("Preview Picture missing headlineAngle.");

  return {
    headlineAngle,
    standfirstHooks: Array.isArray(o.standfirstHooks) ? o.standfirstHooks.map(String).filter(Boolean).slice(0, 6) : [],
    storyThread: typeof o.storyThread === "string" ? o.storyThread.trim() : "",
    stateOfPlay: typeof o.stateOfPlay === "string" ? o.stateOfPlay.trim() : "",
    formContext: typeof o.formContext === "string" ? o.formContext.trim() : "",
    tacticalPreview: typeof o.tacticalPreview === "string" ? o.tacticalPreview.trim() : "",
    keyBattles: Array.isArray(o.keyBattles) ? o.keyBattles.map(String).filter(Boolean).slice(0, 6) : [],
    teamNewsAngles: Array.isArray(o.teamNewsAngles) ? o.teamNewsAngles.map(String).filter(Boolean).slice(0, 8) : [],
    predictedXiNotes: typeof o.predictedXiNotes === "string" ? o.predictedXiNotes.trim() : "",
    whatCouldDecide: typeof o.whatCouldDecide === "string" ? o.whatCouldDecide.trim() : "",
    aiPrediction: typeof o.aiPrediction === "string" ? o.aiPrediction.trim() : undefined,
    verdict: typeof o.verdict === "string" ? o.verdict.trim() : "",
    whatHappensNext: typeof o.whatHappensNext === "string" ? o.whatHappensNext.trim() : "",
    significance: parseSignificance(o.significance),
    factualAnchors: Array.isArray(o.factualAnchors) ? o.factualAnchors.map(String).filter(Boolean).slice(0, 12) : [],
    toneNotes: typeof o.toneNotes === "string" ? o.toneNotes.trim() : "",
    generatedAt: new Date().toISOString(),
    model,
  };
}

export type BuildPreviewPictureResult = {
  previewPicture: PreviewPicture;
  teamIntelligence: ReturnType<typeof extractTeamIntelligence>;
};

export async function runBuildPreviewPictureJob(project: MatchReportProject): Promise<BuildPreviewPictureResult> {
  const teamIntelligence = extractTeamIntelligence(project);
  const userPrompt = `${assembleMioPrompt(project)}

TEAM_INTELLIGENCE:
${teamIntelligence.digest}

Return JSON with keys:
headlineAngle, standfirstHooks (string[]), storyThread, stateOfPlay, formContext,
tacticalPreview, keyBattles (string[]), teamNewsAngles (string[]), predictedXiNotes,
whatCouldDecide, aiPrediction (optional), verdict, whatHappensNext,
significance ({ whyCare, whyItMatters, whatHappensNext, tableImpact?, confidence, sourceLayers }),
factualAnchors (string[]), toneNotes`;

  const { data, meta } = await aiChatJsonObject({
    task: "preview_analysis",
    system: SYSTEM_PROMPT,
    user: userPrompt,
    temperature: 0.35,
    json: true,
  });

  return {
    previewPicture: parsePreviewPicture(data, meta.model),
    teamIntelligence,
  };
}
