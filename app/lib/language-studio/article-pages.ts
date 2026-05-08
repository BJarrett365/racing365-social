import { mapWithConcurrency } from "@/app/lib/map-with-concurrency";
import type { LanguageArticle, LanguageSocialEmbed } from "@/app/lib/language-studio/types";
import { sanitizeImportedContent } from "@/app/lib/language-studio/sanitize";

const ARTICLE_STOP_MARKERS = [
  "Related Articles",
  "Latest F1 News",
  "Race Schedule",
  "Editor's Picks",
  "Planet Sport Network",
  "Read next:",
  "Want to be the first to know",
  "You can also subscribe",
];

type ArticlePageData = {
  body?: string;
  author?: string;
  publishDate?: string;
  modifiedDate?: string;
  description?: string;
  imageUrl?: string;
};

function decodeHtml(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lsquo;|&#8216;/gi, "'")
    .replace(/&rsquo;|&#8217;/gi, "'")
    .replace(/&ldquo;|&#8220;/gi, "\"")
    .replace(/&rdquo;|&#8221;/gi, "\"")
    .replace(/&ndash;|&#8211;/gi, "-")
    .replace(/&mdash;|&#8212;/gi, "-")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

function textFromHtml(html: string): string {
  return decodeHtml(
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

function firstMetaContent(html: string, names: string[]): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const name of names) {
    for (const tag of tags) {
      const nameMatch = /\b(?:name|property)=["']([^"']+)["']/i.exec(tag);
      if (!nameMatch || nameMatch[1].toLowerCase() !== name.toLowerCase()) continue;
      const contentMatch = /\bcontent=(["'])([\s\S]*?)\1/i.exec(tag);
      if (contentMatch?.[2]) return decodeHtml(contentMatch[2]).trim();
    }
  }
  return "";
}

function stringValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    return stringValue(rec.name || rec["@id"]);
  }
  return "";
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const text = stringValue(value);
    if (text) return text;
  }
  return "";
}

function extractJsonLdArticleData(html: string): ArticlePageData {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const script of scripts) {
    const raw = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      const parsed = JSON.parse(decodeHtml(raw)) as unknown;
      const stack: unknown[] = [parsed];
      while (stack.length) {
        const node = stack.shift();
        if (!node || typeof node !== "object") continue;
        if (Array.isArray(node)) {
          stack.push(...node);
          continue;
        }
        const rec = node as Record<string, unknown>;
        const type = Array.isArray(rec["@type"]) ? rec["@type"].join(" ") : String(rec["@type"] ?? "");
        if (/Article|NewsArticle|BlogPosting/i.test(type)) {
          return {
            body: typeof rec.articleBody === "string" ? textFromHtml(rec.articleBody) : undefined,
            author: Array.isArray(rec.author) ? firstString(...rec.author) : firstString(rec.author),
            publishDate: firstString(rec.datePublished, rec.dateCreated),
            modifiedDate: firstString(rec.dateModified, rec.dateUpdated),
            description: firstString(rec.description),
            imageUrl: Array.isArray(rec.image) ? firstString(...rec.image) : firstString(rec.image),
          };
        }
        stack.push(...Object.values(rec));
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return {};
}

function extractArticleHtml(html: string): string {
  const article = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1];
  if (article) return article;
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1];
  return main ?? html;
}

function trimAfterArticle(text: string): string {
  let out = text;
  for (const marker of ARTICLE_STOP_MARKERS) {
    const index = out.indexOf(marker);
    if (index > 0) out = out.slice(0, index).trim();
  }
  return out;
}

function stripMetadataLines(
  text: string,
  article: Pick<LanguageArticle, "title" | "author" | "publishDate" | "modifiedDate">,
  extraTitles: string[] = [],
): string {
  const titles = [article.title, ...extraTitles].map((title) => title.trim().toLowerCase()).filter(Boolean);
  const author = (article.author || "").trim().toLowerCase();
  const dateLike = /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|abr|gen|feb|mar|mag|giu|lug|ago|set|ott|nov|dic)\w*\.?\s+\d{4}(?:,?\s+\d{1,2}:\d{2}\s*(?:am|pm)?)?\b|\b\d{4}-\d{2}-\d{2}t\d{2}:\d{2}/i;
  const bylinePrefix = /^(by|di|por|par|von|door)\s+/i;
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines
    .filter((line, index) => {
      if (index >= 12) return true;
      const lower = line.toLowerCase();
      if (titles.includes(lower)) return false;
      if (author && lower === author) return false;
      if (author && bylinePrefix.test(line) && lower.replace(bylinePrefix, "").trim() === author) return false;
      if (line.length <= 80 && dateLike.test(line)) return false;
      return true;
    })
    .join("\n\n")
    .trim();
}

export function stripArticleMetadataLines(text: string, article: Pick<LanguageArticle, "title" | "author" | "publishDate" | "modifiedDate">): string {
  return stripMetadataLines(text, article);
}

export function stripGeneratedArticleMetadataLines(
  text: string,
  article: Pick<LanguageArticle, "title" | "author" | "publishDate" | "modifiedDate">,
  generatedTitle?: string,
): string {
  return stripMetadataLines(text, article, generatedTitle ? [generatedTitle] : []);
}

function stripArticleHeaderLines(text: string, article: LanguageArticle, meta: ArticlePageData): string {
  return stripArticleMetadataLines(text, { ...article, author: meta.author || article.author });
}

function extractAuthorFromText(text: string, article: LanguageArticle): string {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const titleIndex = lines.findIndex((line) => line.toLowerCase() === article.title.trim().toLowerCase());
  const candidate = lines[titleIndex >= 0 ? titleIndex + 1 : 1];
  if (!candidate) return "";
  if (candidate.length > 80 || /\d/.test(candidate) || /[.!?]/.test(candidate)) return "";
  return candidate;
}

function extractDateFromText(text: string): string {
  return /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|abr)[a-z]*\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\b/i.exec(text)?.[0] ?? "";
}

function parseSocialByline(line: string): Pick<LanguageSocialEmbed, "author" | "handle" | "publishedAt"> {
  const cleaned = line.replace(/^[—-]\s*/, "").trim();
  const match = /^(.*?)\s+\((@[^)]+)\)\s+(.+)$/.exec(cleaned);
  if (match) return { author: match[1].trim(), handle: match[2].trim(), publishedAt: match[3].trim() };
  return {};
}

export function extractSocialEmbedsFromBody(body: string): { body: string; socialEmbeds: LanguageSocialEmbed[] } {
  const lines = body.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const socialEmbeds: LanguageSocialEmbed[] = [];
  const out: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const picMatch = /https?:\/\/t\.co\/\S+|pic\.twitter\.com\/[A-Za-z0-9_]+/i.exec(line);
    const xMatch = /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/\S+/i.exec(line);
    const url = picMatch?.[0] || xMatch?.[0];
    if (!url) {
      out.push(line);
      continue;
    }

    const nextLine = lines[index + 1] ?? "";
    const byline = /^[—-]\s*.+\(@[^)]+\)/.test(nextLine) ? parseSocialByline(nextLine) : {};
    const id = `embed_${socialEmbeds.length + 1}`;
    const marker = `[[SOCIAL_EMBED:${id}]]`;
    const originalText = line.replace(url, "").trim();
    socialEmbeds.push({
      id,
      provider: "x",
      marker,
      url: url.startsWith("http") ? url : `https://${url}`,
      originalText,
      ...byline,
      position: out.length,
    });
    out.push(marker);
    if (byline.author || byline.handle) index += 1;
  }
  return { body: out.join("\n\n").trim(), socialEmbeds };
}

