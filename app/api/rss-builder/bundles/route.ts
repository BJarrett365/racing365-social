import { NextResponse } from "next/server";
import { makeBundleSlug } from "@/app/lib/rss-builder/slug";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";
import { assertRssBuilderAccess } from "@/app/lib/rss-builder/route-guard";

export async function POST(req: Request) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();
  let body: { name?: string };
  try {
    body = (await req.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("rss_bundles")
    .insert({ slug: makeBundleSlug(name), name, updated_at: now })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ bundle: data });
}
