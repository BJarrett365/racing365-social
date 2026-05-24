const TWITTER_STATUS_URL_RE =
  /https?:\/\/(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/[^\s/]+\/status\/(\d+)/gi;

const TWITTER_URL_CAPTURE_RE =
  /https?:\/\/(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/[^\s)]+/gi;

export type ParsedSocialPost = {
  caption: string;
  tweetUrls: string[];
};

export function normalizeTwitterStatusUrl(url: string): string {
  const trimmed = url.trim().replace(/[),.]+$/, "");
  const match = /\/status\/(\d+)/i.exec(trimmed);
  if (!match?.[1]) return trimmed;
  return `https://twitter.com/i/status/${match[1]}`;
}

export function extractTwitterStatusUrls(text: string): string[] {
  const urls = new Set<string>();
  for (const match of text.matchAll(TWITTER_URL_CAPTURE_RE)) {
    const raw = match[0]?.replace(/[),.]+$/, "") ?? "";
    if (!/\/status\/\d+/i.test(raw)) continue;
    urls.add(normalizeTwitterStatusUrl(raw));
  }
  return [...urls];
}

export function stripTwitterUrlsFromText(text: string): string {
  return text
    .replace(TWITTER_URL_CAPTURE_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSocialPostText(text: string): ParsedSocialPost {
  const tweetUrls = extractTwitterStatusUrls(text);
  const caption = stripTwitterUrlsFromText(text);
  return { caption, tweetUrls };
}

export function twitterStatusIdFromUrl(url: string): string | null {
  const match = TWITTER_STATUS_URL_RE.exec(url);
  TWITTER_STATUS_URL_RE.lastIndex = 0;
  return match?.[1] ?? null;
}
