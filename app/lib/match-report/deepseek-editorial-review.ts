import { aiChatJsonObject } from "@/app/lib/ai";
import type { DeepSeekEditorialReview } from "@/app/lib/match-report/mio/types";
import { findBannedPhraseHits } from "@/app/lib/match-report/f365-banned-phrases";
import type { MatchReportProject } from "@/app/lib/match-report/types";

type ReviewJson = {
  overallScore?: number;
  insightScore?: number;
  tacticalDepthScore?: number;
  originalityScore?: number;
  repetitionIssues?: string[];
  missingContext?: string[];
  improvementSuggestions?: string[];
  regenRecommended?: boolean;
};

/**
 * DeepSeek editorial critique layer — supports publish decision; never a fact source.
 * Plexa facts and MIO remain source of truth.
 */
export async function runDeepSeekEditorialReview(
  project: MatchReportProject,
  html: string,
): Promise<DeepSeekEditorialReview> {
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12_000);
  const clicheHits = findBannedPhraseHits(plain);

  const { data, meta } = await aiChatJsonObject<ReviewJson>({
    task: "article_analysis",
    forceProvider: "deepseek",
    system: `You are an editorial quality reviewer for Football365. Critique ONLY — do not rewrite the article.
Score 0–10 for insight, tactical depth, originality. Flag repetition, clichés, missing context.
Return strict JSON: overallScore, insightScore, tacticalDepthScore, originalityScore,
repetitionIssues (string[]), missingContext (string[]), improvementSuggestions (string[]), regenRecommended (boolean).
Editorial quality > commercial. Be tough but fair.`,
    user: `Content type: ${project.contentType}\nFixture: ${project.displayLabel}\n\nArticle:\n${plain}`,
    temperature: 0.3,
    json: true,
  });

  return {
    overallScore: Number(data.overallScore ?? 7),
    insightScore: Number(data.insightScore ?? 7),
    tacticalDepthScore: Number(data.tacticalDepthScore ?? 7),
    originalityScore: Number(data.originalityScore ?? 7),
    repetitionIssues: Array.isArray(data.repetitionIssues) ? data.repetitionIssues.map(String) : [],
    clicheHits,
    missingContext: Array.isArray(data.missingContext) ? data.missingContext.map(String) : [],
    improvementSuggestions: Array.isArray(data.improvementSuggestions)
      ? data.improvementSuggestions.map(String)
      : [],
    regenRecommended: Boolean(data.regenRecommended),
    provider: meta.provider,
    model: meta.model,
    generatedAt: new Date().toISOString(),
  };
}
