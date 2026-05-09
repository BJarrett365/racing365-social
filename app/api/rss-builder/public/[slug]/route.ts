import { NextResponse } from "next/server";
import { buildFeedJsonExport, buildRss2ChannelXml } from "@/app/lib/rss-builder/build-export";
import { loadExportItemsForBundle, loadExportItemsForFeed } from "@/app/lib/rss-builder/export-data";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";

/**
 * Public RSS/JSON export (no session). Authenticate with ?token= matching feed or bundle export_token.
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  const format = url.searchParams.get("format") === "json" ? "json" : "rss";
  if (!token) return NextResponse.json({ error: "token query parameter is required." }, { status: 401 });

  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  const { data: feed } = await supabase.from("rss_feeds").select("*").eq("slug", slug).eq("export_token", token).maybeSingle();
  const selfRss = `${url.origin}${url.pathname}?token=${encodeURIComponent(token)}&format=rss`;

  if (feed) {
    try {
      const items = await loadExportItemsForFeed(supabase, feed.id as string);
      const channelLink = (feed.source_url as string) || selfRss;
      if (format === "json") {
        const json = buildFeedJsonExport({ channelTitle: feed.name as string, channelLink, items });
        return new NextResponse(json, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=60" } });
      }
      const xml = buildRss2ChannelXml({
        channelTitle: feed.name as string,
        channelLink,
        channelDescription: `RSS Import Builder feed: ${feed.name}`,
        selfLink: selfRss,
        items,
        includeMediaEnclosure: Boolean(feed.include_media_enclosure),
        includeThumbnailInDescription: Boolean(feed.include_thumbnail),
      });
      return new NextResponse(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=60" } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const { data: bundle } = await supabase.from("rss_bundles").select("*").eq("slug", slug).eq("export_token", token).maybeSingle();
  if (bundle) {
    try {
      const items = await loadExportItemsForBundle(supabase, bundle.id as string);
      const channelLink = selfRss;
      if (format === "json") {
        const json = buildFeedJsonExport({ channelTitle: bundle.name as string, channelLink, items });
        return new NextResponse(json, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=60" } });
      }
      const xml = buildRss2ChannelXml({
        channelTitle: bundle.name as string,
        channelLink,
        channelDescription: `RSS Import Builder bundle: ${bundle.name}`,
        selfLink: selfRss,
        items,
        includeMediaEnclosure: true,
        includeThumbnailInDescription: true,
      });
      return new NextResponse(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=60" } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
