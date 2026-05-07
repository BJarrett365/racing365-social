import crypto from "crypto";
import { XMLBuilder } from "fast-xml-parser";
import { LANGUAGE_LABELS, type LanguageArticle, type LanguageClient, type LanguageClientApiKey, type LanguageStudioData, type LanguageTranslation } from "@/app/lib/language-studio/types";

export type ClientFeedFormat = "xml" | "json";

export type ClientFeedAuth = {
  client: LanguageClient;
  apiKey: LanguageClientApiKey;
};

export function generateClientApiKey(): string {
  return `plexa_ls_${crypto.randomBytes(24).toString("base64url")}`;
}

export function hashClientApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function keyPrefix(rawKey: string): string {
  return rawKey.slice(0, 14);
}

function allowed<T extends string>(allowedValues: T[], value: T): boolean {
  return allowedValues.length === 0 || allowedValues.includes(value);
}

export function maskedApiKey(key: LanguageClientApiKey): Omit<LanguageClientApiKey, "keyHash"> & { maskedKey: string } {
  const safe: Omit<LanguageClientApiKey, "keyHash"> = {
    id: key.id,
    clientId: key.clientId,
    label: key.label,
    keyPrefix: key.keyPrefix,
    active: key.active,
    allowedBrands: key.allowedBrands,
    allowedLanguages: key.allowedLanguages,
    allowedFormats: key.allowedFormats,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
  };
  return {
    ...safe,
    maskedKey: `${key.keyPrefix}...`,
  };
}

export function keyFromRequest(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const url = new URL(req.url);
  return url.searchParams.get("key")?.trim() || "";
}

export function authoriseClientRequest(data: LanguageStudioData, req: Request, format: ClientFeedFormat): ClientFeedAuth | null {
  const rawKey = keyFromRequest(req);
  if (!rawKey) return null;
  const hash = hashClientApiKey(rawKey);
  const apiKey = Object.values(data.clientApiKeys).find((row) => row.keyHash === hash);
  if (!apiKey || !apiKey.active || apiKey.revokedAt) return null;
  const client = data.clients[apiKey.clientId];
  if (!client?.active) return null;
  if (!allowed(client.allowedFormats, format) || !allowed(apiKey.allowedFormats, format)) return null;
  return { client, apiKey };
}

export function approvedTranslationsForClient(
  data: LanguageStudioData,
  auth: ClientFeedAuth,
): Array<{ article: LanguageArticle; translation: LanguageTranslation }> {
  const rows: Array<{ article: LanguageArticle; translation: LanguageTranslation }> = [];
  for (const translation of Object.values(data.translations)) {
    if (translation.status !== "approved") continue;
    const article = data.articles[translation.articleId];
    if (!article) continue;
    if (translation.clientIds?.length && !translation.clientIds.includes(auth.client.id)) continue;
    if (!allowed(auth.client.allowedBrands, article.sourceBrand) || !allowed(auth.apiKey.allowedBrands, article.sourceBrand)) continue;
    if (!allowed(auth.client.allowedLanguages, translation.targetLanguage) || !allowed(auth.apiKey.allowedLanguages, translation.targetLanguage)) continue;
    rows.push({ article, translation });
  }
  return rows.sort((a, b) => {
    const at = Date.parse(a.article.publishDate || a.translation.approvedAt || a.translation.updatedAt || "");
    const bt = Date.parse(b.article.publishDate || b.translation.approvedAt || b.translation.updatedAt || "");
    if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return bt - at;
    return b.translation.updatedAt.localeCompare(a.translation.updatedAt);
  });
}

export function publicTranslationRow(article: LanguageArticle, translation: LanguageTranslation) {
  return {
    id: translation.id,
    sourceArticleId: article.sourceArticleId ?? article.id,
    sourceBrand: article.sourceBrand,
    sourceUrl: article.sourceUrl,
    clientIds: translation.clientIds ?? [],
    canonicalUrl: article.canonicalUrl,
    author: article.author,
    publishDate: article.publishDate,
    modifiedDate: article.modifiedDate,
    originalImageUrl: article.imageUrl,
    imageLibraryRel: article.imageLibraryRel,
    targetLanguage: translation.targetLanguage,
    targetLanguageLabel: LANGUAGE_LABELS[translation.targetLanguage],
    title: translation.title,
    standfirst: translation.standfirst,
    body: translation.body,
    socialEmbeds: (article.socialEmbeds ?? []).map((embed) => ({
      ...embed,
      translatedText: translation.socialEmbeds?.find((row) => row.id === embed.id)?.translatedText ?? embed.translatedText,
    })),
    seoTitle: translation.seoTitle,
    metaDescription: translation.metaDescription,
    tags: translation.tags,
    slug: translation.slug,
    approvedAt: translation.approvedAt,
    updatedAt: translation.updatedAt,
  };
}

export function buildClientFeedJson(rows: Array<{ article: LanguageArticle; translation: LanguageTranslation }>): string {
  return JSON.stringify({ items: rows.map((row) => publicTranslationRow(row.article, row.translation)) }, null, 2);
}

export function buildClientFeedXml(rows: Array<{ article: LanguageArticle; translation: LanguageTranslation }>): string {
  const builder = new XMLBuilder({ ignoreAttributes: false, cdataPropName: "__cdata", format: true });
  return builder.build({
    feed: {
      title: "Planet Sport Studio Language Studio client feed",
      generatedAt: new Date().toISOString(),
      item: rows.map(({ article, translation }) => ({
        id: translation.id,
        sourceArticleId: article.sourceArticleId ?? article.id,
        clientIds: { clientId: translation.clientIds ?? [] },
        sourceBrand: article.sourceBrand,
        canonicalUrl: article.canonicalUrl ?? "",
        author: article.author ?? "",
        publishDate: article.publishDate ?? "",
        modifiedDate: article.modifiedDate ?? "",
        imageUrl: article.imageUrl ?? "",
        imageLibraryRel: article.imageLibraryRel ?? "",
        targetLanguage: translation.targetLanguage,
        title: { __cdata: translation.title },
        standfirst: { __cdata: translation.standfirst },
        body: { __cdata: translation.body },
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
        seoTitle: { __cdata: translation.seoTitle },
        metaDescription: { __cdata: translation.metaDescription },
        slug: translation.slug,
        tags: { tag: translation.tags },
        approvedAt: translation.approvedAt ?? "",
        updatedAt: translation.updatedAt,
      })),
    },
  });
}
