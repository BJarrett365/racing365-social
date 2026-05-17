import fs from "fs/promises";
import path from "path";
import { assertAllowedLoopFeedUrl, toLoopTopicContentUrl } from "@/app/lib/data-studio/loop-feed";
import { localJsonStorePath } from "@/app/lib/local-json-store-dir";

function storeFile(): string {
  return localJsonStorePath("loop-feed-teams.json");
}

export type LoopFeedTeamRow = {
  id: string;
  name: string;
  /** Full topic content URL (https://q.loop-feed.com/v1/topic/…/content) */
  topicUrl: string;
  active: boolean;
  updatedAt: string;
};

export type LoopFeedTeamsFile = {
  teams: LoopFeedTeamRow[];
};

const DEFAULT_TEAMS: LoopFeedTeamRow[] = [
  {
    id: "lteam-seed-man-utd",
    name: "Manchester United",
    topicUrl: "https://q.loop-feed.com/v1/topic/cmi5nwbot1j4uhxylcf482btc/content",
    active: true,
    updatedAt: "2026-05-17T00:00:00.000Z",
  },
  {
    id: "lteam-seed-nffc",
    name: "Nottingham Forest",
    topicUrl: "https://q.loop-feed.com/v1/topic/cmi5nwbro1j5fhxylg69i3tpi/content",
    active: true,
    updatedAt: "2026-05-17T00:00:00.000Z",
  },
];

function newTeamId(): string {
  return `lteam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function readLoopFeedTeams(): Promise<LoopFeedTeamRow[]> {
  const file = storeFile();
  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as LoopFeedTeamsFile;
    const rows = Array.isArray(parsed.teams) ? parsed.teams : [];
    return rows.filter((r) => r && typeof r.id === "string" && typeof r.topicUrl === "string");
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await writeLoopFeedTeams(DEFAULT_TEAMS);
    return [...DEFAULT_TEAMS];
  }
}

async function writeLoopFeedTeams(teams: LoopFeedTeamRow[]): Promise<void> {
  const file = storeFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const payload: LoopFeedTeamsFile = { teams };
  await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf-8");
}

export async function upsertLoopFeedTeam(
  row: Omit<LoopFeedTeamRow, "id" | "updatedAt"> & { id?: string },
): Promise<LoopFeedTeamRow> {
  const teams = await readLoopFeedTeams();
  const now = new Date().toISOString();
  const topicUrl = toLoopTopicContentUrl(row.topicUrl.trim());
  assertAllowedLoopFeedUrl(topicUrl);

  const id = row.id?.trim() || newTeamId();
  const next: LoopFeedTeamRow = {
    id,
    name: row.name.trim() || "Unnamed team",
    topicUrl,
    active: row.active !== false,
    updatedAt: now,
  };

  const idx = teams.findIndex((t) => t.id === id);
  if (idx >= 0) teams[idx] = next;
  else teams.push(next);

  await writeLoopFeedTeams(teams);
  return next;
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
