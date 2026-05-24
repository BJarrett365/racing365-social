import { NextResponse } from "next/server";
import { toLoopTopicContentUrl } from "@/app/lib/data-studio/loop-feed";
import {
  filterPreviewItems,
  parseLoopFeedPreviewItems,
  type LoopFeedPreviewItem,
} from "@/app/lib/data-studio/loop-feed-preview";
import { filterLoopFeedTeamsByFeedType, readLoopFeedTeams } from "@/app/lib/tools/loop-feed-teams-store";
import type { LoopFeedTeamFeedType } from "@/app/lib/tools/loop-feed-team-feed-types";

export const dynamic = "force-dynamic";

const FETCH_MS = 20_000;
const MAX_TEAMS = 30;
const MAX_ITEMS_PER_TEAM = 25;

type Body = {
  feedType?: LoopFeedTeamFeedType;
  teamName?: string;
  platform?: string;
};

async function fetchTopicJson(url: string): Promise<unknown> {
  const auth = process.env.LOOP_FEED_AUTHORIZATION?.trim();
  const headers: HeadersInit = {
    Accept: "application/json",
    "User-Agent": "racing365-social-loop-feed-preview/1.0",
  };
  if (auth) headers.Authorization = auth;

  const sourceUrl = toLoopTopicContentUrl(url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(sourceUrl, { headers, cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** POST /api/tools/loop-feed-preview — fetch Loop Feed items for preview (all teams or one). */
export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const feedType = body.feedType ?? "match_highlights";
  const teams = filterLoopFeedTeamsByFeedType(await readLoopFeedTeams(), feedType);
  const scoped =
    body.teamName?.trim()
      ? teams.filter((row) => row.name.trim().toLowerCase() === body.teamName!.trim().toLowerCase())
      : teams;

  if (!scoped.length) {
    return NextResponse.json({
      ok: true,
      items: [] as LoopFeedPreviewItem[],
      errors: [{ teamName: body.teamName ?? "all", error: "No active feeds configured for this selection." }],
      fetchedAt: new Date().toISOString(),
    });
  }

  const batch = scoped.slice(0, MAX_TEAMS);
  const items: LoopFeedPreviewItem[] = [];
  const errors: Array<{ teamName: string; error: string }> = [];

  await Promise.all(
    batch.map(async (team) => {
      try {
        const json = await fetchTopicJson(team.topicUrl);
        items.push(...parseLoopFeedPreviewItems(json, team.name, MAX_ITEMS_PER_TEAM));
      } catch (e) {
        errors.push({
          teamName: team.name,
          error: e instanceof Error ? e.message : "Fetch failed",
        });
      }
    }),
  );

  items.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const filtered = filterPreviewItems(items, {
    teamName: body.teamName,
    platform: body.platform ?? "all",
  });

  return NextResponse.json({
    ok: true,
    feedType,
    items: filtered,
    totalFetched: items.length,
    teamCount: batch.length,
    errors,
    fetchedAt: new Date().toISOString(),
  });
}
