import { NextResponse } from "next/server";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";
import { assertRssBuilderAccess } from "@/app/lib/rss-builder/route-guard";
import type { RssFilterConfig } from "@/app/lib/rss-builder/types";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  let body: { config?: RssFilterConfig };
  try {
    body = (await req.json()) as { config?: RssFilterConfig };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body.config || typeof body.config !== "object") {
    return NextResponse.json({ error: "config object is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rss_feed_filters")
    .upsert({ feed_id: id, config: body.config, updated_at: new Date().toISOString() }, { onConflict: "feed_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ filters: data });
}
