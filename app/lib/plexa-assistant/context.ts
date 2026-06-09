import "server-only";

import { readBrandGuidelinesFile } from "@/app/lib/brand-guidelines-store";
import { readLanguageStudioData } from "@/app/lib/language-studio/store";
import { BRAND_LABEL_BY_TARGET } from "@/app/lib/match-report/editorial-governance";
import { assembleEioPromptSections } from "@/app/lib/match-report/eio-summaries";
import { buildMatchStoryContext } from "@/app/lib/match-report/story-engine";
import { getMatchReportRepository } from "@/app/lib/match-report/store";
import type { MatchReportProject } from "@/app/lib/match-report/types";

export type PlexaAssistantContextInput = {
  projectId?: string;
};

const MAX_BRAND_CHARS = 4000;
const MAX_PROFILE_CHARS = 3000;
const MAX_PROJECT_CHARS = 9000;

function truncate(value: string, max: number): string {
  const text = value.replace(/\s+\n/g, "\n").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

function buildPlatformContext(): string {
  return [
    "PLEXA PLATFORM CONTEXT",
    "Ask Plexa should help users with advice, Q&A, research and workflow guidance across the whole platform, not only match reports.",
    "- Dashboard: overall entry point for Plexa workflows.",
    "- Match Report Builder: SixLogics import, EIO, story engine, fact-check, article score, player intelligence, media output and publishing workflow.",
    "- Language Studio: source imports, rewrites, translations, Content Creator profiles, brand voice, guardrails and knowledge files.",
    "- Data Studio: fixture feeds, Loop Feed research intelligence, image prompts and source-data inspection.",
    "- Brand Guidelines: brand manuals, style rules, tone guidance and AI-facing editorial instructions.",
    "- Configure/Admin: provider keys, OpenAI setup, platform integrations and operational settings.",
    "- Library/Tools/Schedule: saved assets, utilities, publishing workflow and editorial planning.",
    "When the user asks how to do something in Plexa, explain where to go, what data is needed, what to check, and any risks or next steps.",
  ].join("\n");
}

function brandSlugForProject(project?: MatchReportProject): "f365" | "teamtalk" | "plexa" {
  if (project?.editorial.targetBrand === "football365") return "f365";
  if (project?.editorial.targetBrand === "teamtalk") return "teamtalk";
  return "plexa";
}

async function buildBrandContext(project?: MatchReportProject): Promise<string> {
  const guidelines = await readBrandGuidelinesFile();
  const primarySlug = brandSlugForProject(project);
  const primary = guidelines.brands[primarySlug];
  const plexa = guidelines.brands.plexa;
  return [
    `PRIMARY BRAND GUIDE (${primary.label})`,
    truncate(primary.body, MAX_BRAND_CHARS),
    "",
    "PLEXA PRODUCT GUIDE",
    truncate(plexa.body, 1200),
  ].join("\n");
}

async function buildCreatorContext(project?: MatchReportProject): Promise<string> {
  const language = await readLanguageStudioData();
  const activeProfiles = Object.values(language.journalistProfiles)
    .filter((profile) => profile.active)
    .filter((profile) => {
      if (!project?.editorial.targetBrand) return true;
      const brand = BRAND_LABEL_BY_TARGET[project.editorial.targetBrand].toLowerCase();
      return profile.brand.toLowerCase().includes(brand) || brand.includes(profile.brand.toLowerCase()) || profile.brand.toLowerCase() === "global";
    })
    .slice(0, 8)
    .map((profile) =>
      [
        `- ${profile.name} (${profile.brand})`,
        profile.styleNotes ? `  Style: ${profile.styleNotes}` : "",
        profile.articleGuidelines ? `  Guidelines: ${profile.articleGuidelines}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  const selected = project?.editorial.useCreatorProfile
    ? [
        `SELECTED CREATOR: ${project.editorial.creatorName ?? project.editorial.journalistProfileId ?? "Unknown"}`,
        project.editorial.creatorStyleNotes ? `Creator style notes:\n${project.editorial.creatorStyleNotes}` : "",
        project.editorial.articleGuidelines ? `Creator/editorial guidelines:\n${project.editorial.articleGuidelines}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return truncate([selected, "ACTIVE CREATOR PROFILES", activeProfiles || "(none loaded)"].filter(Boolean).join("\n\n"), MAX_PROFILE_CHARS);
}

async function buildEditorialBrainContext(): Promise<string> {
  const language = await readLanguageStudioData();
  const proposals = Object.values(language.editorialLearningProposals ?? {});
  const factChecks = Object.values(language.articleFactChecks ?? {});
  const pending = proposals.filter((proposal) => proposal.status === "pending");
  const latestPending = pending
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map((proposal) => `- ${proposal.title} (${proposal.type}, ${proposal.confidence}%): ${proposal.summary}`)
    .join("\n");
  return [
    "EDITORIAL BRAIN STATUS",
    `Learning proposals: ${proposals.length} total, ${pending.length} pending.`,
    `Article fact checks: ${factChecks.length} stored.`,
    latestPending ? `Pending proposals:\n${latestPending}` : "Pending proposals: none.",
    "OpenAI proposes learning; Plexa memory changes only after editor approval.",
  ].join("\n");
}

async function loadProject(projectId?: string): Promise<MatchReportProject | null> {
  if (!projectId) return null;
  return getMatchReportRepository().getProject(projectId);
}

function buildProjectContext(project: MatchReportProject): string {
  const parts = [
    `MATCH REPORT PROJECT: ${project.displayLabel}`,
    `Brand: ${BRAND_LABEL_BY_TARGET[project.editorial.targetBrand]}`,
    `Match: ${project.homeTeam} ${project.homeScore ?? "?"}-${project.awayScore ?? "?"} ${project.awayTeam}`,
    "",
    "STORY ENGINE",
    JSON.stringify(buildMatchStoryContext(project), null, 2),
    "",
    project.factCheck
      ? ["FACT CHECK", JSON.stringify(project.factCheck, null, 2)].join("\n")
      : "FACT CHECK\n(not run)",
    "",
    project.mediaOutputs
      ? [
          "CURRENT REPORT OUTPUT",
          `Headline: ${project.mediaOutputs.headline}`,
          `Standfirst: ${project.mediaOutputs.standfirst}`,
          truncate(project.mediaOutputs.reportHtml.replace(/<[^>]+>/g, " "), 2200),
        ].join("\n")
      : "CURRENT REPORT OUTPUT\n(not generated)",
    "",
    "EIO SUMMARY",
    truncate(assembleEioPromptSections(project), 2800),
  ];
  return truncate(parts.join("\n"), MAX_PROJECT_CHARS);
}

export async function buildPlexaAssistantContext(input: PlexaAssistantContextInput = {}): Promise<string> {
  const project = await loadProject(input.projectId);
  const sections = [
    "PLEXA ASSISTANT CONTEXT",
    "Use this context to help editors research, fact-check and improve journalism. Prefer the user's live question over generic advice.",
    "",
    buildPlatformContext(),
    "",
    await buildBrandContext(project ?? undefined),
    "",
    await buildCreatorContext(project ?? undefined),
    "",
    await buildEditorialBrainContext(),
    "",
    project ? buildProjectContext(project) : "MATCH REPORT PROJECT CONTEXT\n(none supplied)",
  ];
  return sections.join("\n");
}

export const PLEXA_ASSISTANT_SYSTEM_PROMPT = `You are Plexa Assistant, an editorial research and production assistant for Planet Sport Studio.

Core rules:
- Help with the whole Plexa platform: workflow advice, setup questions, Q&A, research, troubleshooting and editorial production guidance.
- Help editors research, fact-check, plan and improve sports journalism.
- Use approved web research when needed: ESPN, Sky Sports, BBC, Reuters, Premier League, official club feeds, official competition feeds and direct source pages.
- Never let web search override Tier 1 match data from EIO/SixLogic/Opta/Sofascore-style structured feeds.
- Treat Loop Feed as research, journalist intelligence and style/context signals, not as automatic embeds.
- Quotes require source attribution. If not confirmed, mark them unverified or suggest paraphrase.
- Brand style and Content Creator profiles are central. Give specific advice on voice, headline instincts, rhythm, humour/opinion and tone.
- Be concise, practical and editor-friendly.`;
