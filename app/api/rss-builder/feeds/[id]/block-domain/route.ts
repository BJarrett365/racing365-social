import { NextResponse } from "next/server";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";
import { assertRssBuilderAccess } from "@/app/lib/rss-builder/route-guard";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const { id: feedId } = await ctx.params;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  let body: { domain?: string };
  try {
    body = (await req.json()) as { domain?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const domain = body.domain?.trim().toLowerCase().replace(/^www\./, "");
  if (!domain) return NextResponse.json({ error: "domain is required." }, { status: 400 });

  const { error: e1 } = await supabase.from("rss_feed_blocked_domains").upsert({ feed_id: feedId, domain }, { onConflict: "feed_id,domain" });
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  const { error: e2 } = await supabase
    .from("rss_feed_items")
    .update({ status: "blocked" })
    .eq("feed_id", feedId)
    .in("source_domain", [domain, `www.${domain}`]);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
