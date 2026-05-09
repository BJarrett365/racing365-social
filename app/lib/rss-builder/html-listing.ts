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

function pathnameLooksArticleLike(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (/\/(search|login|signin|register|signup|contact|about|privacy|terms|cookies?|account|cart|checkout|subscribe)(\/|$)/.test(p)) {
    return false;
  }
  if (/(news|article|blog|story|reports?|features?|reviews?|racing|football|sport)/i.test(p)) return true;
  const segments = p.split("/").filter(Boolean);
  if (segments.length >= 3) return true;
  if (segments.length === 2 && segments[1].length > 16) return true;
  return false;
}

function genericAnchorTitle(title: string): boolean {
  return /^(news|more|read more|latest|click here|next|previous|home|menu)$/i.test(title);
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
  const candidates = new Map<string, string>();
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
    if (!pathnameLooksArticleLike(url.pathname)) continue;
    const title = textFromHtml(match[3] ?? "").replace(/\s+/g, " ").trim();
    if (title.length < 8 || genericAnchorTitle(title)) continue;
    if (!candidates.has(href)) candidates.set(href, title);
    if (candidates.size >= cap) break;
  }

  const pageOgImage = firstHtmlMeta(html, ["og:image", "twitter:image"]);
  const channelTitle = htmlPageTitle(html, source.hostname);
  const listingDescription = firstHtmlMeta(html, ["description", "og:description"]);

  const items: RssChannelItem[] = [...candidates.entries()].map(([link, title]) => {
    const desc =
      listingDescription && listingDescription.length > 0
        ? sanitizeImportedContent(`<p>${listingDescription}</p>`)
        : sanitizeImportedContent(`<p>${title}</p>`);
    return {
      title,
      link,
      guid: link,
      descriptionHtml: desc,
      imageUrl: pageOgImage ? sanitizeImportedContent(pageOgImage) : "",
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
