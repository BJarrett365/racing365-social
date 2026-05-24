import { decodeHtmlEntities } from "@/app/lib/html-entities";

export type ParsedAuthorPage = {
  displayName: string;
  authorSlug: string;
  authorPageUrl: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks: { platform: string; url: string }[];
  articleTitles: string[];
  articleUrls: string[];
};

const HOST_BRAND: Record<string, string> = {
  "football365.com": "Football365",
  "www.football365.com": "Football365",
  "teamtalk.com": "TEAMtalk",
  "www.teamtalk.com": "TEAMtalk",
  "planetf1.com": "PlanetF1",
  "www.planetf1.com": "PlanetF1",
};

function trimInner(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function firstMatch(html: string, pattern: RegExp): string {
  const match = pattern.exec(html);
  return match?.[1] ? trimInner(stripTags(match[1])) : "";
}

function extractAuthorSlug(url: URL): string | null {
  const match = url.pathname.match(/\/author\/([^/]+)/i);
  if (!match?.[1]) return null;
  return decodeURIComponent(match[1]).trim().toLowerCase();
}

function parseFootball365AuthorPage(html: string, pageUrl: URL): ParsedAuthorPage {
  const authorSlug = extractAuthorSlug(pageUrl) ?? "";
  const displayName =
    firstMatch(html, /<h1[^>]*class="[^"]*author[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
    firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    authorSlug.replace(/-/g, " ");

  const bio =
    firstMatch(html, /<div[^>]*class="[^"]*author-bio[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
    firstMatch(html, /<p[^>]*class="[^"]*author-description[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

  const avatarUrl =
    firstMatch(html, /<img[^>]+class="[^"]*author[^"]*"[^>]+src=["']([^"']+)["']/i) ||
    firstMatch(html, /<img[^>]+src=["']([^"']+)["'][^>]+class="[^"]*author[^"]*"/i);

  const socialLinks: ParsedAuthorPage["socialLinks"] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=(["'])(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)[^"']+)\1[^>]*>/gi)) {
    socialLinks.push({ platform: "x", url: match[2]! });
  }

  const articleTitles: string[] = [];
  const articleUrls: string[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=(["'])(https?:\/\/[^"']+\/[^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[2]!;
    const title = trimInner(stripTags(match[3] ?? ""));
    if (!title || title.length < 12) continue;
    if (!/\/author\//i.test(href) && /football365\.com/i.test(href) && !articleUrls.includes(href)) {
      articleTitles.push(title);
      articleUrls.push(href);
      if (articleTitles.length >= 12) break;
    }
  }

  return {
    displayName,
    authorSlug,
    authorPageUrl: `https://${pageUrl.hostname.replace(/^www\./i, "")}/author/${encodeURIComponent(authorSlug)}`,
    bio: bio || undefined,
    avatarUrl: avatarUrl || undefined,
    socialLinks,
    articleTitles,
    articleUrls,
  };
}

export function brandFromAuthorPageUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  return HOST_BRAND[host] ?? HOST_BRAND[url.hostname.toLowerCase()] ?? null;
}

export function parseAuthorPageHtml(html: string, url: string, brand?: string): ParsedAuthorPage {
  const pageUrl = new URL(url);
  const host = pageUrl.hostname.replace(/^www\./i, "").toLowerCase();
  if (host === "football365.com" || brand?.trim().toLowerCase() === "football365") {
    return parseFootball365AuthorPage(html, pageUrl);
  }
  const authorSlug = extractAuthorSlug(pageUrl);
  if (!authorSlug) throw new Error("Could not parse author slug from URL.");
  return {
    displayName: authorSlug.replace(/-/g, " "),
    authorSlug,
    authorPageUrl: url.replace(/\/$/, ""),
    bio: undefined,
    avatarUrl: undefined,
    socialLinks: [],
    articleTitles: [],
    articleUrls: [],
  };
}

export async function fetchAndParseAuthorPage(url: string, brand?: string): Promise<ParsedAuthorPage> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "user-agent": "PlanetSportStudio Language Studio/1.0", accept: "text/html,*/*" },
  });
  if (!res.ok) throw new Error(`Could not fetch author page (${res.status}).`);
  const html = await res.text();
  return parseAuthorPageHtml(html, url, brand);
}
