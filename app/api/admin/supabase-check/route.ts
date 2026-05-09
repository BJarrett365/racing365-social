import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecretAsync } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const rssFeedsMissingHint = (message: string, code?: string): string => {
    const m = message.toLowerCase();
    const looksMissing =
      code === "PGRST205" ||
      m.includes("schema cache") ||
      m.includes("could not find the table") ||
      (m.includes("relation") && m.includes("does not exist")) ||
      (m.includes("rss_feeds") && (m.includes("not find") || m.includes("does not exist")));
    if (!looksMissing) return "";
    return (
      " The RSS Import Builder tables are not in this database yet. In Supabase: SQL Editor → New query → paste the entire " +
      "contents of `supabase/migrations/20260207120000_rss_import_builder.sql` from this repo → Run. " +
      "If the project is linked to GitHub for migrations, confirm that migration was applied to this project (or run the SQL manually once)."
    );
  };

  const url =
    body.supabaseUrl?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    (await getServerSecretAsync("SUPABASE_URL")) ||
    "";
  const key =
    body.supabaseServiceRoleKey?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    (await getServerSecretAsync("SUPABASE_SERVICE_ROLE_KEY")) ||
    "";

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Supabase URL and service role key are required (paste in the form or save in admin settings first)." },
      { status: 400 },
    );
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await supabase.from("rss_feeds").select("id").limit(1);
    if (error) {
      const hint = rssFeedsMissingHint(error.message ?? "", error.code);
      return NextResponse.json({ ok: false, error: `${error.message}${hint}` }, { status: 400 });
    }
    let host = url;
    try {
      host = new URL(url).hostname;
    } catch {
      /* keep raw */
    }
    return NextResponse.json({ ok: true, host });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Connection failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
