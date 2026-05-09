import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerSecretAsync } from "@/app/lib/server-secrets";

let cache: { client: SupabaseClient; fingerprint: string } | null = null;

/** Strip trailing slashes and accidental `/rest/v1` suffix (avoids PostgREST "requested path is invalid"). */
export function normalizeSupabaseProjectUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "");
  u = u.replace(/\/rest\/v1\/?$/i, "");
  return u;
}

/** Decode `role` claim from a Supabase JWT (anon / authenticated / service_role). */
function jwtRoleFromSupabaseKey(key: string): string | undefined {
  const parts = key.split(".");
  if (parts.length !== 3) return undefined;
  try {
    const json = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: string };
    return typeof json.role === "string" ? json.role : undefined;
  } catch {
    return undefined;
  }
}

/** Extra hint for PostgREST / RLS errors from wrong API key or missing policies. */
export function formatRssBuilderDbError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("row-level security") || m.includes("rls policy")) {
    return `${message} — Use the Supabase **service_role** secret (Dashboard → Settings → API), not the **anon** key. If the key is correct, run the privileges migration \`20260209140000_rss_builder_privileges.sql\` in the SQL Editor.`;
  }
  if (m.includes("permission denied for table") || m.includes("permission denied for relation")) {
    return `${message} — Local dev still talks to your hosted Supabase: open the SQL Editor for the project that matches your \`SUPABASE_URL\` / Admin URL (e.g. *.supabase.co), paste the full file \`supabase/migrations/20260210120000_rss_builder_fix_service_role_grants.sql\` from this repo, and Run. That grants \`USAGE\` on schema \`public\` and DML on all \`rss_*\` for \`service_role\`. Use the **service_role** API secret, not anon.`;
  }
  return message;
}

/**
 * Service-role client for server-side RSS Builder APIs (bypasses RLS when the key is service_role).
 * Resolution order: `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` env vars, then Admin-stored
 * settings (same names via server-secrets), with `NEXT_PUBLIC_SUPABASE_URL` as URL fallback only.
 */
export async function getRssBuilderSupabaseAsync(): Promise<SupabaseClient | null> {
  const urlRaw =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    (await getServerSecretAsync("SUPABASE_URL")) ||
    "";
  const url = normalizeSupabaseProjectUrl(urlRaw);
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || (await getServerSecretAsync("SUPABASE_SERVICE_ROLE_KEY")) || "";
  if (!url.trim() || !key.trim()) {
    cache = null;
    return null;
  }
  const keyTrim = key.trim();
  const role = jwtRoleFromSupabaseKey(keyTrim);
  if (role === "anon" || role === "authenticated") {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        `[rss-builder] Supabase key JWT role is "${role}", not service_role. Paste the service_role secret from Supabase → Settings → API.`,
      );
    }
    cache = null;
    return null;
  }
  const fingerprint = `${url}\0${keyTrim}`;
  if (cache?.fingerprint === fingerprint) return cache.client;
  const client = createClient(url, keyTrim, { auth: { persistSession: false, autoRefreshToken: false } });
  cache = { client, fingerprint };
  return client;
}

export function rssBuilderUnavailableResponse() {
  return new Response(
    JSON.stringify({
      error:
        "RSS Import Builder requires Supabase. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment, or save them under Admin → Provider keys → Supabase. You must use the **service_role** secret (not the anon key). Apply the SQL migrations in supabase/migrations/.",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}
