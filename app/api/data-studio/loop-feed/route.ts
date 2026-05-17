import { NextResponse } from "next/server";
import {
  normalizeLoopFeedItems,
  toLoopTopicContentUrl,
  type LoopFeedContext,
  type LoopFeedSideResult,
} from "@/app/lib/data-studio/loop-feed";

export const dynamic = "force-dynamic";

type SideInput = { sideLabel?: string; url: string };

type Body = {
  sides?: SideInput[];
  /** Match-day filter YYYY-MM-DD (UTC calendar day of each post's `date`). */
  contextDate?: string;
};

const MAX_PER_SIDE = 45;
const FETCH_MS = 18_000;

function yyyyMmDd(value: string): string | null {
  const t = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t;
}

/**
 * POST /api/data-studio/loop-feed
 * Body: { contextDate: "YYYY-MM-DD", sides: [{ url, sideLabel?: "Home — Man Utd" }, ...] }
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const contextDate = yyyyMmDd(typeof body.contextDate === "string" ? body.contextDate : "");
  if (!contextDate) {
    return NextResponse.json({ ok: false, error: "contextDate must be YYYY-MM-DD." }, { status: 400 });
  }

  const sidesIn = Array.isArray(body.sides) ? body.sides : [];
  const cleaned = sidesIn
    .map((s, i) => ({
      sideLabel: typeof s.sideLabel === "string" && s.sideLabel.trim() ? s.sideLabel.trim() : `Side ${i + 1}`,
      url: typeof s.url === "string" ? s.url.trim() : "",
    }))
    .filter((s) => s.url.length > 0);

  if (cleaned.length === 0) {
    return NextResponse.json({ ok: false, error: "Provide at least one Loop Feed topic URL." }, { status: 400 });
  }

  const auth = process.env.LOOP_FEED_AUTHORIZATION?.trim();
  const headers: HeadersInit = {
    Accept: "application/json",
    "User-Agent": "racing365-social-data-studio/1.0",
  };
  if (auth) headers.Authorization = auth;

  const fetchedAt = new Date().toISOString();
  const sides: LoopFeedSideResult[] = [];

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
        sides.push({
          sideLabel: side.sideLabel,
          sourceUrl,
          posts: [],
          error: `Loop Feed HTTP ${res.status}`,
        });
        continue;
      }
      const json = (await res.json()) as unknown;
      const tz = process.env.LOOP_FEED_DAY_TZ?.trim() || "Europe/London";
      const posts = normalizeLoopFeedItems(json, contextDate, MAX_PER_SIDE, tz);
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

  const payload: LoopFeedContext = { contextDate, fetchedAt, sides };
  return NextResponse.json({ ok: true, loopFeed: payload });
}
