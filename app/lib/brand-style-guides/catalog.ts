import type { BrandGuidelineSlug } from "@/app/lib/brand-guidelines-store";
import {
  FOOTBALL365_AI_TONE_INSTRUCTION,
  FOOTBALL365_BRAND_KNOWLEDGE_ID,
  FOOTBALL365_BRAND_STYLE_SUMMARY,
  FOOTBALL365_SOCIAL_AI_INSTRUCTION,
  FOOTBALL365_VIDEO_AI_INSTRUCTION,
  PLANET_FOOTBALL_AI_TONE_INSTRUCTION,
  PLANET_FOOTBALL_BRAND_KNOWLEDGE_ID,
  PLANET_FOOTBALL_BRAND_STYLE_SUMMARY,
  PLANET_FOOTBALL_SOCIAL_AI_INSTRUCTION,
  PLANET_FOOTBALL_VIDEO_AI_INSTRUCTION,
  TEAMTALK_AI_TONE_INSTRUCTION,
  TEAMTALK_BRAND_KNOWLEDGE_ID,
  TEAMTALK_BRAND_STYLE_SUMMARY,
  TEAMTALK_SOCIAL_AI_INSTRUCTION,
  TEAMTALK_VIDEO_AI_INSTRUCTION,
} from "@/app/lib/match-report/brand-knowledge";
import type { MatchReportTargetBrand } from "@/app/lib/match-report/types";

export type BrandStyleGuideId = "football365" | "teamtalk" | "planet-football";

export type BrandStyleGuideEntry = {
  id: BrandStyleGuideId;
  label: string;
  shortLabel: string;
  matchReportTarget?: MatchReportTargetBrand;
  brandGuidelineSlug?: BrandGuidelineSlug;
  knowledgeFileId: string;
  pdfUrl: string;
  pdfFilename: string;
  summary: string;
  editorialInstruction: string;
  videoInstruction: string;
  socialInstruction: string;
};

export const BRAND_STYLE_GUIDE_CATALOG: BrandStyleGuideEntry[] = [
  {
    id: "football365",
    label: "Football365 (F365)",
    shortLabel: "F365",
    matchReportTarget: "football365",
    brandGuidelineSlug: "f365",
    knowledgeFileId: FOOTBALL365_BRAND_KNOWLEDGE_ID,
    pdfUrl: "/brand-manuals/football365-brand-manual.pdf",
    pdfFilename: "Football365_Brand_Manual.pdf",
    summary: FOOTBALL365_BRAND_STYLE_SUMMARY,
    editorialInstruction: FOOTBALL365_AI_TONE_INSTRUCTION,
    videoInstruction: FOOTBALL365_VIDEO_AI_INSTRUCTION,
    socialInstruction: FOOTBALL365_SOCIAL_AI_INSTRUCTION,
  },
  {
    id: "teamtalk",
    label: "TEAMtalk",
    shortLabel: "TEAMtalk",
    matchReportTarget: "teamtalk",
    brandGuidelineSlug: "teamtalk",
    knowledgeFileId: TEAMTALK_BRAND_KNOWLEDGE_ID,
    pdfUrl: "/brand-manuals/teamtalk-brand-manual.pdf",
    pdfFilename: "TEAMtalk_Brand_Manual_Cr01.pdf",
    summary: TEAMTALK_BRAND_STYLE_SUMMARY,
    editorialInstruction: TEAMTALK_AI_TONE_INSTRUCTION,
    videoInstruction: TEAMTALK_VIDEO_AI_INSTRUCTION,
    socialInstruction: TEAMTALK_SOCIAL_AI_INSTRUCTION,
  },
  {
    id: "planet-football",
    label: "Planet Football",
    shortLabel: "Planet Football",
    matchReportTarget: "planet-football",
    knowledgeFileId: PLANET_FOOTBALL_BRAND_KNOWLEDGE_ID,
    pdfUrl: "/brand-manuals/planet-football-brand-manual.pdf",
    pdfFilename: "PF_Brand_Manual.pdf",
    summary: PLANET_FOOTBALL_BRAND_STYLE_SUMMARY,
    editorialInstruction: PLANET_FOOTBALL_AI_TONE_INSTRUCTION,
    videoInstruction: PLANET_FOOTBALL_VIDEO_AI_INSTRUCTION,
    socialInstruction: PLANET_FOOTBALL_SOCIAL_AI_INSTRUCTION,
  },
];

export function getBrandStyleGuide(id: BrandStyleGuideId): BrandStyleGuideEntry | undefined {
  return BRAND_STYLE_GUIDE_CATALOG.find((row) => row.id === id);
}

export function getBrandStyleGuideByMatchTarget(target: MatchReportTargetBrand): BrandStyleGuideEntry | undefined {
  return BRAND_STYLE_GUIDE_CATALOG.find((row) => row.matchReportTarget === target);
}

export function getBrandStyleGuideByGuidelineSlug(slug: BrandGuidelineSlug): BrandStyleGuideEntry | undefined {
  return BRAND_STYLE_GUIDE_CATALOG.find((row) => row.brandGuidelineSlug === slug);
}

export function combinedAiAppendix(
  entry: BrandStyleGuideEntry,
  modes: Array<"editorial" | "video" | "social">,
): string {
  const blocks: string[] = [];
  if (modes.includes("editorial") && entry.editorialInstruction.trim()) {
    blocks.push(`[Editorial / articles]\n${entry.editorialInstruction.trim()}`);
  }
  if (modes.includes("video") && entry.videoInstruction.trim()) {
    blocks.push(`[Video / Shorts / voiceover]\n${entry.videoInstruction.trim()}`);
  }
  if (modes.includes("social") && entry.socialInstruction.trim()) {
    blocks.push(`[Social copy]\n${entry.socialInstruction.trim()}`);
  }
  return blocks.join("\n\n");
}
