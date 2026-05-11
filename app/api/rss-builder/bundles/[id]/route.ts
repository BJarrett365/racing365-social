import { NextResponse } from "next/server";
import { DUPLICATE_BUNDLE_NAME_MESSAGE, escapeForPostgrestIlikeExact } from "@/app/lib/rss-builder/bundle-name";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";
import { assertRssBuilderAccess } from "@/app/lib/rss-builder/route-guard";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();
  const { data: bundle, error } = await supabase.from("rss_bundles").select("*").eq("id", id).single();
  if (error || !bundle) return NextResponse.json({ error: "Bundle not found." }, { status: 404 });
  const { data: links } = await supabase.from("rss_bundle_feeds").select("feed_id").eq("bundle_id", id);
  return NextResponse.json({ bundle, feedIds: (links ?? []).map((r: { feed_id: string }) => r.feed_id) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();
  let body: { name?: string; starred?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string" && body.name.trim()) {
    const trimmed = body.name.trim();
    const pattern = escapeForPostgrestIlikeExact(trimmed);
    const { data: clash } = await supabase.from("rss_bundles").select("id").ilike("name", pattern).neq("id", id).maybeSingle();
    if (clash) return NextResponse.json({ error: DUPLICATE_BUNDLE_NAME_MESSAGE }, { status: 409 });
    patch.name = trimmed;
  }
  if (typeof body.starred === "boolean") patch.starred = body.starred;
  const { data, error } = await supabase.from("rss_bundles").update(patch).eq("id", id).select("*").single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: DUPLICATE_BUNDLE_NAME_MESSAGE }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ bundle: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();
  const { error } = await supabase.from("rss_bundles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
