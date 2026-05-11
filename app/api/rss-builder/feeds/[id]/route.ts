import { NextResponse } from "next/server";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";
import { assertRssBuilderAccess } from "@/app/lib/rss-builder/route-guard";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  const { data: feed, error } = await supabase.from("rss_feeds").select("*").eq("id", id).single();
  if (error || !feed) return NextResponse.json({ error: "Feed not found." }, { status: 404 });

  const [{ data: items }, { data: filter }, { data: translation }, { data: logs }] = await Promise.all([
    supabase
      .from("rss_feed_items")
      .select("*")
      .eq("feed_id", id)
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("rss_feed_filters").select("*").eq("feed_id", id).maybeSingle(),
    supabase.from("rss_feed_translation_settings").select("*").eq("feed_id", id).maybeSingle(),
    supabase.from("rss_feed_crawl_logs").select("*").eq("feed_id", id).order("started_at", { ascending: false }).limit(20),
  ]);

  return NextResponse.json({
    feed,
    items: items ?? [],
    filters: filter ?? null,
    translation: translation ?? null,
    crawlLogs: logs ?? [],
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const allowed = [
    "name",
    "source_type",
    "source_url",
    "manual_urls",
    "status",
    "crawl_frequency",
    "posts_per_feed",
    "include_images",
    "include_media_enclosure",
    "use_fallback_image",
    "limit_title_length",
    "title_max_chars",
    "enable_html_description",
    "include_thumbnail",
    "include_all_images",
    "include_videos",
    "limit_description_length",
    "description_max_chars",
    "starred",
  ] as const;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key];
  }

  const { data: feed, error } = await supabase.from("rss_feeds").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ feed });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  const { error } = await supabase.from("rss_feeds").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
