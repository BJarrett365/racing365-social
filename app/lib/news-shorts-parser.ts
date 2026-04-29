import {
  NEWS_SHORT_DEFAULT_STYLE,
  type NewsShortAnimationStyle,
  type NewsShortFfmpegPlan,
  type NewsShortParseRequest,
  type NewsShortSlide,
  type NewsShortTemplateData,
} from "@/app/features/news-shorts/types";
import { decodeHtmlEntities } from "@/app/lib/html-entities";

export type ParsedNewsShortArticle = {
  sourceUrl: string;
  title: string;
  strapline: string;
  author: string;
  publishDate: string;
  heroImage: string;
  articleImages: string[];
  tags: string[];
  bodyParagraphs: string[];
  keyQuotes: string[];
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function stripTags(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function wordsLimit(text: string, maxWords = 18): string {
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length <= maxWords) return text.trim();
  return `${parts.slice(0, maxWords).join(" ")}...`;
}

function cleanLine(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

function titleToHook(title: string): string {
  const line = title.replace(/^[“"'`]+|[”"'`]+$/g, "").trim();
  if (!line) return "Breaking F1 update";
  return wordsLimit(line, 13);
}

function getMetaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const p of patterns) {
    const hit = html.match(p);
    // Meta attributes often contain `&quot;`, `&#039;`, etc. — decode like stripTags.
    if (hit?.[1]) return stripTags(hit[1]);
  }
  return "";
}

function extractTagList(html: string): string[] {
  const tags = new Set<string>();
  const keywords = getMetaContent(html, "keywords");
  if (keywords) {
    for (const k of keywords.split(",")) {
      const t = cleanLine(k);
      if (t) tags.add(t);
    }
  }
  const rx = /<meta[^>]+property=["']article:tag["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  for (const m of html.matchAll(rx)) {
    const t = stripTags(m[1] ?? "");
    if (t) tags.add(t);
  }
  return [...tags].slice(0, 8);
}

function extractParagraphs(html: string): string[] {
  const inArticle =
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ??
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ??
    html;
  const paragraphs: string[] = [];
  for (const m of inArticle.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripTags(m[1] ?? "");
    if (!text) continue;
    if (text.length < 50) continue;
    paragraphs.push(text);
  }
  if (paragraphs.length >= 2) return paragraphs.slice(0, 12);
  const fallback = stripTags(inArticle).split(/(?<=[.!?])\s+/);
  return fallback.map(cleanLine).filter((x) => x.length > 60).slice(0, 10);
}

function extractBestQuotes(html: string, body: string[]): string[] {
  const found: string[] = [];
  for (const m of html.matchAll(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi)) {
    const text = stripTags(m[1] ?? "");
    if (text.length > 30) found.push(text);
  }
  if (found.length >= 2) return found.slice(0, 4);

  const quoteRe = /“([^”]{18,220})”|"([^"]{18,220})"/g;
  for (const p of body) {
    for (const q of p.matchAll(quoteRe)) {
      const text = cleanLine(q[1] || q[2] || "");
      if (text.length > 18) found.push(text);
    }
  }
  if (found.length > 0) return [...new Set(found)].slice(0, 4);
  return body.filter((x) => x.length > 70).slice(0, 2);
}

function titleCaseWords(text: string): string[] {
  const words = text.match(/\b[A-Z][a-zA-Z0-9-]+\b/g) ?? [];
  return words.filter((w) => w.length > 3);
}

function chooseHighlights(lines: string[]): string[] {
  const pool = new Set<string>();
  for (const line of lines) {
    for (const w of titleCaseWords(line)) pool.add(w);
    const upper = line.match(/\b(F1|V8|Supercars|Lawson|Red Bull|Racing Bulls)\b/gi) ?? [];
    for (const w of upper) pool.add(w);
  }
  return [...pool].slice(0, 4);
}

function splitFeedItems(xml: string): string[] {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  if (items.length > 0) return items;
  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => m[0]);
}

