import fs from "fs/promises";
import path from "path";
import { getStore } from "@netlify/blobs";
import { projectRoot } from "@/app/lib/paths";
import type {
  LanguageArticle,
  LanguageAuditLog,
  LanguageClient,
  LanguageClientAccessLog,
  LanguageClientApiKey,
  LanguageComplianceNote,
  LanguageExport,
  LanguageGlossaryEntry,
  LanguageGuardrail,
  LanguageImport,
  LanguageJournalistProfile,
  LanguageKnowledgeFile,
  LanguageMarketRule,
  LanguagePromptRule,
  LanguageProtectedTerm,
  LanguageQualityCheck,
  LanguageRule,
  LanguageSourceBrand,
  LanguageSportRule,
  LanguageStudioData,
  LanguageTranslation,
  LanguageTranslationMemory,
} from "@/app/lib/language-studio/types";
import {
  DEFAULT_COMPLIANCE_NOTES,
  DEFAULT_GUARDRAILS,
  DEFAULT_MARKET_RULES,
  DEFAULT_PROTECTED_TERMS,
  DEFAULT_SPORT_RULES,
} from "@/app/lib/language-studio/default-governance";

const STORE_FILE = path.join(projectRoot(), "data", "local", "language-studio.json");
const BLOB_STORE_NAME = "plexa-language-studio";
const BLOB_STORE_KEY = "language-studio.json";

const DEFAULT_SOURCE_BRANDS: LanguageSourceBrand[] = [
  {
    id: "source-planetf1",
    name: "PlanetF1",
    feedUrl: "https://www.planetf1.com/partner-media-content-feed",
    sourceLanguage: "en",
    parserType: "wordpress-rss",
    active: true,
    notes: "Default PlanetF1 partner media RSS feed.",
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
  },
  {
    id: "source-football365",
    name: "Football365",
    feedUrl: "https://www.football365.com/partner-media-content-feed",
    sourceLanguage: "en",
    parserType: "wordpress-rss",
    active: true,
    notes: "Football365 partner media RSS feed.",
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
  },
];

const DEFAULT_LANGUAGE_RULES: LanguageRule[] = [
  {
    id: "seed-rule-exclusive-source-credit",
    brand: "Global",
    targetLanguage: "",
    market: "Global",
    fieldType: "editorial-credit",
    title: "Exclusive source credit",
    rule: "For rewrites and translations, if the source article is labelled Exclusive or uses Exclusive in the headline/body, credit the original source and include a rel=\"nofollow\" link back to the original source URL. Do not remove or hide the attribution.",
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
  },
];

const DEFAULT_KNOWLEDGE_FILES: LanguageKnowledgeFile[] = [
  {
    id: "seed-knowledge-social-platforms",
    title: "Social platform output requirements",
    kind: "social-platform",
    language: "",
    content: [
      "App Alerts: short push-style copy, urgent but factual, around 90-140 characters where possible.",
      "Facebook: conversational summary with context, clear hook, no overclaiming.",
      "X: concise, sharp, factual, ideally under 280 characters including hashtags.",
      "Instagram: visual-first caption, human tone, 3-6 relevant hashtags.",
      "YouTube: title/description style copy that can support Shorts or community posts.",
      "TikTok: short energetic hook, natural spoken style, avoid unsupported hype.",
      "WhatsApp: direct share copy, clear context, minimal hashtags.",
      "Telegram: news alert style with headline, context and clean call to action.",
      "All social copy must preserve facts, names, numbers, dates, quotes and legal/compliance boundaries from the article.",
    ].join("\n"),
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
  },
];

function shouldUseNetlifyBlobStore(): boolean {
  return process.env.NETLIFY === "true" || Boolean(process.env.NETLIFY_BLOBS_CONTEXT);
}

