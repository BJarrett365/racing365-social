import { NextResponse } from "next/server";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";
import { assertRssBuilderAccess } from "@/app/lib/rss-builder/route-guard";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const itemId = (await ctx.params).id;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  let body: { status?: "visible" | "hidden" | "blocked"; pinned?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (body.status === "visible" || body.status === "hidden" || body.status === "blocked") patch.status = body.status;
  if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No valid fields." }, { status: 400 });

  const { data, error } = await supabase.from("rss_feed_items").update(patch).eq("id", itemId).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}
