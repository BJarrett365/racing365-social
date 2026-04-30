import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { decodeHtmlEntities } from "@/app/lib/html-entities";
import type { LanguageArticle, LanguageCode, LanguageTranslation } from "@/app/lib/language-studio/types";
import { newLanguageId } from "@/app/lib/language-studio/store";
import { sanitizeImportedContent } from "@/app/lib/language-studio/sanitize";

type UnknownRecord = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "__cdata",
  parseTagValue: false,
  trimValues: true,
});

function arr<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function rec(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  const r = rec(value);
  const cdata = r.__cdata;
  const inner = r["#text"];
  if (typeof cdata === "string") return cdata.trim();
  if (typeof inner === "string" || typeof inner === "number") return String(inner).trim();
  return "";
}

function first(...values: unknown[]): string {
  for (const value of values) {
    const t = text(value);
    if (t) return t;
  }
  return "";
}

function cleanImportedText(value: string): string {
  return sanitizeImportedContent(decodeHtmlEntities(value));
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function extractTags(item: UnknownRecord): string[] {
  return arr(item.category)
    .map((tag) => cleanImportedText(text(tag)))
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index);
}

function extractLink(item: UnknownRecord): string {
  const link = item.link;
  if (Array.isArray(link)) return first(...link);
  const linkRecord = rec(link);
  return first(linkRecord["@_href"], link);
}

function extractImageUrl(item: UnknownRecord): string {
  const mediaContent = arr(item["media:content"]).map((entry) => rec(entry)["@_url"]);
  const mediaThumbnail = arr(item["media:thumbnail"]).map((entry) => rec(entry)["@_url"]);
  const enclosures = arr(item.enclosure).map((entry) => rec(entry)["@_url"]);
  const candidates: unknown[] = [
    ...mediaContent,
    ...mediaThumbnail,
    ...enclosures,
    rec(item["media:content"])["@_url"],
    rec(item["media:thumbnail"])["@_url"],
    rec(item.enclosure)["@_url"],
    rec(item.image).url,
    item.image,
  ];
  const mediaGroup = rec(item["media:group"]);
  if (mediaGroup["media:content"]) {
    candidates.unshift(...arr(mediaGroup["media:content"]).map((entry) => rec(entry)["@_url"]));
  }
  return first(...candidates);
}

function extractArticleBody(item: UnknownRecord, fallback: string): string {
  const candidates = [
    item["content:encoded"],
    item["content"],
    item["atom:content"],
    item["media:description"],
    item["description"],
    item["summary"],
    fallback,
  ];
  const best = candidates.map(text).sort((a, b) => b.length - a.length)[0] ?? "";
  return best;
}

export function parseLanguageXmlFeed(
  xml: string,
  opts: { importId: string; sourceBrand: string; sourceLanguage: LanguageCode; sourceUrl?: string },
): { feedTitle: string; articles: LanguageArticle[] } {
  const parsed = parser.parse(xml) as UnknownRecord;
  const rssChannel = rec(rec(parsed.rss).channel);
  const atomFeed = rec(parsed.feed);
  const feedTitle = cleanImportedText(first(rssChannel.title, atomFeed.title, opts.sourceBrand));
  const items = arr<unknown>(rssChannel.item).length ? arr<unknown>(rssChannel.item) : arr<unknown>(atomFeed.entry);
  const now = new Date().toISOString();

  const articles = items.map((raw, index) => {
    const item = rec(raw);
    const title = cleanImportedText(first(item.title, `Article ${index + 1}`));
    const description = cleanImportedText(first(item.description, item.summary, item.subtitle));
    const content = sanitizeImportedContent(extractArticleBody(item, description));
    const sourceArticleId = cleanImportedText(first(item.guid, item.id, `${opts.importId}-${index + 1}`));
    const canonicalUrl = extractLink(item);
    const imageUrl = extractImageUrl(item);
    const publishDate = cleanImportedText(first(item.pubDate, item.published, item.updated));
    const modifiedDate = cleanImportedText(first(item["atom:updated"], item.updated, item.modified));
    const author = cleanImportedText(first(item["dc:creator"], item.author, rec(item.author).name));
    const tags = extractTags(item);
    const article: LanguageArticle = {
      id: newLanguageId("larticle"),
      importId: opts.importId,
      sourceBrand: opts.sourceBrand,
      sourceLanguage: opts.sourceLanguage,
      sourceUrl: opts.sourceUrl,
      canonicalUrl,
      sourceArticleId,
      author,
      publishDate,
      modifiedDate,
      category: tags[0] ?? "",
      tags,
      imageUrl,
      title,
      standfirst: description,
      body: content,
      socialEmbeds: [],
      seoTitle: title,
      metaDescription: description.slice(0, 180),
      slug: slugify(title),
      status: "imported",
      createdAt: now,
      updatedAt: now,
    };
    return article;
  });

  return { feedTitle, articles };
}