function emptyData(): LanguageStudioData {
  return {
    sourceBrands: {},
    imports: {},
    articles: {},
    translations: {},
    glossary: {},
    rules: {},
    knowledgeFiles: {},
    journalistProfiles: {},
    guardrails: {},
    protectedTerms: {},
    marketRules: {},
    sportRules: {},
    promptRules: {},
    complianceNotes: {},
    translationMemory: {},
    qualityChecks: {},
    exports: {},
    auditLogs: {},
    clients: {},
    clientApiKeys: {},
    clientAccessLogs: {},
  };
}

function journalistProfileKey(row: Pick<LanguageJournalistProfile, "brand" | "name">): string {
  return `${row.brand.trim().toLowerCase()}::${row.name.trim().toLowerCase()}`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function mergeJournalistProfiles(base: LanguageJournalistProfile, next: LanguageJournalistProfile): LanguageJournalistProfile {
  return {
    ...base,
    ...next,
    id: base.id,
    name: next.name || base.name,
    brand: next.brand || base.brand,
    sports: uniqueStrings([...(base.sports ?? []), ...(next.sports ?? [])]),
    exampleTitles: uniqueStrings([...(next.exampleTitles ?? []), ...(base.exampleTitles ?? [])]).slice(0, 12),
    sampleArticleIds: uniqueStrings([...(next.sampleArticleIds ?? []), ...(base.sampleArticleIds ?? [])]).slice(0, 20),
    styleNotes: next.styleNotes?.trim() || base.styleNotes,
    articleGuidelines: next.articleGuidelines?.trim() || base.articleGuidelines,
    source: base.source === "manual" || next.source === "manual" ? "manual" : "imported",
    active: next.active,
    createdAt: base.createdAt || next.createdAt,
    updatedAt: [base.updatedAt, next.updatedAt].sort().at(-1) || next.updatedAt,
  };
}

function dedupeJournalistProfiles(data: LanguageStudioData): void {
  const byKey = new Map<string, LanguageJournalistProfile>();
  for (const profile of Object.values(data.journalistProfiles)) {
    const key = journalistProfileKey(profile);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, profile);
      continue;
    }
    const merged = mergeJournalistProfiles(existing, profile);
    data.journalistProfiles[existing.id] = merged;
    byKey.set(key, merged);
    delete data.journalistProfiles[profile.id];
  }
}

function seedGovernance(data: LanguageStudioData): LanguageStudioData {
  for (const row of DEFAULT_SOURCE_BRANDS) data.sourceBrands[row.id] ??= row;
  for (const row of DEFAULT_LANGUAGE_RULES) data.rules[row.id] ??= row;
  for (const row of DEFAULT_KNOWLEDGE_FILES) data.knowledgeFiles[row.id] ??= row;
  for (const row of DEFAULT_GUARDRAILS) data.guardrails[row.id] ??= row;
  for (const row of DEFAULT_PROTECTED_TERMS) data.protectedTerms[row.id] ??= row;
  for (const row of DEFAULT_MARKET_RULES) data.marketRules[row.id] ??= row;
  for (const row of DEFAULT_SPORT_RULES) data.sportRules[row.id] ??= row;
  for (const row of DEFAULT_COMPLIANCE_NOTES) data.complianceNotes[row.id] ??= row;
  dedupeJournalistProfiles(data);
  return data;
}

export function newLanguageId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function readLanguageStudioData(): Promise<LanguageStudioData> {
  if (shouldUseNetlifyBlobStore()) {
    try {
      const data = (await getStore(BLOB_STORE_NAME).get(BLOB_STORE_KEY, { type: "json" })) as Partial<LanguageStudioData> | null;
      return seedGovernance({ ...emptyData(), ...(data ?? {}) });
    } catch {
      return seedGovernance(emptyData());
    }
  }

  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LanguageStudioData>;
    return seedGovernance({ ...emptyData(), ...parsed });
  } catch {
    return seedGovernance(emptyData());
  }
}

