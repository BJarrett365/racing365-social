import { NextResponse } from "next/server";
import { runCrawlFeed } from "@/app/lib/rss-builder/crawl-feed";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";

function isAuthorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("rss_feeds")
    .select("id")
    .eq("status", "active")
    .lte("next_crawl_at", nowIso)
    .order("next_crawl_at", { ascending: true })
    .limit(8);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const row of due ?? []) {
    const id = row.id as string;
    try {
      await runCrawlFeed(supabase, id);
      results.push({ id, ok: true });
    } catch (e) {
      results.push({ id, ok: false, error: e instanceof Error ? e.message : "error" });
    }
  }

  return NextResponse.json({ success: true, checkedAt: nowIso, processed: results.length, results });
}
