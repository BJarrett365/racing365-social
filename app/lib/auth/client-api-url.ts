import { withAppPathPrefix } from "@/app/lib/app-base-path";

/**
 * Browser `fetch()` URL for Plexa auth API routes.
 * When `NEXT_PUBLIC_BASE_PATH` is set, auth handlers live under that prefix; a bare `/api/auth/...`
 * request returns an HTML 404 and `res.json()` throws ("Unexpected token '<'...").
 */
export function plexaAuthApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return withAppPathPrefix(p);
}
