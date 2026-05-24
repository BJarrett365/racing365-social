import { newLanguageId } from "@/app/lib/language-studio/store";
import type { LanguageJournalistProfile, LanguageKnowledgeFile, LanguageStudioData } from "@/app/lib/language-studio/types";
import { defaultJournalistStats } from "@/app/lib/language-studio/journalist-stats";

function knowledgeFileIdForProfile(profileId: string): string {
  return `lknowledge-journalist-${profileId}`;
}

function buildJournalistKnowledgeContent(profile: LanguageJournalistProfile): string {
  const stats = profile.stats ?? defaultJournalistStats();
  const lines = [
    `# Content Creator: ${profile.name} (${profile.brand})`,
    "",
    profile.bio?.trim() ? `Bio: ${profile.bio.trim()}` : "",
    profile.authorPageUrl ? `Author page: ${profile.authorPageUrl}` : "",
    "",
    "## Style",
    profile.styleNotes.trim() || "No style notes yet.",
    "",
    profile.articleGuidelines?.trim() ? `## Article guidelines\n${profile.articleGuidelines.trim()}` : "",
    "",
    "## Performance & activity",
    `- Performance score: ${stats.performanceScore != null ? Math.round(stats.performanceScore) : "—"}`,
    `- Imported articles: ${stats.importedArticleCount}`,
    `- Exported translations: ${stats.exportedArticleCount}`,
    `- Social posts: ${stats.socialPostCount}`,
    stats.totalPageViews != null ? `- Total page views: ${stats.totalPageViews}` : "",
    stats.totalEngagedMinutes != null ? `- Total engaged minutes: ${stats.totalEngagedMinutes}` : "",
    stats.lastPerformanceImportAt ? `- Last Chartbeat import: ${stats.lastPerformanceImportAt}` : "",
    "",
    profile.aliases?.length ? `Aliases: ${profile.aliases.join(", ")}` : "",
    profile.exampleTitles.length ? `Example titles: ${profile.exampleTitles.slice(0, 6).join(" | ")}` : "",
  ];
  return lines.filter((line) => line !== "").join("\n");
}

/** Upsert journalist-style knowledge file for AI prompts. */
export function syncJournalistKnowledgeFile(
  data: LanguageStudioData,
  profile: LanguageJournalistProfile,
): LanguageKnowledgeFile {
  const id = knowledgeFileIdForProfile(profile.id);
  const now = new Date().toISOString();
  const existing = data.knowledgeFiles[id];
  const row: LanguageKnowledgeFile = {
    id,
    title: `${profile.name} · ${profile.brand} · Content Creator Style`,
    kind: "journalist-style",
    language: "",
    content: buildJournalistKnowledgeContent(profile),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  data.knowledgeFiles[id] = row;
  return row;
}

export function removeJournalistKnowledgeFile(data: LanguageStudioData, profileId: string): void {
  delete data.knowledgeFiles[knowledgeFileIdForProfile(profileId)];
}

export function ensureJournalistKnowledgeFiles(data: LanguageStudioData): void {
  for (const profile of Object.values(data.journalistProfiles)) {
    if (!profile.active && !data.knowledgeFiles[knowledgeFileIdForProfile(profile.id)]) continue;
    syncJournalistKnowledgeFile(data, profile);
  }
}

export function newJournalistKnowledgeFileId(): string {
  return newLanguageId("lknowledge");
}
