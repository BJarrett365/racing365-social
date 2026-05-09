import { NextResponse } from "next/server";
import { makeFeedSlug } from "@/app/lib/rss-builder/slug";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";
import { assertRssBuilderAccess } from "@/app/lib/rss-builder/route-guard";
import { defaultFilterConfig, type RssCrawlFrequency, type RssFeedSourceType } from "@/app/lib/rss-builder/types";

export async function GET(req: Request) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  const { data: feeds, error: e1 } = await supabase.from("rss_feeds").select("*").order("updated_at", { ascending: false });
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  const { data: bundles, error: e2 } = await supabase.from("rss_bundles").select("*").order("updated_at", { ascending: false });
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  return NextResponse.json({ feeds: feeds ?? [], bundles: bundles ?? [] });
}

type CreateBody = {
  name?: string;
  source_type?: RssFeedSourceType;
  source_url?: string;
  manual_urls?: string;
  crawl_frequency?: RssCrawlFrequency;
  posts_per_feed?: number;
};

export async function POST(req: Request) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });
  const sourceType = body.source_type ?? "rss_url";
  if (!body.source_url?.trim() && !body.manual_urls?.trim()) {
    return NextResponse.json({ error: "source_url or manual_urls is required." }, { status: 400 });
  }

  const slug = makeFeedSlug(name);
  const now = new Date().toISOString();
  const insert = {
    slug,
    name,
    source_type: sourceType,
    source_url: body.source_url?.trim() || null,
    manual_urls: body.manual_urls?.trim() || null,
    crawl_frequency: body.crawl_frequency ?? "1h",
    posts_per_feed: Math.min(500, Math.max(1, Math.floor(body.posts_per_feed ?? 50))),
    next_crawl_at: now,
    updated_at: now,
  };

  const { data: feed, error } = await supabase.from("rss_feeds").insert(insert).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("rss_feed_filters").insert({ feed_id: feed.id, config: defaultFilterConfig() });
  await supabase.from("rss_feed_translation_settings").insert({
    feed_id: feed.id,
    enabled: false,
    from_lang: "auto",
    to_lang: "en",
    provider: "deepl",
  });

  return NextResponse.json({ feed });
}
