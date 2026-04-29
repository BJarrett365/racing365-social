/**
 * Env-driven rules for `/api/silk-image` — fetch remote silk PNGs/SVGs through your server.
 *
 * `SILK_IMAGE_HOST_ALLOWLIST` — comma-separated hostnames (no scheme).
 * A host matches if it equals an entry or is a subdomain (e.g. `cdn.timeform.com` matches `timeform.com`).
 */

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 4;

export function silkProxyMaxBytes(): number {
  const n = Number(process.env.SILK_IMAGE_MAX_BYTES);
  return Number.isFinite(n) && n > 10_000 ? n : DEFAULT_MAX_BYTES;
}

export function silkProxyFetchTimeoutMs(): number {
  const n = Number(process.env.SILK_IMAGE_FETCH_TIMEOUT_MS);
  return Number.isFinite(n) && n > 1000 ? n : FETCH_TIMEOUT_MS;
}

export function silkProxyMaxRedirects(): number {
  return MAX_REDIRECTS;
}

export function parseSilkHostAllowlist(): string[] {
  const raw = process.env.SILK_IMAGE_HOST_ALLOWLIST?.trim();
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase().replace(/^\.+/, ""))
    .filter(Boolean);
}

export function hostMatchesAllowlist(hostname: string, allowlist: string[]): boolean {
  const h = hostname.toLowerCase();
  for (const entry of allowlist) {
    if (!entry) continue;
    if (h === entry) return true;
    if (h.endsWith(`.${entry}`)) return true;
  }
  return false;
}

/** Block obvious SSRF targets when URL host is already a literal IP or localhost. */
export function isBlockedSilkProxyHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost") return true;
  if (h.endsWith(".localhost")) return true;
  if (h === "0.0.0.0") return true;

  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const c = Number(m[3]);
    const d = Number(m[4]);
    if ([a, b, c, d].some((x) => x > 255)) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

export function assertHttpsOrHttp(url: URL): void {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http(s) URLs are allowed");
  }
}

export { DEFAULT_MAX_BYTES, FETCH_TIMEOUT_MS, MAX_REDIRECTS };
