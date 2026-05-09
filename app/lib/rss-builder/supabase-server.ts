import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerSecretAsync } from "@/app/lib/server-secrets";

let cache: { client: SupabaseClient; fingerprint: string } | null = null;

/**
 * Service-role client for server-side RSS Builder APIs (bypasses RLS).
 * Resolution order: `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` env vars, then Admin-stored
 * settings (same names via server-secrets), with `NEXT_PUBLIC_SUPABASE_URL` as URL fallback only.
 */
export async function getRssBuilderSupabaseAsync(): Promise<SupabaseClient | null> {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    (await getServerSecretAsync("SUPABASE_URL")) ||
    "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || (await getServerSecretAsync("SUPABASE_SERVICE_ROLE_KEY")) || "";
  if (!url.trim() || !key.trim()) {
    cache = null;
    return null;
  }
  const fingerprint = `${url.trim()}\0${key.trim()}`;
  if (cache?.fingerprint === fingerprint) return cache.client;
  const client = createClient(url.trim(), key.trim(), { auth: { persistSession: false, autoRefreshToken: false } });
  cache = { client, fingerprint };
  return client;
}

export function rssBuilderUnavailableResponse() {
  return new Response(
    JSON.stringify({
      error:
        "RSS Import Builder requires Supabase. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment, or save them under Admin → Provider keys → Supabase, then apply the SQL migration in supabase/migrations/.",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}
