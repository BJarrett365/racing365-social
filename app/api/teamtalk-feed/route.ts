import { NextResponse } from "next/server";
import { fetchTeamtalkFeedItems, teamtalkFeedItemToPreview } from "@/app/lib/teamtalk-feed";

/** List current feed stories for the import UI (manual fetch from client). */
export async function GET() {
  try {
    const items = await fetchTeamtalkFeedItems();
    const previews = items.map(teamtalkFeedItemToPreview);
    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      count: previews.length,
      items: previews,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Feed fetch failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
