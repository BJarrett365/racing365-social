import type { ArticleHtmlParser, ParsedArticleFields } from "@/features/editing-studio/lib/article-import/parser-types";
import {
  absolutizeUrl,
  decodeHtmlEntities,
  escapeRegExp,
  stripTags,
} from "@/features/editing-studio/lib/article-import/html-text-utils";

function metaContent(html: string, key: string): string | undefined {
  const k = escapeRegExp(key);
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${k}["']`, "i"),
  ];
  for (const rx of patterns) {
    const m = html.match(rx);
    if (m?.[1]) return decodeHtmlEntities(m[1]).trim();
  }
  return undefined;
}

function linkRelCanonical(html: string, baseUrl: string): string | undefined {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (m?.[1]) return absolutizeUrl(m[1], baseUrl);
  const m2 = html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return m2?.[1] ? absolutizeUrl(m2[1], baseUrl) : undefined;
}

function titleFromHtml(html: string): string | undefined {
  const og = metaContent(html, "og:title") ?? metaContent(html, "twitter:title");
  if (og) return og;
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return t ? stripTags(t).slice(0, 500) : undefined;
}

function heroFromHtml(html: string, baseUrl: string): string | undefined {
  const raw =
    metaContent(html, "og:image") ??
    metaContent(html, "og:image:url") ??
    metaContent(html, "twitter:image") ??
    metaContent(html, "twitter:image:src");
  if (!raw) return undefined;
  return absolutizeUrl(raw, baseUrl);
}

function authorFromHtml(html: string): string | undefined {
  return (
    metaContent(html, "author") ??
    metaContent(html, "article:author") ??
    metaContent(html, "twitter:creator") ??
    html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim()
  );
}

function publishedFromHtml(html: string): string | undefined {
  const d =
    metaContent(html, "article:published_time") ??
    metaContent(html, "og:updated_time") ??
    metaContent(html, "datePublished") ??
    html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1];
  return d?.trim();
}

function tagsFromHtml(html: string): string[] | undefined {
  const kw = metaContent(html, "keywords") ?? metaContent(html, "news_keywords");
  const fromMeta = kw
    ? kw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const articleTag = [...html.matchAll(/<meta[^>]+property=["']article:tag["'][^>]+content=["']([^"']+)["']/gi)]
    .map((m) => m[1]?.trim())
    .filter(Boolean) as string[];
  const merged = [...new Set([...fromMeta, ...articleTag])];
  return merged.length ? merged : undefined;
}

function bodyFromHtml(html: string): string | undefined {
  const withoutJunk = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const article =
    withoutJunk.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    withoutJunk.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    withoutJunk;
  const text = stripTags(article);
  return text.length > 40 ? text.slice(0, 400_000) : text.length > 0 ? text : undefined;
}

function summaryFromHtml(html: string): string | undefined {
  const s =
    metaContent(html, "og:description") ??
    metaContent(html, "twitter:description") ??
    metaContent(html, "description");
  return s?.slice(0, 4000);
}

/**
 * Default Open Graph / meta / article-tag extraction. Safe when fields are missing.
 */
export class GenericArticleHtmlParser implements ArticleHtmlParser {
  readonly id = "generic-html";

  matches(_hostname: string): boolean {
    return true;
  }

  parse(html: string, canonicalUrl: string): ParsedArticleFields {
    const canonical = linkRelCanonical(html, canonicalUrl) ?? canonicalUrl;
    const title = titleFromHtml(html);
    const summary = summaryFromHtml(html);
    const bodyText = bodyFromHtml(html);
    const heroImageUrl = heroFromHtml(html, canonical);
    const sourceName = metaContent(html, "og:site_name") ?? metaContent(html, "application-name");
    const author = authorFromHtml(html);
    const publishDate = publishedFromHtml(html);
    const tags = tagsFromHtml(html);

    return {
      title,
      summary,
      bodyText,
      heroImageUrl,
      sourceName,
      author,
      publishDate,
      tags,
    };
  }
}
