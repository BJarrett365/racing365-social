import { extractXmlPayload } from "@/app/lib/language-studio/import-feed";
import { sanitizeImportedContent } from "@/app/lib/language-studio/sanitize";
import { decodeHtmlEntities } from "@/app/lib/html-entities";
import { parseRssXmlToChannel } from "@/app/lib/rss-builder/parse-rss";
import type { RssChannelItem } from "@/app/lib/rss-builder/types";

export function looksLikeHtmlDocument(body: string): boolean {
  const t = body.trim().slice(0, 400);
  return /^\s*<!doctype\s+html/i.test(t) || /^\s*<html[\s>]/i.test(t);
}

function textFromHtml(html: string): string {
  return decodeHtmlEntities(
    sanitizeImportedContent(html)
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
      .replace(/<(h[1-6]|p|li|blockquote|br|div|section|article)\b[^>]*>/gi, "\n")
      .replace(/<\/(h[1-6]|p|li|blockquote|div|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line, index, all) => all.indexOf(line) === index)
    .join("\n\n")
    .trim();
}

function firstHtmlMeta(html: string, names: string[]): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const name of names) {
    for (const tag of tags) {
      const nameMatch = /\b(?:name|property)=["']([^"']+)["']/i.exec(tag);
      if (!nameMatch || nameMatch[1].toLowerCase() !== name.toLowerCase()) continue;
      const contentMatch = /\bcontent=(["'])([\s\S]*?)\1/i.exec(tag);
      if (contentMatch?.[2]) return decodeHtmlEntities(contentMatch[2]).trim();
    }
  }
  return "";
}

/** Best-effort hero image from listing HTML (Sporting Life and similar). */
function normalizeAbsoluteImageUrl(raw: string): string {
  let s = decodeHtmlEntities(raw).trim();
  if (!s) return "";
  if (s.startsWith("//")) s = `https:${s}`;
  if (!/^https?:\/\//i.test(s)) return "";
  return s;
}

function firstUrlFromSrcset(srcset: string): string {
  const first = srcset.split(",")[0]?.trim() ?? "";
  return first.split(/\s+/)[0]?.trim() ?? "";
}

/** Sporting Life serves news art on this CDN path (listing cards often embed the URL as text or in attributes). */
function firstSportingLifeNewsCdnInHtml(htmlChunk: string, resolveBase: string): string {
  const abs = htmlChunk.match(
    /https:\/\/(?:www\.)?sportinglife\.com\/images\/news\/\d+x\d+\/[a-f0-9-]{10,}\.(?:jpe?g|png|webp)/i,
  );
  if (abs?.[0]) return normalizeAbsoluteImageUrl(abs[0]);
  const proto = htmlChunk.match(
    /(?:https?:)?\/\/(?:www\.)?sportinglife\.com\/images\/news\/\d+x\d+\/[a-f0-9-]{10,}\.(?:jpe?g|png|webp)/i,
  );
  if (proto?.[0]) {
    let u = proto[0];
    if (u.startsWith("//")) u = `https:${u}`;
    const n = normalizeAbsoluteImageUrl(u);
    if (n) return n;
  }
  const rel = htmlChunk.match(/\/images\/news\/\d+x\d+\/[a-f0-9-]{10,}\.(?:jpe?g|png|webp)/i);
  if (rel?.[0]) return normalizeAbsoluteImageUrl(absoluteUrl(rel[0], resolveBase));
  return "";
}

function firstSportingLifeNewsCdnNearAnchor(html: string, anchorMatch: RegExpMatchArray, listingSourceUrl: string): string {
  const idx = anchorMatch.index;
  if (typeof idx !== "number") return "";
  const full = anchorMatch[0] ?? "";
  const endAnchor = idx + full.length;
  let origin = "https://www.sportinglife.com";
  try {
    const hrefAbs = absoluteUrl(anchorMatch[2]?.trim() ?? "", listingSourceUrl);
    origin = new URL(hrefAbs).origin;
  } catch {
    /* keep default */
  }
  const inFullAnchor = firstSportingLifeNewsCdnInHtml(full, origin);
  if (inFullAnchor) return inFullAnchor;
  const after = firstSportingLifeNewsCdnInHtml(
    html.slice(endAnchor, Math.min(html.length, endAnchor + 5000)),
    origin,
  );
  if (after) return after;
  return firstSportingLifeNewsCdnInHtml(html.slice(Math.max(0, idx - 4000), idx), origin);
}

/**
 * Many listing pages omit `og:image` but put a thumbnail inside each story `<a>` (Sporting Life, etc.).
 */
function firstImageFromListingAnchorInner(innerHtml: string, baseUrl: string): string {
  const sl = firstSportingLifeNewsCdnInHtml(innerHtml, baseUrl);
  if (sl) return sl;
  const toAbs = (raw: string): string => {
    const t = decodeHtmlEntities(raw).trim();
    if (!t) return "";
    const abs = /^https?:\/\//i.test(t) || t.startsWith("//") ? t : absoluteUrl(t, baseUrl);
    return normalizeAbsoluteImageUrl(abs);
  };
  const imgSrc = /<img\b[^>]*\bsrc\s*=\s*(["'])([\s\S]*?)\1/i.exec(innerHtml);
  if (imgSrc?.[2]) {
    const u = toAbs(imgSrc[2]);
    if (u) return u;
  }
  const imgSrcBare = /<img\b[^>]*\bsrc\s*=\s*(https?:\/\/[^\s>]+)/i.exec(innerHtml);
  if (imgSrcBare?.[1]) {
    const u = toAbs(imgSrcBare[1]);
    if (u) return u;
  }
  const dataSrc = /\bdata-src\s*=\s*(["'])([\s\S]*?)\1/i.exec(innerHtml);
  if (dataSrc?.[2]) {
    const u = toAbs(dataSrc[2]);
    if (u) return u;
  }
  const srcset = /\bsrcset\s*=\s*(["'])([\s\S]*?)\1/i.exec(innerHtml);
  if (srcset?.[2]) {
    const first = firstUrlFromSrcset(srcset[2]);
    if (first) {
      const u = toAbs(first);
      if (u) return u;
    }
  }
  return "";
}

function normalizeStoryLinkKey(link: string): string {
  try {
    return new URL(link).href.replace(/\/$/, "");
  } catch {
    return link.trim().replace(/\/$/, "");
  }
}

/**
 * Next.js sites often ship thumbnails only inside `__NEXT_DATA__`, not in listing `og:image`.
 */
function imageStringFromField(raw: unknown): string {
  if (typeof raw === "string") {
    const t = raw.trim();
    const embedded = t.match(
      /https:\/\/(?:www\.)?sportinglife\.com\/images\/news\/\d+x\d+\/[a-f0-9-]{10,}\.(?:jpe?g|png|webp)/i,
    );
    if (embedded?.[0]) return embedded[0];
    return t;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const u = o.url ?? o.src ?? o.href ?? o.contentUrl;
    if (typeof u === "string") return u.trim();
  }
  return "";
}

function pickImageFromStoryObjectWithOrigin(o: Record<string, unknown>, siteOrigin: string): string {
  const tryOne = (raw: unknown): string => {
    const u = imageStringFromField(raw);
    if (!u) return "";
    const abs = /^https?:\/\//i.test(u) || u.startsWith("//") ? u : absoluteUrl(u, siteOrigin);
    return normalizeAbsoluteImageUrl(abs);
  };
  const keys = [
    "image",
    "imageUrl",
    "thumbnail",
    "thumbnailUrl",
    "heroImage",
    "coverImage",
    "teaserImage",
    "leadImage",
    "featuredImage",
    "cardImage",
    "listingImage",
    "primaryImage",
    "photo",
    "picture",
  ];
  for (const k of keys) {
    const n = tryOne(o[k]);
    if (n) return n;
  }
  const media = o.media;
  if (media && typeof media === "object" && !Array.isArray(media)) {
    const mo = media as Record<string, unknown>;
    for (const raw of [mo.url, mo.src, mo.preview_image]) {
      const n = tryOne(raw);
      if (n) return n;
    }
  }
  const images = o.images;
  if (Array.isArray(images) && images[0] != null) {
    const nested = pickImageFromStoryObjectWithOrigin({ image: images[0] } as Record<string, unknown>, siteOrigin);
    if (nested) return nested;
  }
  return "";
}

function recordUrlAndImage(
  out: Map<string, string>,
  linkRaw: string,
  siteOrigin: string,
  o: Record<string, unknown>,
): void {
  if (typeof linkRaw !== "string" || !linkRaw.trim()) return;
  const abs = normalizeAbsoluteImageUrl(
    /^https?:\/\//i.test(linkRaw) || linkRaw.startsWith("//") ? linkRaw : absoluteUrl(linkRaw.trim(), siteOrigin),
  );
  if (!abs) return;
  const img = pickImageFromStoryObjectWithOrigin(o, siteOrigin);
  if (!img) return;
  out.set(normalizeStoryLinkKey(abs), img);
}

function indexNextDataStoryImages(html: string, siteOrigin: string): Map<string, string> {
  const out = new Map<string, string>();
  const m = /<script[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!m?.[1]) return out;
  let data: unknown;
  try {
    data = JSON.parse(m[1].trim());
  } catch {
    return out;
  }

  const recordStory = (o: Record<string, unknown>): void => {
    const linkRaw = o.url ?? o.link ?? o.href ?? o.uri ?? o.canonicalUrl ?? o.path;
    if (typeof linkRaw !== "string") return;
    recordUrlAndImage(out, linkRaw, siteOrigin, o);
  };

  const walk = (v: unknown, depth: number): void => {
    if (depth > 24 || v == null) return;
    if (typeof v !== "object") return;
    if (Array.isArray(v)) {
      for (const el of v) walk(el, depth + 1);
      return;
    }
    const obj = v as Record<string, unknown>;
    recordStory(obj);
    for (const el of Object.values(obj)) walk(el, depth + 1);
  };

  walk(data, 0);
  return out;
}

/** Structured data often lists story URLs with images (works when __NEXT_DATA__ is absent or opaque). */
function indexJsonLdStoryImages(html: string, siteOrigin: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of html.matchAll(/<script[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }

    const visit = (v: unknown, depth: number): void => {
      if (depth > 28 || v == null || typeof v !== "object") return;
      if (Array.isArray(v)) {
        for (const el of v) visit(el, depth + 1);
        return;
      }
      const o = v as Record<string, unknown>;
      if (Array.isArray(o["@graph"])) {
        for (const el of o["@graph"] as unknown[]) visit(el, depth + 1);
      }

      const typesRaw = o["@type"];
      const typeList = Array.isArray(typesRaw) ? typesRaw : typesRaw != null ? [typesRaw] : [];
      const typeStrs = typeList.map((t) => String(t).toLowerCase());

      const linkFromObject = (): string => {
        const u = o.url ?? o.link;
        if (typeof u === "string" && u.trim()) return u.trim();
        const mep = o.mainEntityOfPage;
        if (mep && typeof mep === "object" && !Array.isArray(mep)) {
          const u2 = (mep as Record<string, unknown>).url ?? (mep as Record<string, unknown>)["@id"];
          if (typeof u2 === "string") return u2.trim();
        }
        const id = o["@id"];
        if (typeof id === "string" && /^https?:\/\//i.test(id)) return id.trim();
        return "";
      };

      if (typeStrs.some((t) => /newsarticle|article|blogposting|reportage/.test(t))) {
        const lr = linkFromObject();
        if (lr) recordUrlAndImage(out, lr, siteOrigin, o);
      }

      if (typeStrs.includes("listitem")) {
        const item = o.item;
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const io = item as Record<string, unknown>;
          const lr2 =
            typeof io.url === "string"
              ? io.url.trim()
              : typeof io.link === "string"
                ? io.link.trim()
                : typeof io["@id"] === "string" && /^https?:\/\//i.test(io["@id"])
                  ? io["@id"].trim()
                  : "";
          if (lr2) recordUrlAndImage(out, lr2, siteOrigin, io);
        }
      }

      for (const el of Object.values(o)) visit(el, depth + 1);
    };

    visit(data, 0);
  }
  return out;
}

function firstOpenGraphImageUrl(html: string): string {
  const fromMeta = firstHtmlMeta(html, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]);
  const fromMetaNorm = fromMeta ? normalizeAbsoluteImageUrl(fromMeta) : "";
  if (fromMetaNorm) return fromMetaNorm;
  for (const re of [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /property=["']og:image:url["'][^>]*content=["']([^"']+)["']/i,
    /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
  ]) {
    const m = re.exec(html);
    const u = m?.[1]?.trim();
    if (!u) continue;
    const n = normalizeAbsoluteImageUrl(u);
    if (n) return n;
  }
  return "";
}

/**
 * Single article page HTML: og/twitter image, then Sporting Life `/images/news/…` CDN.
 * Used when hub/listing crawl left `imageUrl` empty (e.g. tips index pages).
 */
export function extractHeroImageFromArticleHtml(html: string, pageUrl: string): string {
  const og = firstOpenGraphImageUrl(html);
  if (og) return og;
  return firstSportingLifeNewsCdnInHtml(html, pageUrl);
}

function htmlPageTitle(html: string, fallback: string): string {
  const ogTitle = firstHtmlMeta(html, ["og:title", "twitter:title"]);
  if (ogTitle) return ogTitle;
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  return decodeHtmlEntities(title ?? fallback).replace(/\s+/g, " ").trim();
}

function absoluteUrl(href: string, sourceUrl: string): string {
  try {
    return new URL(href, sourceUrl).toString();
  } catch {
    return "";
  }
}

function sameSiteHostname(a: string, b: string): boolean {
  return a.replace(/^www\./, "") === b.replace(/^www\./, "");
}

function hostKey(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

function isSportingLifeHost(hostname: string): boolean {
  return hostKey(hostname) === "sportinglife.com";
}

/** Slug segment after `/news/` that is almost never a story (contact pages masquerading as `/news/contact/123`). */
function isUtilityOrNavSlug(slug: string): boolean {
  const s = slug.toLowerCase().replace(/\.(html?|php)$/i, "");
  const blocked = new Set([
    "contact",
    "contact-us",
    "contactus",
    "about",
    "about-us",
    "privacy",
    "privacy-policy",
    "terms",
    "terms-of-use",
    "terms-and-conditions",
    "cookies",
    "cookie-policy",
    "help",
    "support",
    "help-centre",
    "help-center",
    "advertise",
    "advertising",
    "subscribe",
    "login",
    "log-in",
    "signin",
    "sign-in",
    "register",
    "search",
    "sitemap",
    "accessibility",
    "careers",
    "jobs",
    "my-account",
    "account",
    "plus",
    "membership",
    "cookie",
    "cookies-policy",
    "customer-service",
    "legal",
    "imprint",
    "preferences",
  ]);
  if (blocked.has(s)) return true;
  return /^(contact|about|privacy|terms|cookie|help|subscribe|login|sign-?in|register)(-|$)/i.test(s);
}

function titleLooksLikeFooterNav(title: string): boolean {
  const t = title.trim().replace(/\s+/g, " ").toLowerCase();
  const exact = new Set([
    "contact us",
    "contact",
    "about us",
    "about",
    "privacy policy",
    "privacy",
    "terms of use",
    "terms and conditions",
    "terms",
    "cookie policy",
    "cookies",
    "sign in",
    "log in",
    "login",
    "join us",
    "register",
    "subscribe",
    "search",
    "sitemap",
    "accessibility",
    "help centre",
    "help center",
    "help",
    "advertise",
    "advertising",
    "customer service",
    "media enquiries",
    "media inquiries",
    "complaints",
    "preferences",
    "my account",
    "account settings",
  ]);
  if (exact.has(t)) return true;
  if (t.length <= 28 && /^(contact|about|privacy|terms|cookie|help|subscribe|login)/i.test(t)) return true;
  return false;
}

/**
 * Sporting Life news articles use `/racing/news/{slug}/{id}` (and `/football/news/...`, etc.).
 * Hub pages (`/racing/news`, `/racing/racecards`, …) must not be treated as articles.
 */
function sportingLifeArticlePath(pathname: string): boolean {
  const lower = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  if (lower === "/" || lower === "") return false;

  const idTail = lower.match(/\/([^/]+)\/(\d+)$/);
  if (idTail) {
    const slug = idTail[1];
    if (slug === "news") return false;
    if (!lower.includes("/news/")) return false;
    if (isUtilityOrNavSlug(slug)) return false;
    return true;
  }

  const segs = lower.split("/").filter(Boolean);
  if (segs.length >= 4 && segs.includes("news")) {
    const newsIdx = segs.indexOf("news");
    const slugAfterNews = segs[newsIdx + 1];
    if (slugAfterNews && isUtilityOrNavSlug(slugAfterNews)) return false;
    const last = segs[segs.length - 1] ?? "";
    if (/^\d+$/.test(last)) return true;
    if (last.length >= 24 && /-/.test(last)) return true;
  }
  return false;
}

/** Path prefixes that are almost never article pages (any host). */
function isGenericNonArticlePath(pathname: string): boolean {
  const p = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (p === "/" || p === "") return true;
  if (/\/(contact-us|cookie-policy|privacy-policy|terms-of-use)(\/|$)/.test(p)) return true;
  return /\/(search|login|signin|register|signup|contact|about|privacy|terms|cookies?|account|cart|checkout|subscribe|tag\/|category\/|author\/)(\/|$)/.test(
    p,
  );
}

/** Section hubs like `/racing/racecards`, `/football/fixtures` — not story URLs. */
function isLikelySportsHubPath(pathname: string): boolean {
  const p = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  return /\/(racecards|fast-results|full-results|race-replays|my-stable|early-entries|features|tips|racing-tips|football-tips|fixtures|scores|vidiprinter|betting|odds|stats|tables|live|streams?|apps?|plus|membership|subscribe)(\/|$)/.test(
    p,
  );
}

function pathnameLooksArticleLike(pathname: string, hostname: string): boolean {
  if (isSportingLifeHost(hostname)) {
    return sportingLifeArticlePath(pathname);
  }
  const p = pathname.toLowerCase();
  if (isGenericNonArticlePath(pathname)) return false;
  if (isLikelySportsHubPath(pathname)) return false;
  const newsSeg = p.match(/\/news\/([^/]+)/i);
  if (newsSeg?.[1] && isUtilityOrNavSlug(newsSeg[1])) return false;
  if (/\/(news|article|blog|story|reports?)\/[^/]+/i.test(p)) return true;
  const segments = p.split("/").filter(Boolean);
  if (segments.length >= 4) return true;
  if (segments.length === 3) {
    const last = segments[2] ?? "";
    if (last.length >= 22 && /-/.test(last)) return true;
  }
  if (segments.length === 2 && segments[1].length > 28) return true;
  return false;
}

function genericAnchorTitle(title: string): boolean {
  const norm = title.trim().replace(/\s+/g, " ");
  if (titleLooksLikeFooterNav(norm)) return true;
  return /^(news|more|read more|latest|click here|next|previous|home|menu)$/i.test(norm);
}

/**
 * Next.js listing pages often ship story URLs only inside `__NEXT_DATA__`, with no usable
 * `<a href>` article links in the initial HTML (e.g. Racing Post). Walk the JSON like image
 * indexing and collect article-shaped objects with a URL and title.
 */
function collectStoriesFromNextData(
  html: string,
  sourceUrl: string,
  maxItems: number,
): Map<string, { title: string; thumbFromAnchor: string }> {
  const out = new Map<string, { title: string; thumbFromAnchor: string }>();
  const source = new URL(sourceUrl);
  const siteOrigin = source.origin;
  const m = /<script[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!m?.[1]) return out;

  let data: unknown;
  try {
    data = JSON.parse(m[1].trim());
  } catch {
    return out;
  }

  const titleFromObject = (o: Record<string, unknown>): string => {
    const keys = [
      "title",
      "headline",
      "displayTitle",
      "articleTitle",
      "primaryHeadline",
      "cardTitle",
      "seoTitle",
      "name",
      "standFirst",
      "summary",
    ] as const;
    for (const k of keys) {
      const v = o[k];
      if (typeof v !== "string" || !v.trim()) continue;
      const t = textFromHtml(v).replace(/\s+/g, " ").trim();
      if (t.length >= 8 && !genericAnchorTitle(t)) return t;
    }
    return "";
  };

  const tryRecord = (o: Record<string, unknown>): void => {
    if (out.size >= maxItems) return;
    const linkRaw = o.url ?? o.link ?? o.href ?? o.uri ?? o.canonicalUrl ?? o.path;
    if (typeof linkRaw !== "string" || !linkRaw.trim()) return;
    let abs = linkRaw.trim();
    if (abs.startsWith("//")) abs = `https:${abs}`;
    else if (!/^https?:\/\//i.test(abs)) abs = absoluteUrl(abs, sourceUrl);
    if (!abs || !/^https?:\/\//i.test(abs)) return;
    let url: URL;
    try {
      url = new URL(abs);
    } catch {
      return;
    }
    if (!sameSiteHostname(url.hostname, source.hostname)) return;
    if (!pathnameLooksArticleLike(url.pathname, url.hostname)) return;
    const title = titleFromObject(o);
    if (!title) return;
    const href = url.toString();
    if (out.has(href)) return;
    const img = pickImageFromStoryObjectWithOrigin(o, siteOrigin);
    out.set(href, { title, thumbFromAnchor: img });
  };

  const walk = (v: unknown, depth: number): void => {
    if (depth > 24 || out.size >= maxItems || v == null) return;
    if (typeof v !== "object") return;
    if (Array.isArray(v)) {
      for (const el of v) walk(el, depth + 1);
      return;
    }
    const obj = v as Record<string, unknown>;
    tryRecord(obj);
    for (const el of Object.values(obj)) walk(el, depth + 1);
  };

  walk(data, 0);
  return out;
}

/**
 * Pull same-domain article-like links from an HTML listing or hub page into RSS-shaped items.
 */
export function extractHtmlListingToRssChannelItems(
  html: string,
  sourceUrl: string,
  maxItems: number,
): { channelTitle: string; items: RssChannelItem[] } {
  const source = new URL(sourceUrl);
  const linkMatches = [...html.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)];
  const candidates = new Map<string, { title: string; thumbFromAnchor: string }>();
  const cap = Math.min(Math.max(1, maxItems), 500);

  for (const match of linkMatches) {
    const hrefRaw = match[2]?.trim() ?? "";
    if (!hrefRaw || hrefRaw.startsWith("#") || /^(javascript|mailto|tel):/i.test(hrefRaw)) continue;
    const href = absoluteUrl(hrefRaw, sourceUrl);
    if (!href || !/^https?:\/\//i.test(href)) continue;
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      continue;
    }
    if (!sameSiteHostname(url.hostname, source.hostname)) continue;
    if (!pathnameLooksArticleLike(url.pathname, url.hostname)) continue;
    const inner = match[3] ?? "";
    const fullAnchor = match[0] ?? "";
    const openTag = /^<a\b[^>]*>/i.exec(fullAnchor)?.[0] ?? "";
    const forImages = openTag + inner;
    const title = textFromHtml(inner).replace(/\s+/g, " ").trim();
    if (title.length < 8 || genericAnchorTitle(title)) continue;
    let thumbFromAnchor = firstImageFromListingAnchorInner(forImages, sourceUrl);
    if (isSportingLifeHost(url.hostname)) {
      const nearSl = firstSportingLifeNewsCdnNearAnchor(html, match, sourceUrl);
      if (nearSl) thumbFromAnchor = nearSl;
    }
    if (!candidates.has(href)) candidates.set(href, { title, thumbFromAnchor });
    if (candidates.size >= cap) break;
  }

  if (candidates.size === 0) {
    const fromNext = collectStoriesFromNextData(html, sourceUrl, cap);
    for (const [link, rec] of fromNext) {
      if (candidates.size >= cap) break;
      if (!candidates.has(link)) candidates.set(link, rec);
    }
  }

  const siteOrigin = source.origin;
  const nextByLink = indexNextDataStoryImages(html, siteOrigin);
  const jsonLdByLink = indexJsonLdStoryImages(html, siteOrigin);
  for (const [link, rec] of candidates) {
    if (rec.thumbFromAnchor) continue;
    const key = normalizeStoryLinkKey(link);
    const fromStructured = nextByLink.get(key) ?? jsonLdByLink.get(key);
    if (fromStructured) candidates.set(link, { ...rec, thumbFromAnchor: fromStructured });
  }

  const pageOgImage = firstOpenGraphImageUrl(html);
  const channelTitle = htmlPageTitle(html, source.hostname);
  const listingDescription = firstHtmlMeta(html, ["description", "og:description"]);

  const items: RssChannelItem[] = [...candidates.entries()].map(([link, { title, thumbFromAnchor }]) => {
    const desc =
      listingDescription && listingDescription.length > 0
        ? sanitizeImportedContent(`<p>${listingDescription}</p>`)
        : sanitizeImportedContent(`<p>${title}</p>`);
    const imageUrl = (thumbFromAnchor || pageOgImage).trim();
    return {
      title,
      link,
      guid: link,
      descriptionHtml: desc,
      imageUrl,
      enclosureUrl: "",
      publishedRaw: "",
    };
  });

  return { channelTitle, items };
}

/**
 * Prefer RSS/Atom items when present; otherwise parse article links from HTML listing pages.
 */
export function resolveBodyToRssChannel(
  body: string,
  sourceUrl: string,
  maxItems: number,
): { channelTitle: string; items: RssChannelItem[] } {
  let rssResult: { channelTitle: string; items: RssChannelItem[] } | null = null;
  try {
    const xml = extractXmlPayload(body);
    rssResult = parseRssXmlToChannel(xml);
    if (rssResult.items.length > 0) return rssResult;
  } catch {
    rssResult = null;
  }

  const isHtml = looksLikeHtmlDocument(body);
  if (!isHtml) {
    if (rssResult) return rssResult;
    throw new Error("Could not parse response as RSS/Atom XML.");
  }

  const fromHtml = extractHtmlListingToRssChannelItems(body, sourceUrl, maxItems);
  if (fromHtml.items.length > 0) return fromHtml;

  if (rssResult && rssResult.items.length === 0) {
    return rssResult;
  }

  throw new Error(
    "No article links found on this HTML page. Try a news or section index URL, or paste the site’s RSS/Atom feed URL.",
  );
}
