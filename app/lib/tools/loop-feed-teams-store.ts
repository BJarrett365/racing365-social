import fs from "fs/promises";
import path from "path";
import { assertAllowedLoopFeedUrl, toLoopTopicContentUrl } from "@/app/lib/data-studio/loop-feed";
import { localJsonStorePath } from "@/app/lib/local-json-store-dir";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import {
  DEFAULT_LOOP_FEED_TEAM_FEED_TYPE,
  LOOP_FEED_TEAM_FEED_TYPE_IDS,
  normalizeLoopFeedTeamFeedType,
  type LoopFeedTeamFeedType,
} from "@/app/lib/tools/loop-feed-team-feed-types";
import loopFeedTeamsCatalog from "@/data/loop-feed-teams.catalog.json";

export type { LoopFeedTeamFeedType } from "@/app/lib/tools/loop-feed-team-feed-types";

/** Matches Language Studio pattern — durable JSON on Netlify without writable `/var/task` or fragmented `/tmp`. */
const BLOB_STORE_NAME = "plexa-loop-feed-teams";
const BLOB_KEY = "teams.json";

function storeFile(): string {
  return localJsonStorePath("loop-feed-teams.json");
}

export type LoopFeedTeamRow = {
  id: string;
  name: string;
  /** Feed variant — commentaries, match highlights, match videos, or news. */
  feedType: LoopFeedTeamFeedType;
  /** Full topic content URL (https://q.loop-feed.com/v1/topic/…/content) */
  topicUrl: string;
  active: boolean;
  updatedAt: string;
};

export type LoopFeedTeamsFile = {
  teams: LoopFeedTeamRow[];
};

export type LoopFeedTeamGroup = {
  name: string;
  feeds: Record<LoopFeedTeamFeedType, LoopFeedTeamRow | undefined>;
};

function slugifyClubName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stableTemplateId(clubName: string, feedType: LoopFeedTeamFeedType): string {
  return `lteam-${slugifyClubName(clubName)}-${feedType.replace(/_/g, "-")}`;
}

function normalizeTeamRow(row: LoopFeedTeamRow): LoopFeedTeamRow {
  return {
    ...row,
    name: row.name.trim() || "Unnamed team",
    feedType: normalizeLoopFeedTeamFeedType(row.feedType),
    topicUrl: typeof row.topicUrl === "string" ? row.topicUrl.trim() : "",
    active: row.active !== false && Boolean(row.topicUrl?.trim()),
  };
}

function catalogTeams(): LoopFeedTeamRow[] {
  return normalizeTeams(loopFeedTeamsCatalog as LoopFeedTeamsFile);
}

