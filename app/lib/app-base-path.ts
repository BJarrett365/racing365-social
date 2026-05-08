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

/** Strip the app prefix so route logic can use root-relative paths like /api/... */
export function stripAppPathPrefix(pathname: string): string {
  if (!APP_PATH_PREFIX) return pathname;
  if (pathname === APP_PATH_PREFIX) return "/";
  if (pathname.startsWith(`${APP_PATH_PREFIX}/`)) return pathname.slice(APP_PATH_PREFIX.length);
  return pathname;
}
