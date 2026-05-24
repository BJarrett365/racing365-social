import fs from "fs/promises";
import path from "path";
import { assertAllowedLoopFeedUrl, toLoopTopicContentUrl } from "@/app/lib/data-studio/loop-feed";
import { localJsonStorePath } from "@/app/lib/local-json-store-dir";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import {
  compareReporterEditorialRank,
  formatReporterAffiliationBadge,
  inferReporterAffiliationFromLegacyNote,
  normalizeReporterAffiliationScope,
  normalizeReporterHandle,
  normalizeReporterHandleList,
  normalizeReporterOutlet,
  normalizeReporterPriority,
  normalizeReporterRoleCategory,
  normalizeReporterTeamName,
  normalizeReporterWeight,
  reporterRoleLabel,
  type LoopFeedPriorityReporterRow,
  type LoopFeedPriorityReportersFile,
} from "@/app/lib/tools/loop-feed-priority-reporters-shared";

export type { LoopFeedPriorityReporterRow } from "@/app/lib/tools/loop-feed-priority-reporters-shared";
export {
  LOOP_FEED_REPORTER_ROLE_CATEGORIES,
  normalizeReporterHandle,
} from "@/app/lib/tools/loop-feed-priority-reporters-shared";

const BLOB_STORE_NAME = "plexa-loop-feed-reporters";
const BLOB_KEY = "reporters.json";

function storeFile(): string {
  return localJsonStorePath("loop-feed-priority-reporters.json");
}

