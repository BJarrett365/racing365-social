import {
  LANGUAGE_CONTENT_STYLES,
  type LanguageArticle,
  type LanguageContentStyle,
  type LanguageSourceBrand,
  type LanguageSportContext,
} from "@/app/lib/language-studio/types";
import { inferArticleSport } from "@/app/lib/language-studio/article-sport";

function textBlob(article: Pick<LanguageArticle, "category" | "tags" | "title" | "canonicalUrl" | "sourceUrl" | "sourceBrand">): string {
  return [
    article.category,
    ...(article.tags ?? []),
    article.title,
    article.canonicalUrl,
    article.sourceUrl,
    article.sourceBrand,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function contentStyleFromArticle(article?: Pick<LanguageArticle, "category" | "tags" | "title" | "canonicalUrl" | "sourceUrl" | "sourceBrand" | "sport"> | null): LanguageContentStyle {
  if (!article) return "News";
  const exact = article.category?.trim();
  if (exact && (LANGUAGE_CONTENT_STYLES as readonly string[]).includes(exact)) {
    return exact as LanguageContentStyle;
  }
  const hay = textBlob(article);
  if (/\b(16 conclusions|conclusions)\b/.test(hay)) return "16 Conclusions";
  if (/\b(match report|full time|player ratings|ratings|result|reaction)\b/.test(hay)) return "Match report";
  if (/\b(racecard|race card|preview|declarations|runners|runner|entries|card)\b/.test(hay)) return "Preview";
  if (/\b(tips?|nap|nb|best bets?|picks?|odds|betting)\b/.test(hay)) return "Tips";
  if (/\b(analysis|verdict|explained|explains|why|how|tactical)\b/.test(hay)) return "Analysis";
  if (/\b(opinion|column|view)\b/.test(hay)) return "Opinion";
  if (/\b(transfer|rumour|rumor|deal|window)\b/.test(hay)) return "Transfer";
  if (/\b(feature|interview|exclusive)\b/.test(hay)) return "Feature";
  if (/\b(live|updates)\b/.test(hay)) return "Live";
  return "News";
}

export function sourceBrandDefaultSport(
  sourceBrand: string,
  sourceBrands: Array<Pick<LanguageSourceBrand, "name" | "defaultSport">> = [],
): LanguageSportContext | undefined {
  const configured = sourceBrands.find((row) => row.name.trim().toLowerCase() === sourceBrand.trim().toLowerCase())?.defaultSport;
  if (configured) return configured;
  return inferArticleSport({
    sourceBrand,
    title: "",
    tags: [],
  });
}

export function sportContextFromArticle(
  article?: Pick<LanguageArticle, "sourceBrand" | "canonicalUrl" | "sourceUrl" | "category" | "tags" | "title" | "sport"> | null,
  sourceBrands: Array<Pick<LanguageSourceBrand, "name" | "defaultSport">> = [],
): LanguageSportContext {
  if (!article) return "Formula 1";
  return (
    article.sport ||
    inferArticleSport({
      sourceBrand: article.sourceBrand,
      canonicalUrl: article.canonicalUrl,
      sourceUrl: article.sourceUrl,
      category: article.category,
      tags: article.tags ?? [],
      title: article.title,
      defaultSport: sourceBrandDefaultSport(article.sourceBrand, sourceBrands),
    }) ||
    "Formula 1"
  );
}
