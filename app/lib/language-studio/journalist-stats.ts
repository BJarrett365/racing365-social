import {
  journalistIdentityKey,
  normalizeAuthorIdentity,
} from "@/app/lib/language-studio/author-identity";
import type {
  LanguageArticle,
  LanguageJournalistProfile,
  LanguageStudioData,
  LanguageTranslation,
} from "@/app/lib/language-studio/types";

export function defaultJournalistStats(): NonNullable<LanguageJournalistProfile["stats"]> {
  return {
    importedArticleCount: 0,
    exportedArticleCount: 0,
    socialPostCount: 0,
  };
}

export function profileIdentityKey(profile: Pick<LanguageJournalistProfile, "brand" | "name">): string | null {
  const identity = normalizeAuthorIdentity(profile.name, profile.brand);
  return identity ? journalistIdentityKey(profile.brand, identity) : null;
}

export function articleMatchesProfile(article: LanguageArticle, profile: LanguageJournalistProfile): boolean {
  if (article.journalistProfileId === profile.id) return true;
  if (article.sourceBrand !== profile.brand) return false;
  const articleIdentity = normalizeAuthorIdentity(article.author ?? "", article.sourceBrand);
  const key = profileIdentityKey(profile);
  if (!articleIdentity || !key) return false;
  return journalistIdentityKey(article.sourceBrand, articleIdentity) === key;
}

function aliasMatchesProfile(
  profile: LanguageJournalistProfile,
  raw: string,
  brand?: string,
): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const aliases = profile.aliases ?? [];
  const lower = trimmed.toLowerCase();
  if (aliases.some((alias) => alias.trim().toLowerCase() === lower)) return true;
  const identity = normalizeAuthorIdentity(trimmed, brand ?? profile.brand);
  const profileIdentity = normalizeAuthorIdentity(profile.name, profile.brand);
  if (!identity || !profileIdentity) return false;
  if (brand && brand !== profile.brand) return false;
  return journalistIdentityKey(profile.brand, identity) === journalistIdentityKey(profile.brand, profileIdentity);
}

/** Resolve Loop Feed author/handle to an active journalist profile. */
export function matchJournalistProfileByLoopFeedAuthor(
  profiles: LanguageJournalistProfile[],
  input: { author?: string; handle?: string; brand?: string },
): LanguageJournalistProfile | null {
  const author = input.author?.trim() ?? "";
  const handle = input.handle?.replace(/^@/, "").trim() ?? "";
  const brand = input.brand?.trim();
  const candidates = profiles.filter((row) => row.active);
  for (const profile of candidates) {
    if (brand && profile.brand !== brand) continue;
    if (author && aliasMatchesProfile(profile, author, brand)) return profile;
    if (handle && aliasMatchesProfile(profile, handle, brand)) return profile;
    if (handle && aliasMatchesProfile(profile, `@${handle}`, brand)) return profile;
  }
  return null;
}

function translationExported(translation: LanguageTranslation): boolean {
  return translation.status === "approved" || translation.status === "exported";
}

function countSocialPostsForProfile(data: LanguageStudioData, profileId: string): number {
  let count = 0;
  for (const article of Object.values(data.articles)) {
    if (article.journalistProfileId !== profileId) continue;
    count += article.socialPosts?.length ?? 0;
  }
  for (const translation of Object.values(data.translations)) {
    if (!translationExported(translation)) continue;
    const article = data.articles[translation.articleId];
    if (!article || article.journalistProfileId !== profileId) continue;
    count += translation.socialPosts?.length ?? 0;
  }
  return count;
}

/** Recalculate import/export/social counters for one profile from store data. */
export function recomputeJournalistStats(data: LanguageStudioData, profileId: string): LanguageJournalistProfile | undefined {
  const profile = data.journalistProfiles[profileId];
  if (!profile) return undefined;

  let importedArticleCount = 0;
  let exportedArticleCount = 0;

  for (const article of Object.values(data.articles)) {
    if (!articleMatchesProfile(article, profile)) continue;
    importedArticleCount += 1;
  }

  for (const translation of Object.values(data.translations)) {
    if (!translationExported(translation)) continue;
    const article = data.articles[translation.articleId];
    if (!article || !articleMatchesProfile(article, profile)) continue;
    exportedArticleCount += 1;
  }

  const socialFromPosts = countSocialPostsForProfile(data, profileId);
  const priorSocial = profile.stats?.socialPostCount ?? 0;
  const socialPostCount = Math.max(priorSocial, socialFromPosts);

  const next: LanguageJournalistProfile = {
    ...profile,
    stats: {
      ...defaultJournalistStats(),
      ...profile.stats,
      importedArticleCount,
      exportedArticleCount,
      socialPostCount,
    },
  };
  data.journalistProfiles[profileId] = next;
  return next;
}

export function formatJournalistProfilePickerLabel(profile: LanguageJournalistProfile): string {
  const stats = profile.stats ?? defaultJournalistStats();
  const score =
    stats.performanceScore != null ? `Score ${Math.round(stats.performanceScore)}` : "Score —";
  return [
    profile.name,
    profile.brand,
    score,
    `${stats.importedArticleCount} imported`,
    `${stats.exportedArticleCount} exported`,
    `${stats.socialPostCount} social`,
  ].join(" · ");
}

export function sortJournalistProfilesForPicker(profiles: LanguageJournalistProfile[]): LanguageJournalistProfile[] {
  return [...profiles].sort((a, b) => {
    const scoreA = a.stats?.performanceScore ?? -1;
    const scoreB = b.stats?.performanceScore ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const importedDiff = (b.stats?.importedArticleCount ?? 0) - (a.stats?.importedArticleCount ?? 0);
    if (importedDiff !== 0) return importedDiff;
    return a.name.localeCompare(b.name);
  });
}

export async function incrementJournalistSocialPostCounts(countsByProfileId: Record<string, number>): Promise<void> {
  const entries = Object.entries(countsByProfileId).filter(([, count]) => count > 0);
  if (!entries.length) return;
  const { readLanguageStudioData, writeLanguageStudioData } = await import("@/app/lib/language-studio/store");
  const { syncJournalistKnowledgeFile } = await import("@/app/lib/language-studio/journalist-knowledge-sync");
  const data = await readLanguageStudioData();
  for (const [profileId, increment] of entries) {
    const profile = data.journalistProfiles[profileId];
    if (!profile) continue;
    profile.stats = {
      ...defaultJournalistStats(),
      ...profile.stats,
      socialPostCount: (profile.stats?.socialPostCount ?? 0) + increment,
    };
    profile.updatedAt = new Date().toISOString();
    recomputeJournalistStats(data, profileId);
    syncJournalistKnowledgeFile(data, data.journalistProfiles[profileId]!);
  }
  await writeLanguageStudioData(data);
}
