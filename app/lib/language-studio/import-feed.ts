import { enrichLanguageArticlesFromPages, extractSocialEmbedsFromBody } from "@/app/lib/language-studio/article-pages";
import { saveLanguageArticleImagesToLibrary } from "@/app/lib/language-studio/library-images";
import {
  newLanguageId,
  readLanguageStudioData,
  writeLanguageStudioData,
} from "@/app/lib/language-studio/store";
import { parseLanguageXmlFeed } from "@/app/lib/language-studio/xml";
import { decodeHtmlEntities } from "@/app/lib/html-entities";
import { sanitizeImportedContent } from "@/app/lib/language-studio/sanitize";
import type { LanguageArticle, LanguageCode, LanguageImport, LanguageJournalistProfile, LanguageSourceParserType } from "@/app/lib/language-studio/types";

export const DEFAULT_LANGUAGE_FEED_URL = "https://www.planetf1.com/partner-media-content-feed";

export type ImportLanguageFeedInput = {
  sourceBrand?: string;
  sourceLanguage?: LanguageCode;
  sourceUrl?: string;
  xml?: string;
  processImages?: boolean;
  importFullArticles?: boolean;
  parserType?: LanguageSourceParserType;
};

export type ImportLanguageFeedResult = {
  import: LanguageImport;
  articles: LanguageArticle[];
  journalistProfiles: LanguageJournalistProfile[];
  createdCount: number;
  updatedCount: number;
  createdArticleIds: string[];
  updatedArticleIds: string[];
  imageCount: number;
};

export function extractXmlPayload(input: string): string {
  const start = input.indexOf("<?xml");
  if (start >= 0) return input.slice(start).trim();
  const rssStart = input.indexOf("<rss");
  if (rssStart >= 0) return input.slice(rssStart).trim();
  const feedStart = input.indexOf("<feed");
  if (feedStart >= 0) return input.slice(feedStart).trim();
  return input.trim();
}

function normaliseArticleUrl(value?: string): string {
  if (!value?.trim()) return "";
  try {
    const url = new URL(value.trim());
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
  }
}

function articleKeys(article: Pick<LanguageArticle, "sourceBrand" | "sourceArticleId" | "canonicalUrl" | "title" | "publishDate">): string[] {
  const brand = article.sourceBrand.trim().toLowerCase();
  const keys = new Set<string>();
  const sourceId = article.sourceArticleId?.trim();
  const canonical = normaliseArticleUrl(article.canonicalUrl);
  if (canonical) keys.add(`${brand}::url::${canonical}`);
  if (sourceId && !/^limport-/i.test(sourceId)) keys.add(`${brand}::id::${sourceId.toLowerCase()}`);
  if (article.title?.trim()) keys.add(`${brand}::title::${article.title.trim().toLowerCase()}::${article.publishDate?.trim().toLowerCase() ?? ""}`);
  return [...keys];
}

function articlePrimaryKey(article: Pick<LanguageArticle, "sourceBrand" | "sourceArticleId" | "canonicalUrl" | "title" | "publishDate">): string {
  return articleKeys(article)[0] ?? `${article.sourceBrand.trim().toLowerCase()}::unknown::${article.title.trim().toLowerCase()}`;
}

function journalistKey(brand: string, name: string): string {
  return `${brand.trim().toLowerCase()}::${name.trim().toLowerCase()}`;
}

function inferSports(brand: string, articles: LanguageArticle[]): string[] {
  const sports = new Set<string>();
  if (/f1|formula/i.test(brand)) sports.add("Formula 1");
  if (/football|365/i.test(brand)) sports.add("Football");
  for (const article of articles) {
    if (article.category) sports.add(article.category);
    for (const tag of article.tags.slice(0, 4)) sports.add(tag);
  }
  return [...sports].slice(0, 8);
}

