import type { RunnerSilks } from "@/types";

/**
 * Shared silk rendering rules.
 *
 * Strategy:
 * 1. **imageUrl** — Feed/CDN composite (jersey + cap). Best match to sources like Timeform.
 *    Puppeteer must be able to fetch the URL at screenshot time (hotlinking/CSP → proxy via your API).
 * 2. **Procedural SVG** — `body` / `secondary` / `cap` / `pattern` (halves, stripes, …).
 *    If a bitmap URL is set but fails to load, the renderer swaps in procedural art (defaults if `body` is empty).
 */

const DEFAULT_IMAGE_ASPECT = 0.78;

export function isAllowedSilkImageUrl(raw: string): boolean {
  const u = raw.trim();
  if (!u) return false;
  if (u.startsWith("data:image/")) return true;
  if (u.startsWith("https://")) return true;
  if (u.startsWith("http://")) return true;
  if (u.startsWith("/")) return true;
  return false;
}

export function silkImageBoxHeight(heightPx: number): number {
  return Math.max(18, Math.min(400, heightPx));
}

export function silkImageBoxWidth(heightPx: number, aspectWidthOverHeight?: number): number {
  const h = silkImageBoxHeight(heightPx);
  const a =
    typeof aspectWidthOverHeight === "number" && Number.isFinite(aspectWidthOverHeight) && aspectWidthOverHeight > 0
      ? aspectWidthOverHeight
      : DEFAULT_IMAGE_ASPECT;
  return Math.max(16, Math.round(h * a));
}

/**
 * Same-origin path for `RunnerSilks.imageUrl` — proxied fetch with host allowlist (`SILK_IMAGE_HOST_ALLOWLIST`).
 * Example: `silkImageProxyPath("https://cdn.example.com/silk/123.png")` → `/api/silk-image?url=...`
 */
export function silkImageProxyPath(upstreamUrl: string): string {
  return `/api/silk-image?url=${encodeURIComponent(upstreamUrl.trim())}`;
}

const TIMEFORM_SILK_BASE = "https://images.timeform.com/silks/opt";

/** Safe path segment for Timeform silk filenames (e.g. 00887104). */
export function normalizeTimeformSilkCode(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^[0-9A-Za-z_-]{2,40}$/.test(t)) return null;
  return t;
}

export function timeformSilkImageUrlFromCode(code: string): string | null {
  const n = normalizeTimeformSilkCode(code);
  if (!n) return null;
  return `${TIMEFORM_SILK_BASE}/${encodeURIComponent(n)}.png`;
}

/**
 * Bitmap `src` for templates: explicit `imageUrl` wins; else `silkCode` → proxied Timeform PNG.
 */
export function effectiveSilkImageSrc(silks: RunnerSilks): string | undefined {
  const direct = silks.imageUrl?.trim();
  if (direct && isAllowedSilkImageUrl(direct)) return direct;
  const c = silks.silkCode?.trim();
  if (!c) return undefined;
  const abs = timeformSilkImageUrlFromCode(c);
  if (!abs) return undefined;
  return silkImageProxyPath(abs);
}

export function silksAreRenderable(silks: RunnerSilks | undefined): boolean {
  if (!silks) return false;
  if (effectiveSilkImageSrc(silks)) return true;
  return Boolean(silks.body?.trim());
}
