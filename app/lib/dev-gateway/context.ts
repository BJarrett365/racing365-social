import "server-only";

import { readBrandGuidelinesFile } from "@/app/lib/brand-guidelines-store";
import { readLanguageStudioData } from "@/app/lib/language-studio/store";
import { readLoopFeedPriorityReporters } from "@/app/lib/tools/loop-feed-priority-reporters-store";
import { readDevGatewayStore } from "@/app/lib/dev-gateway/store";

export type DevGatewayContextKey =
  | "article_studio"
  | "knowledge_base"
  | "language_studio"
  | "creator_profiles"
  | "prompt_rules"
  | "quality_checks"
  | "loop_feed"
  | "priority_reporters"
  | "match_report_builder"
  | "brand_guides"
  | "recent_dev_notes"
  | "current_page_context";

const LABELS: Record<DevGatewayContextKey, string> = {
  article_studio: "Article Studio",
  knowledge_base: "Knowledge Base",
  language_studio: "Language Studio",
  creator_profiles: "Creator Profiles",
  prompt_rules: "Prompt Rules",
  quality_checks: "Quality Checks",
  loop_feed: "Loop Feed",
  priority_reporters: "Priority Reporters",
  match_report_builder: "Match Report Builder",
  brand_guides: "Brand Guides",
  recent_dev_notes: "Recent Dev Notes",
  current_page_context: "Current Page Context",
};

function truncate(value: string, max = 1400): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function buildDevGatewayContext(keys: DevGatewayContextKey[], currentPage?: string): Promise<Record<string, unknown>> {
  const selected = new Set(keys);
  const out: Record<string, unknown> = {};
  const dataNeeded = keys.some((key) =>
    [
      "article_studio",
      "knowledge_base",
      "language_studio",
      "creator_profiles",
      "prompt_rules",
      "quality_checks",
      "match_report_builder",
    ].includes(key),
  );
  const data = dataNeeded ? await readLanguageStudioData() : null;

  if (selected.has("article_studio") && data) {
    out[LABELS.article_studio] = {
      articles: Object.keys(data.articles).length,
      translations: Object.keys(data.translations).length,
      recentArticles: Object.values(data.articles).slice(-6).map((article) => ({
        id: article.id,
        title: article.title,
        sourceBrand: article.sourceBrand,
        status: article.status,
      })),
    };
  }
  if (selected.has("knowledge_base") && data) {
    out[LABELS.knowledge_base] = {
      knowledgeFiles: Object.keys(data.knowledgeFiles).length,
      proposals: Object.keys(data.editorialLearningProposals ?? {}).length,
      pendingProposals: Object.values(data.editorialLearningProposals ?? {}).filter((proposal) => proposal.status === "pending").length,
    };
  }
  if (selected.has("language_studio") && data) {
    out[LABELS.language_studio] = {
      sourceBrands: Object.keys(data.sourceBrands).length,
      glossary: Object.keys(data.glossary).length,
      protectedTerms: Object.keys(data.protectedTerms).length,
      guardrails: Object.keys(data.guardrails).length,
    };
  }
  if (selected.has("creator_profiles") && data) {
    out[LABELS.creator_profiles] = Object.values(data.journalistProfiles).slice(0, 12).map((profile) => ({
      id: profile.id,
      name: profile.name,
      brand: profile.brand,
      sports: profile.sports,
      styleNotes: truncate(profile.styleNotes, 500),
      hasCreatorDNA: Boolean(profile.creatorDNA),
    }));
  }
  if (selected.has("prompt_rules") && data) {
    out[LABELS.prompt_rules] = Object.values(data.promptRules).slice(0, 12).map((rule) => ({
      id: rule.id,
      contentType: rule.contentType,
      priority: rule.priority,
      instruction: truncate(rule.promptInstruction, 500),
    }));
  }
  if (selected.has("quality_checks") && data) {
    out[LABELS.quality_checks] = {
      count: Object.keys(data.qualityChecks).length,
      recent: Object.values(data.qualityChecks).slice(-8).map((check) => ({
        id: check.id,
        score: check.score,
        issueCount: check.issues.length,
      })),
    };
  }
  if (selected.has("priority_reporters")) {
    out[LABELS.priority_reporters] = (await readLoopFeedPriorityReporters()).slice(0, 20).map((reporter) => ({
      name: reporter.name,
      sportKey: reporter.sportKey,
      priority: reporter.priority,
      weight: reporter.weight,
      roleCategory: reporter.roleCategory,
      active: reporter.active,
    }));
  }
  if (selected.has("brand_guides")) {
    const brands = await readBrandGuidelinesFile();
    out[LABELS.brand_guides] = Object.entries(brands.brands).map(([slug, brand]) => ({
      slug,
      label: brand.label,
      excerpt: truncate(brand.body, 700),
    }));
  }
  if (selected.has("recent_dev_notes")) {
    const store = await readDevGatewayStore();
    out[LABELS.recent_dev_notes] = store.devNotes.slice(0, 10).map((note) => ({
      title: note.title,
      mode: note.mode,
      status: note.status,
      linkedFiles: note.linkedFiles,
      excerpt: truncate(note.content, 700),
    }));
  }
  if (selected.has("loop_feed")) {
    out[LABELS.loop_feed] = "Loop Feed context is used as research intelligence, priority reporter signals and source weighting; no raw social feed is sent by default.";
  }
  if (selected.has("match_report_builder")) {
    out[LABELS.match_report_builder] = "Match Report Builder uses SixLogics/EIO, story engine, fact-check, article score, brand guides and creator profiles.";
  }
  if (selected.has("current_page_context")) {
    out[LABELS.current_page_context] = { currentPage: currentPage ?? "" };
  }
  return out;
}
