import {
  buildF365MatchReportOpenAiPrompt,
  buildF365MatchReportRunwayPrompt,
  buildF365PreviewOpenAiPrompt,
  buildF365PreviewRunwayPrompt,
  f365HeroVarsFromArticle,
  f365PreviewVarsFromArticle,
  f365RunwayArticleHook,
  F365_MATCH_REPORT_SPEC,
  F365_PREVIEW_SPEC,
  type ArticleHeroSource,
} from "@/app/lib/language-studio/f365-text-to-image-prompts";
import type { MatchReportProject } from "@/app/lib/match-report/types";

export function heroArticleSourceFromProject(project: MatchReportProject): ArticleHeroSource {
  const hasScore = project.homeScore != null && project.awayScore != null;
  const fixtureLine = hasScore
    ? `${project.homeTeam} ${project.homeScore}-${project.awayScore} ${project.awayTeam}`
    : `${project.homeTeam} vs ${project.awayTeam}`;
  const headline = project.mediaOutputs?.headline?.trim();
  const title = headline ? `${fixtureLine}: ${headline}` : fixtureLine;
  return {
    title,
    standfirst: project.mediaOutputs?.standfirst?.trim() || project.displayLabel || fixtureLine,
    body: project.mediaOutputs?.reportHtml?.trim() || "",
    category: project.competition,
    tags: [project.competition, project.homeTeam, project.awayTeam, "Match report"].filter(Boolean),
  };
}

export type HeroPromptProvider = "openai" | "higgsfield" | "runway";

export function buildMatchReportHeroPrompt(
  project: MatchReportProject,
  provider: HeroPromptProvider,
): string {
  const article = heroArticleSourceFromProject(project);
  const vars = f365HeroVarsFromArticle(article);
  const snip = { standfirst: article.standfirst, body: article.body };
  if (provider === "runway") {
    return buildF365MatchReportRunwayPrompt(vars, { narrativeHook: f365RunwayArticleHook(snip) });
  }
  return buildF365MatchReportOpenAiPrompt(vars, snip);
}

export function buildPreviewHeroPrompt(
  project: MatchReportProject,
  provider: HeroPromptProvider,
): string {
  const article = heroArticleSourceFromProject(project);
  const vars = f365PreviewVarsFromArticle(article);
  const snip = { standfirst: article.standfirst, body: article.body };
  if (provider === "runway") {
    return buildF365PreviewRunwayPrompt(vars, { narrativeHook: f365RunwayArticleHook(snip) });
  }
  return buildF365PreviewOpenAiPrompt(vars, snip);
}

export { F365_MATCH_REPORT_SPEC, F365_PREVIEW_SPEC };