function itemField(itemXml: string, tag: string): string {
  const rx = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const val = itemXml.match(rx)?.[1] ?? "";
  return stripTags(val);
}

function atomLink(itemXml: string): string {
  const href = itemXml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] ?? "";
  return cleanLine(href);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  return await res.text();
}

async function resolveArticleUrlFromRss(input: Extract<NewsShortParseRequest, { sourceType: "rss" }>) {
  if (input.itemRawXml?.trim()) {
    const inline = input.itemRawXml;
    const link = itemField(inline, "link") || atomLink(inline);
    const title = itemField(inline, "title");
    if (link) return { link, title };
  }
  const xml = await fetchText(input.feedUrl);
  const items = splitFeedItems(xml);
  if (items.length === 0) throw new Error("No RSS items found.");

  const matched =
    (input.itemUrl
      ? items.find((item) => {
          const link = itemField(item, "link") || atomLink(item);
          return link === input.itemUrl;
        })
      : undefined) ??
    (input.itemTitle
      ? items.find((item) => itemField(item, "title").toLowerCase().includes(input.itemTitle!.toLowerCase()))
      : undefined) ??
    items[0];

  const link = itemField(matched, "link") || atomLink(matched);
  const title = itemField(matched, "title");
  if (!link) throw new Error("Could not resolve article link from RSS item.");
  return { link, title };
}

async function parseArticle(url: string): Promise<ParsedNewsShortArticle> {
  const html = await fetchText(url);
  const ogTitle = getMetaContent(html, "og:title");
  const h1 = stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const title = ogTitle || h1 || "Untitled story";
  const strapline =
    getMetaContent(html, "og:description") ||
    getMetaContent(html, "twitter:description") ||
    getMetaContent(html, "description") ||
    "";
  const author =
    getMetaContent(html, "author") || getMetaContent(html, "article:author") || getMetaContent(html, "parsely-author");
  const publishDate =
    getMetaContent(html, "article:published_time") ||
    getMetaContent(html, "publish-date") ||
    getMetaContent(html, "date");
  const heroImage = getMetaContent(html, "og:image") || getMetaContent(html, "twitter:image");
  const bodyParagraphs = extractParagraphs(html);
  const keyQuotes = extractBestQuotes(html, bodyParagraphs);
  const tags = extractTagList(html);

  // Only keep the main/hero image. (Earlier we attempted to scrape additional <img> tags,
  // but the UX requested we show just one image.)
  const articleImages = heroImage ? [heroImage] : [];
  return {
    sourceUrl: url,
    title,
    strapline,
    author,
    publishDate,
    heroImage,
    articleImages,
    tags,
    bodyParagraphs,
    keyQuotes,
  };
}

function hostReadMoreLabel(sourceUrl: string): string {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
    return host ? `Read more on ${host}` : "Read more at the source";
  } catch {
    return "Read more at the source";
  }
}

