import { LANGUAGE_SPORT_CONTEXTS, type LanguageSportContext } from "@/app/lib/language-studio/types";

export type ArticleSportInferenceInput = {
  sourceBrand: string;
  canonicalUrl?: string;
  sourceUrl?: string;
  category?: string;
  tags: string[];
  title: string;
  defaultSport?: LanguageSportContext;
};

const URL_SPORT_HINTS: Array<{ sport: LanguageSportContext; re: RegExp }> = [
  { sport: "Horse Racing", re: /\/(horse-racing|horse_racing|racecards?|cheltenham|royal-ascot|grand-national)\b/i },
  { sport: "Tennis", re: /\/tennis\b/i },
  { sport: "Formula 1", re: /\/(formula-?1|\bf1\b)\b/i },
  { sport: "Football", re: /\/(football|premier-league|champions-league|epl|soccer)\b/i },
  { sport: "Golf", re: /\/golf\b/i },
  { sport: "Cricket", re: /\/cricket\b/i },
  { sport: "Rugby Union", re: /\/(rugby-union|rugby)\b/i },
  { sport: "Rugby League", re: /\/rugby-league\b/i },
  { sport: "Boxing", re: /\/boxing\b/i },
  { sport: "MMA", re: /\/(mma|ufc)\b/i },
  { sport: "NFL", re: /\bnfl\b/i },
  { sport: "Basketball", re: /\/(nba|basketball)\b/i },
  { sport: "Gambling", re: /\/(gambling|betting|odds|bookmakers?)\b/i },
  { sport: "Tips", re: /\/(tips|picks|tipster)\b/i },
];

const BRAND_SPORT_HINTS: Array<{ re: RegExp; sport: LanguageSportContext }> = [
  { re: /planetf1|f1\b/i, sport: "Formula 1" },
  { re: /football365/i, sport: "Football" },
  { re: /(racingpost|attheraces|at the races|sportinglife|oddschecker|racing\s*365)/i, sport: "Horse Racing" },
];

function normaliseTag(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Best-effort sport vertical for an imported article: URL path first, then RSS categories/tags,
 * then the source brand default, then coarse brand-name heuristics.
 */
export function inferArticleSport(input: ArticleSportInferenceInput): LanguageSportContext | undefined {
  const urlBlob = `${input.canonicalUrl ?? ""} ${input.sourceUrl ?? ""} ${input.title ?? ""}`;
  for (const { sport, re } of URL_SPORT_HINTS) {
    if (re.test(urlBlob)) return sport;
  }

  const hay = [input.category, ...input.tags].map((s) => normaliseTag(String(s ?? ""))).filter(Boolean);
  for (const sport of LANGUAGE_SPORT_CONTEXTS) {
    const slug = sport.toLowerCase();
    const compact = slug.replace(/\s+/g, "");
    if (hay.some((t) => t === slug || t.includes(slug) || t.replace(/\s+/g, "") === compact)) {
      return sport;
    }
  }

  if (input.defaultSport) return input.defaultSport;

  const brand = input.sourceBrand.trim();
  for (const { re, sport } of BRAND_SPORT_HINTS) {
    if (re.test(brand)) return sport;
  }

  return undefined;
}