function newTeamId(): string {
  return `lteam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTeams(parsed: LoopFeedTeamsFile | null): LoopFeedTeamRow[] {
  const rows = Array.isArray(parsed?.teams) ? parsed!.teams : [];
  return rows
    .filter((r) => r && typeof r.id === "string")
    .map((row) =>
      normalizeTeamRow({
        ...row,
        feedType: normalizeLoopFeedTeamFeedType(row.feedType),
        topicUrl: typeof row.topicUrl === "string" ? row.topicUrl : "",
      }),
    );
}

export function filterLoopFeedTeamsByFeedType(
  teams: LoopFeedTeamRow[],
  feedType: LoopFeedTeamFeedType,
): LoopFeedTeamRow[] {
  const type = normalizeLoopFeedTeamFeedType(feedType);
  return teams.filter(
    (row) => row.active && row.topicUrl.trim() && normalizeLoopFeedTeamFeedType(row.feedType) === type,
  );
}

export function matchLoopFeedTeamByName(
  teams: LoopFeedTeamRow[],
  clubName: string,
  feedType?: LoopFeedTeamFeedType,
): LoopFeedTeamRow | undefined {
  const needle = clubName.trim().toLowerCase();
  if (!needle) return undefined;
  const pool = feedType ? filterLoopFeedTeamsByFeedType(teams, feedType) : teams.filter((row) => row.active && row.topicUrl.trim());
  return pool.find((row) => row.name.trim().toLowerCase() === needle);
}

export function groupLoopFeedTeams(teams: LoopFeedTeamRow[]): LoopFeedTeamGroup[] {
  const byName = new Map<string, { displayName: string; rows: LoopFeedTeamRow[] }>();
  for (const row of teams) {
    const key = row.name.trim().toLowerCase();
    if (!key) continue;
    const bucket = byName.get(key) ?? { displayName: row.name.trim(), rows: [] };
    bucket.rows.push(row);
    if (!bucket.displayName) bucket.displayName = row.name.trim();
    byName.set(key, bucket);
  }

  return [...byName.values()]
    .map(({ displayName, rows }) => {
      const feeds = Object.fromEntries(LOOP_FEED_TEAM_FEED_TYPE_IDS.map((id) => [id, undefined])) as Record<
        LoopFeedTeamFeedType,
        LoopFeedTeamRow | undefined
      >;
      for (const row of rows) {
        feeds[normalizeLoopFeedTeamFeedType(row.feedType)] = row;
      }
      return { name: displayName, feeds };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function persistTeams(teams: LoopFeedTeamRow[]): Promise<void> {
  const payload: LoopFeedTeamsFile = { teams };
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_KEY, payload);
    return;
  }
  const file = storeFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf-8");
}

export async function readLoopFeedTeams(): Promise<LoopFeedTeamRow[]> {
  if (shouldUseNetlifyBlobStore()) {
    const data = await readJsonBlob<LoopFeedTeamsFile>(BLOB_STORE_NAME, BLOB_KEY);
    const rows = normalizeTeams(data);
    if (rows.length > 0 || (data && Array.isArray(data.teams))) {
      return rows;
    }
    await persistTeams(catalogTeams());
    return catalogTeams();
  }

  const file = storeFile();
  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as LoopFeedTeamsFile;
    return normalizeTeams(parsed);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await persistTeams(catalogTeams());
    return catalogTeams();
  }
}

async function writeLoopFeedTeams(teams: LoopFeedTeamRow[]): Promise<void> {
  await persistTeams(teams);
}

export async function upsertLoopFeedTeam(
  row: Omit<LoopFeedTeamRow, "id" | "updatedAt"> & { id?: string },
): Promise<LoopFeedTeamRow> {
  const teams = await readLoopFeedTeams();
  const now = new Date().toISOString();
  const rawUrl = row.topicUrl.trim();
  const topicUrl = rawUrl ? toLoopTopicContentUrl(rawUrl) : "";
  if (topicUrl) assertAllowedLoopFeedUrl(topicUrl);

  const id = row.id?.trim() || newTeamId();
  const active = row.active !== false && Boolean(topicUrl);
  const next: LoopFeedTeamRow = {
    id,
    name: row.name.trim() || "Unnamed team",
    feedType: normalizeLoopFeedTeamFeedType(row.feedType),
    topicUrl,
    active,
    updatedAt: now,
  };

  const idx = teams.findIndex((t) => t.id === id);
  if (idx >= 0) teams[idx] = next;
  else teams.push(next);

  await writeLoopFeedTeams(teams);
  return next;
}

/** Ensure four feed slots exist per club (highlights, videos, commentaries, news). */
export async function ensureLoopFeedClubTemplate(input: {
  name: string;
  commentariesUrl?: string;
  matchHighlightsUrl?: string;
  matchVideosUrl?: string;
  newsUrl?: string;
}): Promise<LoopFeedTeamRow[]> {
  const clubName = input.name.trim();
  if (!clubName) throw new Error("Club name is required.");

  const teams = await readLoopFeedTeams();
  const key = clubName.toLowerCase();
  const existing = teams.filter((row) => row.name.trim().toLowerCase() === key);
  const byType = new Map(existing.map((row) => [normalizeLoopFeedTeamFeedType(row.feedType), row]));

  const urlForType = (feedType: LoopFeedTeamFeedType): string => {
    if (feedType === "commentaries" && input.commentariesUrl?.trim()) return input.commentariesUrl.trim();
    if (feedType === "match_highlights" && input.matchHighlightsUrl?.trim()) return input.matchHighlightsUrl.trim();
    if (feedType === "match_videos" && input.matchVideosUrl?.trim()) return input.matchVideosUrl.trim();
    if (feedType === "news" && input.newsUrl?.trim()) return input.newsUrl.trim();
    return byType.get(feedType)?.topicUrl.trim() ?? "";
  };

  const saved: LoopFeedTeamRow[] = [];
  for (const feedType of LOOP_FEED_TEAM_FEED_TYPE_IDS) {
    const prior = byType.get(feedType);
    const topicUrl = urlForType(feedType);
    saved.push(
      await upsertLoopFeedTeam({
        id: prior?.id ?? stableTemplateId(clubName, feedType),
        name: clubName,
        feedType,
        topicUrl,
        active: Boolean(topicUrl),
      }),
    );
  }
  return saved;
}

export async function deleteLoopFeedTeam(id: string): Promise<boolean> {
  const tid = id.trim();
  if (!tid) return false;
  const teams = await readLoopFeedTeams();
  const next = teams.filter((t) => t.id !== tid);
  if (next.length === teams.length) return false;
  await writeLoopFeedTeams(next);
  return true;
}
