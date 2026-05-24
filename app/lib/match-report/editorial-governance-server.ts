import "server-only";

import { readLanguageStudioData } from "@/app/lib/language-studio/store";
import type { LanguageJournalistProfile, LanguageKnowledgeFile, LanguagePromptRule, LanguageSportRule } from "@/app/lib/language-studio/types";
import {
  aiToneFromKnowledgeFile,
  pickBrandKnowledgeFiles,
} from "@/app/lib/match-report/brand-knowledge";
import { buildEditorialProfile } from "@/app/lib/match-report/editorial-governance";
import type { EditorialProfile, MatchReportTargetBrand } from "@/app/lib/match-report/types";

export type ResolvedEditorialContext = {
  profile: EditorialProfile;
  journalist: LanguageJournalistProfile | null;
  promptRules: LanguagePromptRule[];
  sportRules: LanguageSportRule[];
  knowledgeFiles: LanguageKnowledgeFile[];
};

function resolveBrandKnowledge(
  files: LanguageKnowledgeFile[],
  targetBrand: MatchReportTargetBrand,
): { knowledgeFileIds: string[]; brandStyleGuide?: string } {
  if (files.length === 0) return { knowledgeFileIds: [] };
  const aiTone = aiToneFromKnowledgeFile(files[0]);
  return {
    knowledgeFileIds: files.map((row) => row.id),
    brandStyleGuide: aiTone,
  };
}

export async function resolveEditorialContext(
  input: Partial<EditorialProfile> & Pick<EditorialProfile, "targetBrand">,
): Promise<ResolvedEditorialContext> {
  const data = await readLanguageStudioData();
  const journalist =
    input.journalistProfileId && input.useCreatorProfile
      ? (data.journalistProfiles[input.journalistProfileId] ?? null)
      : null;
  const knowledgeFiles = pickBrandKnowledgeFiles(data.knowledgeFiles, input.targetBrand);
  const brandKnowledge = resolveBrandKnowledge(knowledgeFiles, input.targetBrand);
  const profile = buildEditorialProfile(
    {
      ...input,
      ...brandKnowledge,
      brandStyleGuide: input.brandStyleGuide ?? brandKnowledge.brandStyleGuide,
    },
    journalist,
  );
  const promptRules = Object.values(data.promptRules)
    .filter((row) => row.active && /match report/i.test(row.contentType))
    .sort((a, b) => b.priority - a.priority);
  const sportRules = Object.values(data.sportRules).filter((row) => /football/i.test(row.sport));
  return { profile, journalist, promptRules, sportRules, knowledgeFiles };
}