/** One intro, one content slide per body paragraph, one outro. Paragraph count drives total length (e.g. Reels pacing). */
export function makeSlideCopy(article: ParsedNewsShortArticle): NewsShortSlide[] {
  const rawBody = article.bodyParagraphs
    .map((p) => cleanLine(p))
    .filter((p) => p.length > 0)
    .slice(0, 10);
  const body =
    rawBody.length > 0
      ? rawBody
      : ["Key story point from the article.", "Second key update from the article."];
  const quotes = article.keyQuotes.map((q) => cleanLine(q)).filter((q) => q.length > 0);

  const straplineDeck = wordsLimit(article.strapline || body[0] || article.title, 12);
  const introHeadline = wordsLimit(titleToHook(article.title), 14);
  /** Intro deck (not a generic “short update”) — strapline or first graf, same band as on-site dek lines. */
  const introSubline = wordsLimit(article.strapline || rawBody[0] || article.title, 28);
  const outroHeadline = wordsLimit(
    `What happens next for ${article.title.split(" ").slice(0, 3).join(" ")}?`,
    12,
  );
  const outroSubline = hostReadMoreLabel(article.sourceUrl);

  const mk = (
    id: string,
    type: NewsShortSlide["type"],
    label: string,
    headline: string,
    subline: string,
    durationSec: number,
    animationStyle: NewsShortAnimationStyle,
    zoom: number,
  ): NewsShortSlide => ({
    id,
    type,
    label,
    headline,
    subline,
    imageUrl: article.heroImage,
    durationSec,
    animationStyle,
    backgroundAnimation: "zoom-in",
    backgroundZoom: zoom,
    highlightWords: chooseHighlights([headline, subline]),
  });

  const animCycle: NewsShortAnimationStyle[] = ["slide-up", "soft-pop", "fade-up", "slide-up"];
  const contentDurationSec = body.length > 9 ? 4 : body.length > 6 ? 5 : 6;

  const slides: NewsShortSlide[] = [];
  slides.push(mk("slide-1", "intro", "INTRO", introHeadline, introSubline, 5, "fade-up", 1.04));

  for (let i = 0; i < body.length; i++) {
    const id = `slide-${i + 2}`;
    const headline = wordsLimit(body[i], 18);
    let subline: string;
    if (i === 0) {
      subline =
        quotes.length > 0
          ? wordsLimit(quotes[0], 16)
          : rawBody.length > 1
            ? wordsLimit(rawBody[1], 16)
            : straplineDeck;
    } else if (quotes.length > 0) {
      subline = wordsLimit(quotes[(i - 1) % quotes.length], 16);
    } else {
      subline = wordsLimit(article.strapline || body[i - 1], 10);
    }
    const label =
      body.length === 1
        ? "STORY"
        : body.length === 2
          ? i === 0
            ? "KEY POINT"
            : "DETAIL"
          : "";
    const zoom = Math.min(1.18, 1.06 + i * 0.02);
    slides.push(mk(id, "content", label, headline, subline, contentDurationSec, animCycle[i % animCycle.length], zoom));
  }

  const outroId = `slide-${body.length + 2}`;
  slides.push(
    mk(
      outroId,
      "outro",
      "OUTRO",
      outroHeadline,
      outroSubline,
      5,
      "fade-up",
      Math.min(1.14, 1.06 + body.length * 0.015),
    ),
  );
  return slides;
}

export function buildFfmpegPlan(template: NewsShortTemplateData): NewsShortFfmpegPlan {
  return {
    format: {
      width: 1080,
      height: 1920,
      fps: 30,
      aspect: "9:16",
      targetPlatforms: ["youtube-shorts", "tiktok", "instagram-reels"],
    },
    background: {
      heroImage: template.heroImage,
      overlayOpacity: template.style.overlayOpacity,
      kenBurns: {
        enabled: template.style.animationEnabled,
        zoomPerSlide: template.slides.map((s) => s.backgroundZoom),
      },
    },
    slides: template.slides.map((slide) => ({
      id: slide.id,
      durationSec: slide.durationSec,
      headline: slide.headline,
      subline: slide.subline,
      highlightWords: slide.highlightWords,
      animationStyle: template.style.animationEnabled ? slide.animationStyle : "none",
    })),
  };
}

export async function buildNewsShortsTemplate(input: NewsShortParseRequest): Promise<NewsShortTemplateData> {
  const resolved =
    input.sourceType === "url"
      ? { link: input.url, title: "" }
      : await resolveArticleUrlFromRss(input);
  const article = await parseArticle(resolved.link);
  const slides = makeSlideCopy(article);
  return {
    sourceType: input.sourceType,
    sourceUrl: article.sourceUrl,
    title: article.title || resolved.title || "Untitled story",
    strapline: article.strapline,
    author: article.author || "Planet Sport newsroom",
    publishDate: article.publishDate,
    heroImage: article.heroImage,
    articleImages: article.articleImages,
    tags: article.tags,
    articleBody: article.bodyParagraphs,
    keyQuotes: article.keyQuotes,
    slides,
    style: { ...NEWS_SHORT_DEFAULT_STYLE },
    notes:
      "Auto-generated from article parsing. Edit headlines, highlights, durations, and style before exporting.",
  };
}
