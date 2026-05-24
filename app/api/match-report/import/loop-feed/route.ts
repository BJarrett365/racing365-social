import { NextResponse } from "next/server";
import {
  MATCH_REPORT_LOOP_FEED_DATE_FILTER,
  normalizeLoopFeedItems,
  toLoopTopicContentUrl,
  type LoopFeedContext,
  type LoopFeedSideResult,
} from "@/app/lib/data-studio/loop-feed";
import { kickoffContextDate } from "@/app/lib/match-report/health-check";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";

type SideInput = { sideLabel?: string; url: string };

type Body = {
  projectId?: string;
  contextDate?: string;
  sides?: SideInput[];
};

const MAX_PER_SIDE = 45;
const FETCH_MS = 18_000;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }
    const repo = getMatchReportRepository();
    const project = await repo.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const contextDate =
      body.contextDate?.trim().slice(0, 10) ||
      kickoffContextDate(project.layers.sixLogic?.facts.kickoffIso);
    const sidesIn = Array.isArray(body.sides) ? body.sides : [];
    const cleaned = sidesIn
      .map((s, i) => ({
        sideLabel: typeof s.sideLabel === "string" && s.sideLabel.trim() ? s.sideLabel.trim() : `Side ${i + 1}`,
        url: typeof s.url === "string" ? s.url.trim() : "",
      }))
      .filter((s) => s.url.length > 0);

    if (cleaned.length === 0) {
      return NextResponse.json({ error: "Provide at least one Loop Feed topic URL." }, { status: 400 });
    }

    const auth = process.env.LOOP_FEED_AUTHORIZATION?.trim();
    const headers: HeadersInit = {
      Accept: "application/json",
      "User-Agent": "racing365-social-match-report/1.0",
    };
    if (auth) headers.Authorization = auth;

    const fetchedAt = new Date().toISOString();
    const sides: LoopFeedSideResult[] = [];
    const tz = process.env.LOOP_FEED_DAY_TZ?.trim() || "Europe/London";

    for (const side of cleaned) {
      let sourceUrl: string;
      try {
        sourceUrl = toLoopTopicContentUrl(side.url);
      } catch (e) {
        sides.push({
          sideLabel: side.sideLabel,
          sourceUrl: side.url,
          posts: [],
          error: e instanceof Error ? e.message : "Invalid Loop Feed URL.",
        });
        continue;
      }
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
        const res = await fetch(sourceUrl, { headers, cache: "no-store", signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) {
          sides.push({ sideLabel: side.sideLabel, sourceUrl, posts: [], error: `Loop Feed HTTP ${res.status}` });
          continue;
        }
        const json = (await res.json()) as unknown;
        const posts = normalizeLoopFeedItems(json, contextDate, MAX_PER_SIDE, tz, MATCH_REPORT_LOOP_FEED_DATE_FILTER);
        sides.push({ sideLabel: side.sideLabel, sourceUrl, posts });
      } catch (e) {
        sides.push({
          sideLabel: side.sideLabel,
          sourceUrl,
          posts: [],
          error: e instanceof Error ? e.message : "Fetch failed.",
        });
      }
    }

    const loopFeed: LoopFeedContext = { contextDate, fetchedAt, sides };
    const updated = await repo.importLoopFeed(projectId, loopFeed);
    return NextResponse.json({ project: updated, loopFeed });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Loop Feed import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
