import { NextResponse } from "next/server";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";
import { assertRssBuilderAccess } from "@/app/lib/rss-builder/route-guard";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const { id: bundleId } = await ctx.params;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();
  let body: { feed_id?: string; detach?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const feedId = body.feed_id?.trim();
  if (!feedId) return NextResponse.json({ error: "feed_id is required." }, { status: 400 });

  if (body.detach) {
    const { error } = await supabase.from("rss_bundle_feeds").delete().eq("bundle_id", bundleId).eq("feed_id", feedId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase.from("rss_bundle_feeds").upsert({ bundle_id: bundleId, feed_id: feedId }, { onConflict: "bundle_id,feed_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await supabase.from("rss_bundles").update({ updated_at: new Date().toISOString() }).eq("id", bundleId);
  return NextResponse.json({ success: true });
}