function newReporterId(): string {
  return `lrep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeReporters(parsed: LoopFeedPriorityReportersFile | null): LoopFeedPriorityReporterRow[] {
  const rows = Array.isArray(parsed?.reporters) ? parsed!.reporters : [];
  return rows
    .filter(
      (r) =>
        r &&
        typeof r.id === "string" &&
        typeof r.name === "string" &&
        typeof r.sportKey === "string" &&
        typeof r.updatedAt === "string",
    )
    .map((r) => {
      const affiliationScope = normalizeReporterAffiliationScope(r.affiliationScope);
      const legacy =
        r.affiliationScope === undefined && !r.teamName && !r.outlet
          ? inferReporterAffiliationFromLegacyNote(r.editorialNote)
          : null;
      const scope = legacy?.affiliationScope ?? affiliationScope;
      return {
        ...r,
        ...normalizeReporterHandleList(r.xHandle, r.xHandleAliases),
        affiliationScope: scope,
        teamName: normalizeReporterTeamName(r.teamName ?? legacy?.teamName, scope),
        outlet: normalizeReporterOutlet(r.outlet ?? legacy?.outlet),
        roleCategory: normalizeReporterRoleCategory(r.roleCategory),
        priority: normalizeReporterPriority(r.priority),
        weight: normalizeReporterWeight(r.weight),
      };
    });
}

async function persistReporters(reporters: LoopFeedPriorityReporterRow[]): Promise<void> {
  const payload: LoopFeedPriorityReportersFile = { reporters };
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_KEY, payload);
    return;
  }
  const file = storeFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf-8");
}

export async function readLoopFeedPriorityReporters(): Promise<LoopFeedPriorityReporterRow[]> {
  if (shouldUseNetlifyBlobStore()) {
    const data = await readJsonBlob<LoopFeedPriorityReportersFile>(BLOB_STORE_NAME, BLOB_KEY);
    if (data && Array.isArray(data.reporters)) {
      return normalizeReporters(data);
    }
    await persistReporters([]);
    return [];
  }

  const file = storeFile();
  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as LoopFeedPriorityReportersFile;
    return normalizeReporters(parsed);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await persistReporters([]);
    return [];
  }
}

export async function readLoopFeedPriorityReportersBySport(
  sportKey: LoopFeedPriorityReporterRow["sportKey"],
): Promise<LoopFeedPriorityReporterRow[]> {
  if (sportKey === "multi") return [];
  const all = await readLoopFeedPriorityReporters();
  return all.filter((r) => r.active && r.sportKey === sportKey);
}

async function writeLoopFeedPriorityReporters(reporters: LoopFeedPriorityReporterRow[]): Promise<void> {
  await persistReporters(reporters);
}

export async function upsertLoopFeedPriorityReporter(
  row: Omit<LoopFeedPriorityReporterRow, "id" | "updatedAt"> & { id?: string },
): Promise<LoopFeedPriorityReporterRow> {
  if (row.sportKey === "multi") {
    throw new Error('Choose a specific sport for each reporter (not "All sports").');
  }

  let loopTopicUrl: string | undefined;
  if (row.loopTopicUrl?.trim()) {
    loopTopicUrl = toLoopTopicContentUrl(row.loopTopicUrl.trim());
    assertAllowedLoopFeedUrl(loopTopicUrl);
  }

  const reporters = await readLoopFeedPriorityReporters();
  const now = new Date().toISOString();
  const id = row.id?.trim() || newReporterId();
  const { xHandle, xHandleAliases } = normalizeReporterHandleList(row.xHandle, row.xHandleAliases);

  const affiliationScope = normalizeReporterAffiliationScope(row.affiliationScope);
  const teamName = normalizeReporterTeamName(row.teamName, affiliationScope);
  const outlet = normalizeReporterOutlet(row.outlet);

  const next: LoopFeedPriorityReporterRow = {
    id,
    sportKey: row.sportKey,
    name: row.name.trim() || "Unnamed",
    xHandle,
    xHandleAliases,
    loopTopicUrl,
    editorialNote: row.editorialNote?.trim() || undefined,
    affiliationScope,
    teamName,
    outlet,
    roleCategory: normalizeReporterRoleCategory(row.roleCategory),
    priority: normalizeReporterPriority(row.priority),
    weight: normalizeReporterWeight(row.weight),
    active: row.active !== false,
    updatedAt: now,
  };

  const idx = reporters.findIndex((t) => t.id === id);
  if (idx >= 0) reporters[idx] = next;
  else reporters.push(next);

  await writeLoopFeedPriorityReporters(reporters);
  return next;
}

export async function deleteLoopFeedPriorityReporter(id: string): Promise<boolean> {
  const tid = id.trim();
  if (!tid) return false;
  const reporters = await readLoopFeedPriorityReporters();
  const next = reporters.filter((t) => t.id !== tid);
  if (next.length === reporters.length) return false;
  await writeLoopFeedPriorityReporters(next);
  return true;
}

/** User-message block for match-copy / previews — editorial preference only. */
export function formatPriorityReportersForPrompt(
  rows: LoopFeedPriorityReporterRow[],
  sportLabel: string,
): string {
  const usable = rows
    .filter((r) => r.active && r.sportKey !== "multi")
    .sort(compareReporterEditorialRank);
  if (!usable.length) return "";

  const lines = usable.map((r) => {
    const bits: string[] = [
      r.name.trim(),
      reporterRoleLabel(r.roleCategory),
      formatReporterAffiliationBadge(r) ?? "Generic",
      `priority ${r.priority}`,
      `weight ${r.weight}`,
    ];
    const h = normalizeReporterHandle(r.xHandle);
    if (h) bits.push(`X handle @${h}`);
    if (r.loopTopicUrl?.trim()) bits.push(`Loop topic ${r.loopTopicUrl.trim()}`);
    if (r.editorialNote?.trim()) bits.push(`note: ${r.editorialNote.trim()}`);
    return `- ${bits.join(" · ")}`;
  });

  return [
    `**Sport:** ${sportLabel}`,
    "**Priority reporters / outlets** (configured in Tools — weight these when their posts appear in LOOP_FEED or when their angles match fixture context):",
    ...lines,
    "- Prefer higher **priority** and **weight** voices for **standfirst hooks**, **transfer rumours confirmed as reporting** (attribute; no fabrication), and **match narrative colour** — always attribute (**name / @handle**).",
    "- They **do not** override **FIXTURE_JSON** facts (scores, official teams, times).",
  ].join("\n");
}