function sentenceStats(text: string): { avgWords: number; paragraphCount: number; hasQuotes: boolean } {
  const sentences = text.split(/[.!?]+/).map((row) => row.trim()).filter((row) => row.split(/\s+/).length > 3);
  const words = sentences.flatMap((row) => row.split(/\s+/).filter(Boolean));
  return {
    avgWords: sentences.length ? Math.round(words.length / sentences.length) : 0,
    paragraphCount: text.split(/\n{2,}|\n/).map((row) => row.trim()).filter(Boolean).length,
    hasQuotes: /["“”']/.test(text),
  };
}

function buildJournalistStyleNotes(name: string, brand: string, samples: LanguageArticle[]): string {
  const titles = samples.map((article) => article.title).filter(Boolean);
  const bodies = samples.map((article) => article.body).filter(Boolean);
  const stats = sentenceStats(bodies.join("\n\n"));
  const quoted = samples.filter((article) => /["“”']/.test(`${article.title} ${article.body}`)).length;
  const questionTitles = titles.filter((title) => title.includes("?")).length;
  const explainerTitles = titles.filter((title) => /\b(explains?|why|how|reveals?|warns?|claims?|verdict|analysis)\b/i.test(title)).length;
  const listTitles = titles.filter((title) => /\b\d+\b/.test(title)).length;
  const titleSignals = [
    questionTitles ? "uses question-led headlines when the angle needs tension" : "",
    explainerTitles ? "leans into explainers, warnings, claims and analysis-led angles" : "",
    listTitles ? "uses numbered/detail-led hooks when useful" : "",
  ].filter(Boolean);

  return [
    `Built from ${samples.length} imported ${brand} article${samples.length === 1 ? "" : "s"} by ${name}.`,
    `Observed structure: ${stats.paragraphCount > samples.length * 10 ? "short, frequent paragraphs" : "moderate paragraphing"} with ${stats.avgWords ? `around ${stats.avgWords} words per sentence on average` : "a concise sentence style"}.`,
    `Tone: factual sports news voice, direct intro, clear attribution and reader-friendly context. Avoid hype unless the source facts justify it.`,
    quoted ? `Quote handling: quote-heavy profile (${quoted}/${samples.length} samples include quotes); preserve quote boundaries and attribution.` : "Quote handling: preserve quote boundaries and attribution where present.",
    titleSignals.length ? `Headline habits: ${titleSignals.join("; ")}.` : "Headline habits: clear subject-led headlines with the main news angle upfront.",
    titles.slice(0, 5).length ? `Example headline patterns: ${titles.slice(0, 5).join(" | ")}` : "",
  ].filter(Boolean).join("\n");
}

function buildJournalistGuidelines(name: string): string {
  return [
    `Use ${name}'s observed profile as a style guide for structure, pace and tone only.`,
    "Do not copy phrases from sample articles unless they are proper nouns or unavoidable factual wording.",
    "Preserve all facts, names, numbers, dates, results and direct quotes.",
    "For rewrites, create fresh paragraph order and original phrasing while keeping the source meaning intact.",
  ].join("\n");
}

async function fetchXml(sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl, {
    cache: "no-store",
    headers: { "user-agent": "PlanetSportStudio Language Studio/1.0", accept: "application/rss+xml,application/xml,text/xml,*/*" },
  });
  if (!res.ok) throw new Error(`Could not fetch XML feed (${res.status}).`);
  return extractXmlPayload(await res.text());
}

async function fetchHtml(sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl, {
    cache: "no-store",
    headers: { "user-agent": "PlanetSportStudio Language Studio/1.0", accept: "text/html,application/xhtml+xml,*/*" },
  });
  if (!res.ok) throw new Error(`Could not fetch HTML page (${res.status}).`);
  return res.text();
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

function htmlTitle(html: string, fallback: string): string {
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

function extractHtmlPageArticles(html: string, opts: { importId: string; sourceBrand: string; sourceLanguage: LanguageCode; sourceUrl: string }): { feedTitle: string; articles: LanguageArticle[] } {
  const now = new Date().toISOString();
  const source = new URL(opts.sourceUrl);
  const linkMatches = [...html.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)];
  const candidates = new Map<string, string>();
  for (const match of linkMatches) {
    const href = absoluteUrl(match[2], opts.sourceUrl);
    if (!href) continue;
    const url = new URL(href);
    if (url.hostname.replace(/^www\./, "") !== source.hostname.replace(/^www\./, "")) continue;
    if (!url.pathname.toLowerCase().includes("news")) continue;
    const title = textFromHtml(match[3]).replace(/\s+/g, " ").trim();
    if (title.length < 12 || /^(news|more|read more|latest)$/i.test(title)) continue;
    if (!candidates.has(href)) candidates.set(href, title);
    if (candidates.size >= 25) break;
  }

  const links = [...candidates.entries()];
  const feedTitle = htmlTitle(html, opts.sourceBrand);
  const baseArticles = links.length
    ? links.map(([canonicalUrl, title], index) => ({ canonicalUrl, title, index }))
    : [{ canonicalUrl: opts.sourceUrl, title: feedTitle, index: 0 }];

  return {
    feedTitle,
    articles: baseArticles.map(({ canonicalUrl, title, index }) => {
      const description = firstHtmlMeta(html, ["description", "og:description"]);
      const body = links.length ? description || title : textFromHtml(html);
      const article: LanguageArticle = {
        id: newLanguageId("larticle"),
        importId: opts.importId,
        sourceBrand: opts.sourceBrand,
        sourceLanguage: opts.sourceLanguage,
        sourceUrl: opts.sourceUrl,
        canonicalUrl,
        sourceArticleId: `${opts.importId}-${index + 1}`,
        author: opts.sourceBrand,
        publishDate: "",
        modifiedDate: "",
        category: "",
        tags: [],
        imageUrl: firstHtmlMeta(html, ["og:image", "twitter:image"]),
        title,
        standfirst: description,
        body: sanitizeImportedContent(body),
        socialEmbeds: [],
        seoTitle: title,
        metaDescription: description.slice(0, 180),
        slug: title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 90),
        status: "imported",
        createdAt: now,
        updatedAt: now,
      };
      return article;
    }),
  };
}

export async function importLanguageFeed(input: ImportLanguageFeedInput): Promise<ImportLanguageFeedResult> {
  const sourceBrand = input.sourceBrand?.trim() || "PlanetF1";
  const sourceLanguage = input.sourceLanguage || "en";
  const sourceUrl = input.sourceUrl?.trim();
  let xml = extractXmlPayload(input.xml?.trim() || "");
  if (!xml && sourceUrl && input.parserType !== "html-page") xml = await fetchXml(sourceUrl);
  if (!xml && input.parserType !== "html-page") throw new Error("XML content or sourceUrl is required.");

  const importId = newLanguageId("limport");
  const parsed = input.parserType === "html-page" && sourceUrl
    ? extractHtmlPageArticles(await fetchHtml(sourceUrl), { importId, sourceBrand, sourceLanguage, sourceUrl })
    : parseLanguageXmlFeed(xml, { importId, sourceBrand, sourceLanguage, sourceUrl });
  const fullArticles = input.importFullArticles === false
    ? parsed.articles
    : await enrichLanguageArticlesFromPages(parsed.articles);
  const articlesWithSocialEmbeds = fullArticles.map((article) => {
    if (article.socialEmbeds?.length) return article;
    const social = extractSocialEmbedsFromBody(article.body);
    return social.socialEmbeds.length
      ? { ...article, body: social.body, socialEmbeds: social.socialEmbeds, updatedAt: new Date().toISOString() }
      : article;
  });

  const existing = await readLanguageStudioData();
  const existingByKey = new Map<string, LanguageArticle>();
  const existingImageByUrl = new Map<string, string>();
  for (const article of Object.values(existing.articles)) {
    for (const key of articleKeys(article)) existingByKey.set(key, article);
    const imageUrl = article.imageUrl?.trim();
    if (imageUrl && article.imageLibraryRel) existingImageByUrl.set(imageUrl, article.imageLibraryRel);
  }
  const existingJournalists = new Map<string, string>();
  for (const profile of Object.values(existing.journalistProfiles)) {
    existingJournalists.set(journalistKey(profile.brand, profile.name), profile.id);
  }

  let createdCount = 0;
  let updatedCount = 0;
  const createdArticleIds: string[] = [];
  const updatedArticleIds: string[] = [];
  const now = new Date().toISOString();
  const incomingByKey = new Map<string, LanguageArticle>();
  for (const article of articlesWithSocialEmbeds) {
    incomingByKey.set(articlePrimaryKey(article), article);
  }
  const matchedArticles = [...incomingByKey.values()].map((article) => {
    const match = articleKeys(article).map((key) => existingByKey.get(key)).find(Boolean);
    if (!match) {
      createdCount += 1;
      createdArticleIds.push(article.id);
      return {
        ...article,
        imageLibraryRel: article.imageUrl ? existingImageByUrl.get(article.imageUrl.trim()) ?? article.imageLibraryRel : article.imageLibraryRel,
      };
    }
    updatedCount += 1;
    updatedArticleIds.push(match.id);
    return {
      ...match,
      ...article,
      id: match.id,
      createdAt: match.createdAt,
      status: match.status,
      imageLibraryRel: match.imageUrl === article.imageUrl && match.imageLibraryRel ? match.imageLibraryRel : article.imageLibraryRel,
      updatedAt: now,
    };
  });
  const articles = input.processImages === false
    ? matchedArticles
    : await saveLanguageArticleImagesToLibrary(matchedArticles);

  const row: LanguageImport = {
    id: importId,
    sourceBrand,
    sourceLanguage,
    sourceUrl,
    title: parsed.feedTitle,
    articleIds: articles.map((article) => article.id),
    createdAt: now,
  };
  existing.imports[row.id] = row;
  for (const article of articles) existing.articles[article.id] = article;
  const updatedJournalistProfiles = new Map<string, LanguageJournalistProfile>();
  for (const article of articles) {
    const author = article.author?.trim();
    if (!author) continue;
    const key = journalistKey(article.sourceBrand, author);
    const samples = [...Object.values(existing.articles), ...articles]
      .filter((row) => row.author?.trim().toLowerCase() === author.toLowerCase() && row.sourceBrand === article.sourceBrand)
      .filter((row, index, rows) => rows.findIndex((candidate) => candidate.id === row.id) === index)
      .slice(0, 20);
    const existingId = existingJournalists.get(key);
    if (existingId) {
      const profile = existing.journalistProfiles[existingId];
      if (profile && !profile.sampleArticleIds.includes(article.id)) {
        profile.sampleArticleIds = [article.id, ...profile.sampleArticleIds].slice(0, 12);
        profile.exampleTitles = [article.title, ...profile.exampleTitles.filter((title) => title !== article.title)].slice(0, 8);
      }
      if (profile) {
        profile.sports = inferSports(article.sourceBrand, samples);
        if (profile.source === "imported" || profile.styleNotes.startsWith("Imported author profile.")) {
          profile.styleNotes = buildJournalistStyleNotes(author, article.sourceBrand, samples);
          profile.articleGuidelines = buildJournalistGuidelines(author);
        }
        profile.updatedAt = now;
        updatedJournalistProfiles.set(profile.id, profile);
      }
      continue;
    }
    const profileId = newLanguageId("ljournalist");
    existingJournalists.set(key, profileId);
    const profile: LanguageJournalistProfile = {
      id: profileId,
      name: author,
      brand: article.sourceBrand,
      sports: inferSports(article.sourceBrand, samples),
      styleNotes: buildJournalistStyleNotes(author, article.sourceBrand, samples),
      articleGuidelines: buildJournalistGuidelines(author),
      exampleTitles: article.title ? [article.title] : [],
      sampleArticleIds: [article.id],
      source: "imported",
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    existing.journalistProfiles[profileId] = profile;
    updatedJournalistProfiles.set(profile.id, profile);
  }
  const auditId = newLanguageId("laudit");
  existing.auditLogs[auditId] = {
    id: auditId,
    createdAt: now,
    entityType: "language_import",
    entityId: importId,
    action: input.sourceUrl === DEFAULT_LANGUAGE_FEED_URL ? "cron_import_feed" : "import_xml",
    detail: `${articles.length} article(s) checked from ${sourceBrand}; ${createdCount} new; ${updatedCount} updated; ${articles.filter((article) => article.imageLibraryRel).length} image(s) saved to Library`,
  };
  await writeLanguageStudioData(existing);

  return {
    import: row,
    articles,
    journalistProfiles: [...updatedJournalistProfiles.values()],
    createdCount,
    updatedCount,
    createdArticleIds,
    updatedArticleIds,
    imageCount: articles.filter((article) => article.imageLibraryRel).length,
  };
}