function enrichConcurrency(): number {
  const raw = Number(process.env.LANGUAGE_IMPORT_FETCH_CONCURRENCY);
  if (Number.isFinite(raw) && raw >= 1) return Math.min(12, Math.floor(raw));
  return 6;
}

export async function enrichLanguageArticlesFromPages(articles: LanguageArticle[]): Promise<LanguageArticle[]> {
  return mapWithConcurrency(articles, enrichConcurrency(), async (article) => {
    const url = article.canonicalUrl?.trim();
    if (!url || !/^https?:\/\//i.test(url)) return article;

    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "user-agent": "PlanetSportStudio Language Studio/1.0",
          accept: "text/html,application/xhtml+xml,*/*",
        },
      });
      if (!res.ok) return article;

      const html = await res.text();
      const jsonLd = extractJsonLdArticleData(html);
      const jsonLdBody = jsonLd.body ?? "";
      const htmlBody = trimAfterArticle(textFromHtml(extractArticleHtml(html)));
      const rawBody = sanitizeImportedContent(jsonLdBody.length > htmlBody.length ? jsonLdBody : htmlBody);
      const author = jsonLd.author || firstMetaContent(html, ["author", "article:author"]) || extractAuthorFromText(htmlBody, article) || article.author;
      const publishDate = jsonLd.publishDate || firstMetaContent(html, ["article:published_time", "publishdate"]) || article.publishDate || extractDateFromText(htmlBody);
      const modifiedDate = jsonLd.modifiedDate || firstMetaContent(html, ["article:modified_time", "lastmod"]) || article.modifiedDate;
      const body = stripArticleHeaderLines(rawBody, { ...article, author }, { ...jsonLd, author });
      const social = extractSocialEmbedsFromBody(body || article.body);
      const standfirst = jsonLd.description || firstMetaContent(html, ["description", "og:description"]) || article.standfirst;
      const imageUrl = article.imageUrl || jsonLd.imageUrl || firstMetaContent(html, ["og:image", "twitter:image"]);

      return {
        ...article,
        author,
        publishDate,
        modifiedDate,
        body: social.body || body || article.body,
        socialEmbeds: social.socialEmbeds.length ? social.socialEmbeds : article.socialEmbeds,
        standfirst,
        metaDescription: standfirst.slice(0, 180) || article.metaDescription,
        imageUrl,
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return article;
    }
  });
}
