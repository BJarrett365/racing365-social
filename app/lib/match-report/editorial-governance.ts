import { defaultRewriteStyleForContentStyle } from "@/app/lib/language-studio/content-style-prompts";
import type { LanguageJournalistProfile } from "@/app/lib/language-studio/types";
import {
  creatorTeamSupportLabel,
  creatorTeamSupportMode,
} from "@/app/lib/language-studio/creator-team-support";
import {
  formatJournalistProfilePickerLabel,
  sortJournalistProfilesForPicker,
} from "@/app/lib/language-studio/journalist-stats";
import {
  FOOTBALL365_BRAND_STYLE_SUMMARY,
  PLANET_FOOTBALL_BRAND_STYLE_SUMMARY,
  TEAMTALK_BRAND_STYLE_SUMMARY,
  brandStyleSummaryForTarget,
} from "@/app/lib/match-report/brand-knowledge";
import { MATCH_REPORT_PUBLISHING_EEAT_GUIDELINES } from "@/app/lib/match-report/match-report-publishing-guidelines";
import type { EditorialProfile, LayerWeightMap, MatchReportTargetBrand } from "@/app/lib/match-report/types";

export { MATCH_REPORT_PUBLISHING_EEAT_GUIDELINES } from "@/app/lib/match-report/match-report-publishing-guidelines";

export const DEFAULT_MATCH_REPORT_REWRITE_STYLE = defaultRewriteStyleForContentStyle("Match report");

export const DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES =
  "Preserve quotes exactly in meaning and quote boundaries. Do not add facts, claims, results or opinion. Keep names, teams, numbers, dates and locations unchanged.";

export function formatCreatorStyleFromProfile(profile: LanguageJournalistProfile): string {
  const sports = profile.sports.length ? ` · ${profile.sports.join(", ")}` : "";
  const support = ` · ${creatorTeamSupportLabel(profile)}`;
  return `${profile.name} (${profile.brand}${sports}${support})\n${profile.styleNotes}`;
}

export const BRAND_STYLE_BY_TARGET: Record<MatchReportTargetBrand, string> = {
  football365: FOOTBALL365_BRAND_STYLE_SUMMARY,
  teamtalk: TEAMTALK_BRAND_STYLE_SUMMARY,
  "planet-football": PLANET_FOOTBALL_BRAND_STYLE_SUMMARY,
  sport365: "Stats-focused — xG, ratings, tables",
};

export { brandStyleSummaryForTarget };

export const BRAND_LABEL_BY_TARGET: Record<MatchReportTargetBrand, string> = {
  football365: "Football365",
  teamtalk: "TEAMtalk",
  "planet-football": "Planet Football",
  sport365: "Sport365",
};

const DEFAULT_LAYER_WEIGHTS: Record<MatchReportTargetBrand, LayerWeightMap> = {
  football365: {
    sixLogic: 1,
    sport365Commentary: 0.9,
    leagueTable: 0.85,
    loopFeed: 1.3,
    optaPlayerData: 0.9,
    interviews: 1,
    manualSources: 1,
    playerIntelligence: 1,
  },
  teamtalk: {
    sixLogic: 1,
    sport365Commentary: 0.8,
    leagueTable: 0.75,
    loopFeed: 1.2,
    optaPlayerData: 0.8,
    interviews: 1,
    manualSources: 1,
    playerIntelligence: 0.9,
  },
  "planet-football": {
    sixLogic: 1,
    sport365Commentary: 0.9,
    leagueTable: 0.9,
    loopFeed: 1.1,
    optaPlayerData: 0.7,
    interviews: 1.2,
    manualSources: 1,
    playerIntelligence: 0.9,
  },
  sport365: {
    sixLogic: 1,
    sport365Commentary: 1.3,
    leagueTable: 1.2,
    loopFeed: 0.8,
    optaPlayerData: 1.4,
    interviews: 0.9,
    manualSources: 1,
    playerIntelligence: 1.2,
  },
};

function brandMatchesProfile(targetBrand: MatchReportTargetBrand, profileBrand: string): boolean {
  const label = BRAND_LABEL_BY_TARGET[targetBrand].toLowerCase();
  const normalised = profileBrand.trim().toLowerCase();
  if (normalised === "global") return true;
  return normalised.includes(label) || label.includes(normalised);
}

export function filterJournalistProfiles(
  profiles: LanguageJournalistProfile[],
  targetBrand: MatchReportTargetBrand,
): LanguageJournalistProfile[] {
  return sortJournalistProfilesForPicker(
    profiles
      .filter((row) => row.active)
      .filter((row) => row.sports.length === 0 || row.sports.some((s) => /football/i.test(s)))
      .filter((row) => brandMatchesProfile(targetBrand, row.brand)),
  );
}

export { formatJournalistProfilePickerLabel };

export function buildEditorialProfile(
  input: Partial<EditorialProfile> & Pick<EditorialProfile, "targetBrand">,
  journalist?: LanguageJournalistProfile | null,
): EditorialProfile {
  const brandStyle = input.brandStyle?.trim() || BRAND_STYLE_BY_TARGET[input.targetBrand];
  const useCreatorProfile = Boolean(input.journalistProfileId);
  return {
    sport: "football",
    contentStyle: "Match report",
    targetBrand: input.targetBrand,
    brandStyle,
    rewriteStyle: input.rewriteStyle?.trim() || DEFAULT_MATCH_REPORT_REWRITE_STYLE,
    useCreatorProfile,
    journalistProfileId: useCreatorProfile ? input.journalistProfileId : undefined,
    creatorName: useCreatorProfile ? journalist?.name ?? input.creatorName : undefined,
    creatorTeamSupportMode: useCreatorProfile
      ? journalist
        ? creatorTeamSupportMode(journalist)
        : input.creatorTeamSupportMode
      : input.creatorTeamSupportMode,
    creatorSupportedClub: useCreatorProfile
      ? journalist?.supportedClub?.trim() || input.creatorSupportedClub
      : input.creatorSupportedClub,
    creatorStyleNotes: useCreatorProfile
      ? input.creatorStyleNotes?.trim() ||
        (journalist ? formatCreatorStyleFromProfile(journalist) : "")
      : input.creatorStyleNotes?.trim() || "",
    articleGuidelines: useCreatorProfile
      ? input.articleGuidelines?.trim() ||
        journalist?.articleGuidelines?.trim() ||
        DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES
      : input.articleGuidelines?.trim() || DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES,
    competitionCode: input.competitionCode,
    sportRuleIds: input.sportRuleIds,
    layerWeights: input.layerWeights ?? DEFAULT_LAYER_WEIGHTS[input.targetBrand],
    brandStyleGuide: input.brandStyleGuide?.trim() || undefined,
    knowledgeFileIds: input.knowledgeFileIds,
  };
}

export function editorialBriefChip(profile: EditorialProfile): string {
  const brand = BRAND_LABEL_BY_TARGET[profile.targetBrand];
  const creator = profile.useCreatorProfile && profile.creatorName ? ` · ${profile.creatorName}` : "";
  const support =
    profile.useCreatorProfile && profile.creatorName
      ? profile.creatorTeamSupportMode === "club" && profile.creatorSupportedClub
        ? ` · ${profile.creatorSupportedClub}`
        : profile.creatorTeamSupportMode === "club"
          ? ""
          : " · Neutral"
      : "";
  return `${brand} · ${profile.brandStyle.split("—")[0]?.trim() || profile.brandStyle}${creator}${support}`;
}
