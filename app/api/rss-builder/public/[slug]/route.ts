import { NextResponse } from "next/server";
import { buildFeedJsonExport, buildRss2ChannelXml } from "@/app/lib/rss-builder/build-export";
import { loadExportItemsForBundle, loadExportItemsForFeed } from "@/app/lib/rss-builder/export-data";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";

/**
 * Public RSS / XML / JSON export (no session). Authenticate with ?token= matching feed or bundle export_token.
 * Query: format=json | format=xml | format=rss (default when omitted): json = JSON; rss and xml = same RSS 2.0 document,
 * with Content-Type application/rss+xml vs application/xml respectively.
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  const rawFormat = url.searchParams.get("format")?.toLowerCase().trim();
  const format = rawFormat === "json" ? "json" : rawFormat === "xml" ? "xml" : "rss";
  if (!token) return NextResponse.json({ error: "token query parameter is required." }, { status: 401 });

  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  const { data: feed } = await supabase.from("rss_feeds").select("*").eq("slug", slug).eq("export_token", token).maybeSingle();
  const selfLinkFor = (f: "rss" | "xml") =>
    `${url.origin}${url.pathname}?token=${encodeURIComponent(token)}&format=${f}`;

  if (feed) {
    try {
      const items = await loadExportItemsForFeed(supabase, feed.id as string);
      const channelLink = (feed.source_url as string) || selfLinkFor("rss");
      if (format === "json") {
        const json = buildFeedJsonExport({ channelTitle: feed.name as string, channelLink, items });
        return new NextResponse(json, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=60" } });
      }
      const isXmlMime = format === "xml";
      const xml = buildRss2ChannelXml({
        channelTitle: feed.name as string,
        channelLink,
        channelDescription: `RSS Import Builder feed: ${feed.name}`,
        selfLink: selfLinkFor(isXmlMime ? "xml" : "rss"),
        selfLinkType: isXmlMime ? "application/xml" : "application/rss+xml",
        items,
        includeImages: Boolean(feed.include_images),
        includeMediaEnclosure: Boolean(feed.include_media_enclosure),
        includeThumbnailInDescription: Boolean(feed.include_thumbnail),
      });
      const contentType = isXmlMime ? "application/xml; charset=utf-8" : "application/rss+xml; charset=utf-8";
      return new NextResponse(xml, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=60" } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const { data: bundle } = await supabase.from("rss_bundles").select("*").eq("slug", slug).eq("export_token", token).maybeSingle();
  if (bundle) {
    try {
      const items = await loadExportItemsForBundle(supabase, bundle.id as string);
      const channelLink = selfLinkFor("rss");
      if (format === "json") {
        const json = buildFeedJsonExport({ channelTitle: bundle.name as string, channelLink, items });
        return new NextResponse(json, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=60" } });
      }
      const isXmlMime = format === "xml";
      const xml = buildRss2ChannelXml({
        channelTitle: bundle.name as string,
        channelLink,
        channelDescription: `RSS Import Builder bundle: ${bundle.name}`,
        selfLink: selfLinkFor(isXmlMime ? "xml" : "rss"),
        selfLinkType: isXmlMime ? "application/xml" : "application/rss+xml",
        items,
        includeImages: true,
        includeMediaEnclosure: true,
        includeThumbnailInDescription: true,
      });
      const contentType = isXmlMime ? "application/xml; charset=utf-8" : "application/rss+xml; charset=utf-8";
      return new NextResponse(xml, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=60" } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
