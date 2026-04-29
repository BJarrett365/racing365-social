import fs from "fs/promises";
import path from "path";
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
  LanguageKnowledgeFile,
  LanguageMarketRule,
  LanguagePromptRule,
  LanguageProtectedTerm,
  LanguageQualityCheck,
  LanguageRule,
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

function emptyData(): LanguageStudioData {
  return {
    imports: {},
    articles: {},
    translations: {},
    glossary: {},
    rules: {},
    knowledgeFiles: {},
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

function seedGovernance(data: LanguageStudioData): LanguageStudioData {
  for (const row of DEFAULT_GUARDRAILS) data.guardrails[row.id] ??= row;
  for (const row of DEFAULT_PROTECTED_TERMS) data.protectedTerms[row.id] ??= row;
  for (const row of DEFAULT_MARKET_RULES) data.marketRules[row.id] ??= row;
  for (const row of DEFAULT_SPORT_RULES) data.sportRules[row.id] ??= row;
  for (const row of DEFAULT_COMPLIANCE_NOTES) data.complianceNotes[row.id] ??= row;
  return data;
}

export function newLanguageId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function readLanguageStudioData(): Promise<LanguageStudioData> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LanguageStudioData>;
    return seedGovernance({ ...emptyData(), ...parsed });
  } catch {
    return seedGovernance(emptyData());
  }
}

export async function writeLanguageStudioData(data: LanguageStudioData): Promise<void> {
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
