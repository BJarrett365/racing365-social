import type { Sport365Commentary, Sport365CommentaryLine } from "@/app/lib/match-report/types";

const SPORT365_HOST_RE = /(^|\.)sport365\.com$/i;

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(text: string): string {
  return decodeHtml(text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

export function assertSport365MatchUrl(input: string): URL {
  const trimmed = input.trim();
  const u = new URL(trimmed);
  if (u.protocol !== "https:") throw new Error("Sport365 URL must use https.");
  if (!SPORT365_HOST_RE.test(u.hostname)) throw new Error("Only sport365.com match URLs are allowed.");
  if (!/\/football\//i.test(u.pathname)) throw new Error("URL must be a Sport365 football match page.");
  return u;
}

export function extractSport365MatchPageId(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const last = parts.at(-1) ?? "";
  if (/^\d+-\d+$/.test(last)) return last;
  throw new Error("Could not extract Sport365 match page id from URL.");
}

import { extractSport365NextDataJson, fetchSport365MatchPageHtml } from "@/app/lib/match-report/fetch-sport365-match-page";

type Sport365CommsRow = {
  txt?: string;
  min?: number;
  inj_time?: number;
};

function readSport365CommsFromNextData(nextData: unknown): Sport365CommentaryLine[] {
  const match = (nextData as { props?: { pageProps?: { match?: { comms?: Sport365CommsRow[] } } } })?.props
    ?.pageProps?.match;
  const comms = match?.comms;
  if (!Array.isArray(comms) || comms.length === 0) return [];

  const lines: Sport365CommentaryLine[] = [];
  for (const row of comms) {
    const text = typeof row.txt === "string" ? row.txt.trim() : "";
    if (!text || text.length < 8) continue;
    const minute = typeof row.min === "number" && Number.isFinite(row.min) ? row.min : undefined;
    const injTime = typeof row.inj_time === "number" && row.inj_time > 0 ? row.inj_time : undefined;
    const minuteLabel =
      minute !== undefined && injTime !== undefined ? `${minute}+${injTime}` : minute !== undefined ? `${minute}` : undefined;
    lines.push({
      minute,
      text: minuteLabel ? `[${minuteLabel}'] ${text}`.slice(0, 800) : text.slice(0, 800),
    });
  }
  return lines;
}

function parseCommentsFromHtml(html: string): Sport365CommentaryLine[] {
  const nextData = extractSport365NextDataJson(html);
  const fromComms = nextData ? readSport365CommsFromNextData(nextData) : [];
  if (fromComms.length > 0) {
    return fromComms.sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0));
  }

  const lines: Sport365CommentaryLine[] = [];
  const blockRe = /(\d{1,2}(?:\+\d)?)['′]?\s*[-–:]\s*([^<]{8,400})/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null && lines.length < 80) {
    const minute = Number(String(m[1]).replace(/\+.*$/, ""));
    const text = stripTags(m[2] ?? "");
    if (text) lines.push({ minute: Number.isFinite(minute) ? minute : undefined, text });
  }
  return lines;
}

function buildCommentaryDigest(lines: Sport365CommentaryLine[]): string {
  return lines
    .slice(0, 40)
    .map((row) => `${row.minute !== undefined ? `${row.minute}'` : "?"} ${row.text}`)
    .join("\n");
}

export async function parseSport365Commentary(sourceUrl: string): Promise<Sport365Commentary> {
  const url = assertSport365MatchUrl(sourceUrl).toString();
  const matchPageId = extractSport365MatchPageId(url);
  const html = await fetchSport365MatchPageHtml(url);
  return parseSport365CommentaryFromHtml(html, url, matchPageId);
}

export function parseSport365CommentaryFromHtml(
  html: string,
  url: string,
  matchPageId: string,
): Sport365Commentary {
  const lines = parseCommentsFromHtml(html).sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  if (lines.length === 0) throw new Error("No commentary lines found on Sport365 page.");

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1] ?? "") : "";
  const teamMatch = title.match(/^(.+?)\s+v\s+(.+?)(?:\s+live|\s+\|)/i);

  return {
    sourceUrl: url,
    matchPageId,
    homeTeam: teamMatch?.[1]?.trim(),
    awayTeam: teamMatch?.[2]?.trim(),
    competition: undefined,
    lines,
    digest: buildCommentaryDigest(lines),
    importedAt: new Date().toISOString(),
  };
}