type TranslationExportOptions = {
  imageLibraryRel?: string;
};

export function buildTranslationXml(
  article: LanguageArticle,
  translation: LanguageTranslation,
  opts: TranslationExportOptions = {},
): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    cdataPropName: "__cdata",
    format: true,
  });
  return builder.build({
    article: {
      source: {
        sourceUrl: article.sourceUrl ?? "",
        canonicalUrl: article.canonicalUrl ?? "",
        articleId: article.sourceArticleId ?? article.id,
        author: article.author ?? "",
        imageUrl: article.imageUrl ?? "",
        imageLibraryRel: article.imageLibraryRel ?? "",
        translatedImageLibraryRel: opts.imageLibraryRel ?? "",
        publishDate: article.publishDate ?? "",
        modifiedDate: article.modifiedDate ?? "",
        category: article.category ?? "",
        tags: { tag: article.tags },
        socialEmbeds: {
          embed: (article.socialEmbeds ?? []).map((embed) => ({
            id: embed.id,
            provider: embed.provider,
            marker: embed.marker,
            url: embed.url ?? "",
            originalText: { __cdata: embed.originalText },
            translatedText: { __cdata: translation.socialEmbeds?.find((row) => row.id === embed.id)?.translatedText ?? embed.translatedText ?? "" },
            author: embed.author ?? "",
            handle: embed.handle ?? "",
            publishedAt: embed.publishedAt ?? "",
          })),
        },
      },
      translation: {
        targetLanguage: translation.targetLanguage,
        approvalStatus: translation.status,
        title: { __cdata: translation.title },
        standfirst: { __cdata: translation.standfirst },
        body: { __cdata: translation.body },
        seoTitle: { __cdata: translation.seoTitle },
        metaDescription: { __cdata: translation.metaDescription },
        slug: translation.slug,
        tags: { tag: translation.tags },
      },
    },
  });
}

export function buildTranslationJson(
  article: LanguageArticle,
  translation: LanguageTranslation,
  opts: TranslationExportOptions = {},
): string {
  return JSON.stringify(
    {
      sourceUrl: article.sourceUrl,
      canonicalUrl: article.canonicalUrl,
      articleId: article.sourceArticleId ?? article.id,
      author: article.author,
      publishDate: article.publishDate,
      modifiedDate: article.modifiedDate,
      category: article.category,
      sourceTags: article.tags,
      imageUrl: article.imageUrl,
      imageLibraryRel: article.imageLibraryRel,
      translatedImageLibraryRel: opts.imageLibraryRel,
      targetLanguage: translation.targetLanguage,
      approvalStatus: translation.status,
      title: translation.title,
      standfirst: translation.standfirst,
      body: translation.body,
      seoTitle: translation.seoTitle,
      metaDescription: translation.metaDescription,
      slug: translation.slug,
      tags: translation.tags,
      socialEmbeds: (article.socialEmbeds ?? []).map((embed) => ({
        ...embed,
        translatedText: translation.socialEmbeds?.find((row) => row.id === embed.id)?.translatedText ?? embed.translatedText,
      })),
    },
    null,
    2,
  );
}
