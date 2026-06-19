import { aiChatJsonObject } from "@/app/lib/ai";
import { isMatchPreview } from "@/app/lib/match-report/content-type";
import type { MatchReportFactCheck, MatchReportProject, MediaOutputs } from "@/app/lib/match-report/types";

type RepairJson = {
  headline?: string;
  standfirst?: string;
  reportHtml?: string;
};

function normaliseMediaOutputs(value: RepairJson, current: MediaOutputs): MediaOutputs {
  return {
    ...current,
    headline: String(value.headline ?? current.headline).trim() || current.headline,
    standfirst: String(value.standfirst ?? current.standfirst).trim() || current.standfirst,
    reportHtml: String(value.reportHtml ?? current.reportHtml).trim() || current.reportHtml,
    generatedAt: current.generatedAt,
  };
}

function buildRepairPrompt(project: MatchReportProject, factCheck: MatchReportFactCheck): string {
  const preview = isMatchPreview(project);
  const previewRules = preview
    ? [
        "This is a PRE-MATCH preview — the match has not been played.",
        "Remove or rephrase any invented final score, confirmed XI, or injury claims not supported by imported sources.",
        "Use predicted/expected language for lineups and team news where appropriate.",
        "Do not present odds as certainties; keep responsible gambling tone if odds are mentioned.",
      ]
    : [
        "This is a POST-MATCH report using Report 2.0 sections (The Story, Turning Point, How The Match Was Won, Key Battles, Standout Players, What It Means, What Happens Next, Football365 Verdict).",
        "Do not invent quotes, scorers, statistics, injuries, cards or timelines.",
        "If a direct quote is unsupported, remove it or convert it to a clearly attributed paraphrase.",
        `Always state the score as ${project.homeTeam} ${project.homeScore ?? "?"}-${project.awayScore ?? "?"} ${project.awayTeam} (home-away order). Never use reversed away-home scorelines.`,
      ];

  return [
    `You are repairing a Football365 ${preview ? "match preview" : "match report"} for Plexa Match Report Studio.`,
    "Fix factual issues while preserving article structure, style, brand voice and useful analysis.",
    ...previewRules,
    "Return strict JSON with headline, standfirst and reportHtml only.",
    "",
    "Match:",
    JSON.stringify(
      {
        contentType: project.contentType,
        homeTeam: project.homeTeam,
        awayTeam: project.awayTeam,
        score: preview ? undefined : `${project.homeScore ?? "?"}-${project.awayScore ?? "?"}`,
        competition: project.competition,
        reportFormat: project.reportFormat,
        kickoffIso: project.layers.sixLogic?.facts.kickoffIso,
      },
      null,
      2,
    ),
    "",
    "Fact-check issues to resolve:",
    JSON.stringify(factCheck.issues, null, 2),
    "",
    "Story context / Tier 1 facts:",
    JSON.stringify(factCheck.storyContext, null, 2).slice(0, 12_000),
    "",
    "Current output:",
    JSON.stringify(
      {
        headline: project.mediaOutputs?.headline,
        standfirst: project.mediaOutputs?.standfirst,
        reportHtml: project.mediaOutputs?.reportHtml,
      },
      null,
      2,
    ),
  ].join("\n");
}

export async function repairFactCheckMedia(
  project: MatchReportProject,
  factCheck: MatchReportFactCheck,
): Promise<MediaOutputs> {
  if (!project.mediaOutputs) {
    throw new Error("Generate media outputs before repairing fact-check issues.");
  }

  const { data } = await aiChatJsonObject<RepairJson>({
    task: "premium_regeneration",
    system:
      "You are a precise football editor and fact-check repair assistant. Fix only what the fact-check issues require. Return JSON only.",
    user: buildRepairPrompt(project, factCheck),
    temperature: 0.2,
    json: true,
  });

  return normaliseMediaOutputs(data, project.mediaOutputs);
}

export type { RepairJson };