export async function writeLanguageStudioData(data: LanguageStudioData): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await getStore(BLOB_STORE_NAME).setJSON(BLOB_STORE_KEY, data);
    return;
  }

  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function addAuditLog(entry: Omit<LanguageAuditLog, "id" | "createdAt">): Promise<void> {
  const data = await readLanguageStudioData();
  const log: LanguageAuditLog = {
    id: newLanguageId("laudit"),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  data.auditLogs[log.id] = log;
  await writeLanguageStudioData(data);
}

export async function upsertImport(row: LanguageImport): Promise<void> {
  const data = await readLanguageStudioData();
  data.imports[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertArticles(rows: LanguageArticle[]): Promise<void> {
  const data = await readLanguageStudioData();
  for (const row of rows) data.articles[row.id] = row;
  await writeLanguageStudioData(data);
}

function articleHasApprovedOrExportedWork(data: LanguageStudioData, articleId: string): boolean {
  return Object.values(data.translations).some((row) =>
    row.articleId === articleId && (row.status === "approved" || row.status === "exported"),
  ) || Object.values(data.exports).some((row) => row.articleId === articleId);
}

function articleHasAnyWork(data: LanguageStudioData, articleId: string): boolean {
  return Object.values(data.translations).some((row) => row.articleId === articleId)
    || Object.values(data.exports).some((row) => row.articleId === articleId);
}

function removeArticleCascade(data: LanguageStudioData, articleId: string): void {
  delete data.articles[articleId];
  for (const [translationId, translation] of Object.entries(data.translations)) {
    if (translation.articleId !== articleId) continue;
    delete data.translations[translationId];
    for (const [checkId, check] of Object.entries(data.qualityChecks)) {
      if (check.translationId === translationId || check.articleId === articleId) delete data.qualityChecks[checkId];
    }
  }
  for (const row of Object.values(data.imports)) {
    row.articleIds = row.articleIds.filter((id) => id !== articleId);
  }
}

export async function deleteLanguageArticles(articleIds: string[]): Promise<{ deletedIds: string[]; blockedIds: string[] }> {
  const data = await readLanguageStudioData();
  const deletedIds: string[] = [];
  const blockedIds: string[] = [];
  for (const articleId of [...new Set(articleIds.map((id) => id.trim()).filter(Boolean))]) {
    if (!data.articles[articleId]) continue;
    if (articleHasApprovedOrExportedWork(data, articleId)) {
      blockedIds.push(articleId);
      continue;
    }
    removeArticleCascade(data, articleId);
    deletedIds.push(articleId);
  }
  for (const [importId, row] of Object.entries(data.imports)) {
    if (row.articleIds.length === 0) delete data.imports[importId];
  }
  await writeLanguageStudioData(data);
  return { deletedIds, blockedIds };
}

export async function cleanupStaleUnusedLanguageImports(maxAgeHours = 48): Promise<{ deletedArticleIds: string[]; deletedImportIds: string[] }> {
  const data = await readLanguageStudioData();
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
  const deletedArticleIds: string[] = [];
  const deletedImportIds: string[] = [];
  for (const [importId, row] of Object.entries(data.imports)) {
    const created = Date.parse(row.createdAt);
    if (!Number.isFinite(created) || created > cutoff) continue;
    const remainingArticleIds: string[] = [];
    for (const articleId of row.articleIds) {
      if (!data.articles[articleId]) continue;
      if (articleHasAnyWork(data, articleId) || data.articles[articleId].status === "archived") {
        remainingArticleIds.push(articleId);
        continue;
      }
      removeArticleCascade(data, articleId);
      deletedArticleIds.push(articleId);
    }
    if (remainingArticleIds.length > 0) {
      row.articleIds = remainingArticleIds;
    } else {
      delete data.imports[importId];
      deletedImportIds.push(importId);
    }
  }
  if (deletedArticleIds.length || deletedImportIds.length) await writeLanguageStudioData(data);
  return { deletedArticleIds, deletedImportIds };
}

export async function upsertSourceBrand(row: LanguageSourceBrand): Promise<void> {
  const data = await readLanguageStudioData();
  data.sourceBrands[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertTranslation(row: LanguageTranslation): Promise<void> {
  const data = await readLanguageStudioData();
  data.translations[row.id] = row;
  const article = data.articles[row.articleId];
  if (article) {
    article.status = row.status === "approved" ? "approved" : row.status === "rejected" ? "rejected" : "translated";
    article.updatedAt = new Date().toISOString();
  }
  await writeLanguageStudioData(data);
}

export async function upsertGlossary(row: LanguageGlossaryEntry): Promise<void> {
  const data = await readLanguageStudioData();
  data.glossary[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertRule(row: LanguageRule): Promise<void> {
  const data = await readLanguageStudioData();
  data.rules[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertKnowledgeFile(row: LanguageKnowledgeFile): Promise<void> {
  const data = await readLanguageStudioData();
  data.knowledgeFiles[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertJournalistProfile(row: LanguageJournalistProfile): Promise<void> {
  const data = await readLanguageStudioData();
  const key = journalistProfileKey(row);
  const existing = Object.values(data.journalistProfiles).find((profile) => journalistProfileKey(profile) === key);
  if (existing) {
    data.journalistProfiles[existing.id] = mergeJournalistProfiles(existing, row);
    if (row.id !== existing.id) delete data.journalistProfiles[row.id];
  } else {
    data.journalistProfiles[row.id] = row;
  }
  await writeLanguageStudioData(data);
}

export async function upsertGuardrail(row: LanguageGuardrail): Promise<void> {
  const data = await readLanguageStudioData();
  data.guardrails[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertProtectedTerm(row: LanguageProtectedTerm): Promise<void> {
  const data = await readLanguageStudioData();
  data.protectedTerms[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertMarketRule(row: LanguageMarketRule): Promise<void> {
  const data = await readLanguageStudioData();
  data.marketRules[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertSportRule(row: LanguageSportRule): Promise<void> {
  const data = await readLanguageStudioData();
  data.sportRules[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertPromptRule(row: LanguagePromptRule): Promise<void> {
  const data = await readLanguageStudioData();
  data.promptRules[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertComplianceNote(row: LanguageComplianceNote): Promise<void> {
  const data = await readLanguageStudioData();
  data.complianceNotes[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertTranslationMemory(row: LanguageTranslationMemory): Promise<void> {
  const data = await readLanguageStudioData();
  data.translationMemory[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertQualityCheck(row: LanguageQualityCheck): Promise<void> {
  const data = await readLanguageStudioData();
  data.qualityChecks[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertExport(row: LanguageExport): Promise<void> {
  const data = await readLanguageStudioData();
  data.exports[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function upsertClient(row: LanguageClient): Promise<void> {
  const data = await readLanguageStudioData();
  data.clients[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function deleteClient(clientId: string): Promise<boolean> {
  const data = await readLanguageStudioData();
  if (!data.clients[clientId]) return false;
  delete data.clients[clientId];
  for (const [id, key] of Object.entries(data.clientApiKeys)) {
    if (key.clientId === clientId) delete data.clientApiKeys[id];
  }
  for (const [id, log] of Object.entries(data.clientAccessLogs)) {
    if (log.clientId === clientId) delete data.clientAccessLogs[id];
  }
  await writeLanguageStudioData(data);
  return true;
}

export async function upsertClientApiKey(row: LanguageClientApiKey): Promise<void> {
  const data = await readLanguageStudioData();
  data.clientApiKeys[row.id] = row;
  await writeLanguageStudioData(data);
}

export async function addClientAccessLog(entry: Omit<LanguageClientAccessLog, "id" | "createdAt">): Promise<void> {
  const data = await readLanguageStudioData();
  const log: LanguageClientAccessLog = {
    id: newLanguageId("lclientlog"),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  data.clientAccessLogs[log.id] = log;
  const key = data.clientApiKeys[entry.apiKeyId];
  if (key && entry.status >= 200 && entry.status < 300) {
    key.lastUsedAt = log.createdAt;
  }
  await writeLanguageStudioData(data);
}

export function sortDesc<T extends { createdAt?: string; updatedAt?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => String(b.updatedAt ?? b.createdAt ?? "").localeCompare(String(a.updatedAt ?? a.createdAt ?? "")));
}
