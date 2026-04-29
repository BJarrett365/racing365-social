import type { TeamtalkNewsBundle } from "@/types";

export const DEFAULT_TEAMTALK_FEED_URL = "https://www.teamtalk.com/mobile-app-feed";

export type TeamtalkFeedItem = {
  id: number;
  headline: string;
  slug: string;
  link: string;
  category?: string[] | null;
  excerpt?: string | null;
  description?: string | null;
  image?: string | null;
  image_title?: string | null;
  transfer_tags?: string[] | null;
  pub_date?: string | null;
};

type TeamtalkFeedResponse = {
  status?: number;
  message?: string;
  items?: TeamtalkFeedItem[];
};

/** Lightweight row for the import UI / GET API */
export type TeamtalkFeedItemPreview = {
  storyId: number;
  headline: string;
  excerpt: string;
  image?: string | null;
  tag: string;
  pub_date?: string | null;
  link: string;
};

/** Strip basic HTML entities and tags for plain-text fields. */
export function decodeTeamtalkPlainText(raw: string): string {
  let s = raw.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201c")
    .replace(/&#8221;/g, "\u201d")
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#8230;/g, "\u2026")
    .replace(/&quot;/g, "\u0022")
    .replace(/&apos;/g, "\u0027")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return s.replace(/\s+/g, " ").trim();
}

export function teamtalkTagFromCategories(categories: string[] | null | undefined): string {
  const c = (categories ?? []).map((x) => x.toLowerCase());
  if (c.some((x) => x.includes("exclusive"))) return "EXCLUSIVE";
  if (c.some((x) => x.includes("transfer"))) return "TRANSFER";
  if (c.some((x) => x.includes("rumour") || x.includes("rumor"))) return "RUMOUR";
  return "NEWS";
}

/** Break headline into up to four uppercase lines for neon bars (~26 chars per line). */
export function splitHeadlineToNeonLines(headline: string, maxLines = 4, softMax = 26): string[] {
  const h = headline.toUpperCase().replace(/\s+/g, " ").trim();
  if (!h) return Array.from({ length: maxLines }, () => "");
  const lines: string[] = [];
  let rest = h;
  while (rest && lines.length < maxLines) {
    if (rest.length <= softMax) {
      lines.push(rest);
      break;
    }
    let cut = rest.lastIndexOf(" ", softMax);
    if (cut < Math.min(12, softMax * 0.4)) cut = softMax;
    const line = rest.slice(0, cut).trim();
    lines.push(line || rest.slice(0, softMax));
    rest = rest.slice(cut).trim();
    if (!line) break;
  }
  if (rest && lines.length < maxLines) lines.push(rest.slice(0, 120));
  while (lines.length < maxLines) lines.push("");
  return lines.slice(0, maxLines);
}

export function teamtalkFeedItemToPreview(item: TeamtalkFeedItem): TeamtalkFeedItemPreview {
  const ex = decodeTeamtalkPlainText(item.excerpt ?? "");
  return {
    storyId: item.id,
    headline: item.headline,
    excerpt: ex.length > 240 ? `${ex.slice(0, 237)}…` : ex,
    image: item.image,
    tag: teamtalkTagFromCategories(item.category),
    pub_date: item.pub_date ?? null,
    link: item.link,
  };
}

function bundleFieldsFromFeedItem(item: TeamtalkFeedItem): Omit<TeamtalkNewsBundle, "id"> {
  const excerpt = decodeTeamtalkPlainText(item.excerpt ?? "");
  const desc = decodeTeamtalkPlainText((item.description ?? "").replace(/<[^>]*>/g, " "));
  const secondary = (excerpt || desc).slice(0, 620).trim();

  return {
    feedStoryId: item.id,
    sourceUrl: item.link,
    tag: teamtalkTagFromCategories(item.category),
    headlineLines: splitHeadlineToNeonLines(item.headline),
    playerImageUrl: item.image?.trim() || undefined,
    playerName: item.image_title?.trim() || "",
    secondaryParagraph: secondary || "Read more on TEAMtalk.",
    linkCta: "LINK IN FIRST COMMENT",
    outroLine: "Follow TEAMtalk for more.",
  };
}

/** Map a feed story into a saved Shorts template bundle (caller supplies new tpl-* id). */
export function teamtalkFeedItemToImportedBundle(item: TeamtalkFeedItem, templateId: string): TeamtalkNewsBundle {
  return { id: templateId, ...bundleFieldsFromFeedItem(item) };
}

/**
 * Fetch raw items from the TEAMtalk mobile app JSON feed (no caching — use when user clicks Fetch).
 * TEAMTALK_FEED_ENABLED=0 returns []. TEAMTALK_FEED_URL overrides default.
 */
export async function fetchTeamtalkFeedItems(): Promise<TeamtalkFeedItem[]> {
  if (process.env.TEAMTALK_FEED_ENABLED === "0") return [];

  const url = (process.env.TEAMTALK_FEED_URL ?? DEFAULT_TEAMTALK_FEED_URL).trim();
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Racing365Social/1.0",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Feed request failed (${res.status})`);
  }
  const json = (await res.json()) as TeamtalkFeedResponse;
  if (json.status !== 200 || !Array.isArray(json.items)) {
    throw new Error("Unexpected feed response shape");
  }
  return json.items;
}
