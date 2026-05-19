/**
 * When the app is mounted under a subpath (e.g. https://example.com/l/...),
 * set NEXT_PUBLIC_BASE_PATH=/l at build time. Next.js `basePath` is applied from the same env in next.config.ts.
 */
const raw = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();

/** Normalised prefix such as "/l", or "" when served at the origin root. */
export const APP_PATH_PREFIX = raw === "" || raw === "/" ? "" : raw.replace(/\/$/, "") || "";

export function withAppPathPrefix(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!APP_PATH_PREFIX) return p;
  return `${APP_PATH_PREFIX}${p}`;
}

/** Browser `fetch` URL for same-origin API routes (respects {@link APP_PATH_PREFIX}). */
export function studioApiPath(path: string): string {
  return withAppPathPrefix(path);
}

/** Strip the app prefix so route logic can use root-relative paths like /api/... */
export function stripAppPathPrefix(pathname: string): string {
  if (!APP_PATH_PREFIX) return pathname;
  if (pathname === APP_PATH_PREFIX) return "/";
  if (pathname.startsWith(`${APP_PATH_PREFIX}/`)) return pathname.slice(APP_PATH_PREFIX.length);
  return pathname;
}

/**
 * Absolute URL for same-origin assets when building links on the server (e.g. library file URLs).
 * Uses `Host` / `X-Forwarded-*` so the origin matches the browser (avoids 127.0.0.1 vs localhost),
 * and applies {@link withAppPathPrefix} when the app is mounted under a subpath.
 */
export function absoluteUrlWithAppBasePath(request: Request, pathnameAndQuery: string): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || url.host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || url.protocol.replace(":", "") || "https";
  const origin = `${proto}://${host}`;
  const pq = pathnameAndQuery.startsWith("/") ? pathnameAndQuery : `/${pathnameAndQuery}`;
  return `${origin}${withAppPathPrefix(pq)}`;
}
