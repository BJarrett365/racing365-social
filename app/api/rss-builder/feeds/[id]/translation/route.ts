import { NextResponse } from "next/server";
import { getRssBuilderSupabaseAsync, rssBuilderUnavailableResponse } from "@/app/lib/rss-builder/supabase-server";
import { assertRssBuilderAccess } from "@/app/lib/rss-builder/route-guard";
import type { RssTranslationProvider } from "@/app/lib/rss-builder/types";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertRssBuilderAccess(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const supabase = await getRssBuilderSupabaseAsync();
  if (!supabase) return rssBuilderUnavailableResponse();

  let body: { enabled?: boolean; from_lang?: string; to_lang?: string; provider?: RssTranslationProvider };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const patch = {
    updated_at: new Date().toISOString(),
    ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
    ...(typeof body.from_lang === "string" ? { from_lang: body.from_lang } : {}),
    ...(typeof body.to_lang === "string" ? { to_lang: body.to_lang } : {}),
    ...(typeof body.provider === "string" ? { provider: body.provider } : {}),
  };

  const { data, error } = await supabase
    .from("rss_feed_translation_settings")
    .upsert({ feed_id: id, ...patch }, { onConflict: "feed_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ translation: data });
}
