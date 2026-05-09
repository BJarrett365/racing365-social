import { NextResponse } from "next/server";
import { runCrawlFeed } from "@/app/lib/rss-builder/crawl-feed";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";
import { assertRssBuilderAccess } from "@/app/lib/rss-builder/route-guard";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  try {
    const result = await runCrawlFeed(supabase, id);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Crawl failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
