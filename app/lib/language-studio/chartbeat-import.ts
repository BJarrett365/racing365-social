import { parseCsv } from "@/app/lib/data-feed-csv";
import {
  journalistIdentityKey,
  normalizeAuthorIdentity,
} from "@/app/lib/language-studio/author-identity";
import { recomputeJournalistStats } from "@/app/lib/language-studio/journalist-stats";
import { newLanguageId } from "@/app/lib/language-studio/store";
import type {
  ChartbeatImport,
  ChartbeatPageStat,
  LanguageArticle,
  LanguageJournalistProfile,
  LanguageStudioData,
} from "@/app/lib/language-studio/types";

export type ChartbeatCsvRow = {
  title: string;
  totalEngagedMin: number;
  pageViews: number;
  avgEngagedMin: number;
  author: string;
  path: string;
  host: string;
  publishDate: string;
  qualityPageViews: number;
  uniques: number;
  wordcount: number;
  recirculation: number;
};

export type ChartbeatImportResult = {
  import: ChartbeatImport;
  matchedArticles: number;
  unmatchedRows: number;
  profileUpdates: number;
  pageStats: ChartbeatPageStat[];
  leaderboard: Array<{ profileId: string; name: string; score: number; pageViews: number }>;
  unmatched: ChartbeatCsvRow[];
};

const HOST_TO_BRAND: Record<string, string> = {
  "football365.com": "Football365",
  "www.football365.com": "Football365",
  "teamtalk.com": "TEAMtalk",
  "www.teamtalk.com": "TEAMtalk",
  "planetf1.com": "PlanetF1",
  "www.planetf1.com": "PlanetF1",
};

function parseNum(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const n = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function normalisePath(path: string): string {
  const trimmed = path.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed.replace(/\/$/, "") : `/${trimmed.replace(/\/$/, "")}`;
}

function normaliseArticleUrl(url?: string): string {
  if (!url?.trim()) return "";
  try {
    const parsed = new URL(url.trim());
    parsed.hostname = parsed.hostname.replace(/^www\./i, "");
    parsed.hash = "";
    parsed.search = "";
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
  }
}

function hostToBrand(host: string, fallbackBrand: string): string {
  const key = host.trim().toLowerCase().replace(/^www\./, "");
  return HOST_TO_BRAND[key] ?? HOST_TO_BRAND[host.trim().toLowerCase()] ?? fallbackBrand;
}

export function parseChartbeatCsv(text: string): ChartbeatCsvRow[] {
  const rows = parseCsv(text.trim().replace(/^\uFEFF/, ""));
  if (rows.length < 2) return [];
  const header = rows[0]!.map((cell) => cell.trim().toLowerCase());
  const index = (name: string) => header.indexOf(name);

  const out: ChartbeatCsvRow[] = [];
  for (const row of rows.slice(1)) {
    if (!row.some((cell) => cell.trim())) continue;
    out.push({
      title: row[index("title")] ?? "",
      totalEngagedMin: parseNum(row[index("total_engaged_min")]),
      pageViews: parseNum(row[index("page_views")]),
      avgEngagedMin: parseNum(row[index("avg_engaged_min")]),
      author: row[index("author")] ?? "",
      path: row[index("path")] ?? "",
      host: row[index("host")] ?? "",
      publishDate: row[index("publish_date")] ?? "",
      qualityPageViews: parseNum(row[index("quality_page_views")]),
      uniques: parseNum(row[index("uniques")]),
      wordcount: parseNum(row[index("wordcount")]),
      recirculation: parseNum(row[index("recirculation")]),
    });
  }
  return out;
}

function computeRowWeight(row: ChartbeatCsvRow, max: { pageViews: number; engaged: number; quality: number }): number {
  const pv = max.pageViews > 0 ? row.pageViews / max.pageViews : 0;
  const em = max.engaged > 0 ? row.totalEngagedMin / max.engaged : 0;
  const qv = max.quality > 0 ? row.qualityPageViews / max.quality : 0;
  return Math.round((pv * 0.45 + em * 0.35 + qv * 0.2) * 100);
}

function findArticleForRow(
  articles: LanguageArticle[],
  brand: string,
  row: ChartbeatCsvRow,
): LanguageArticle | undefined {
  const pathKey = normalisePath(row.path);
  const hostPath = normaliseArticleUrl(`https://${row.host.replace(/^www\./i, "")}${pathKey}`);
  for (const article of articles) {
    if (article.sourceBrand !== brand) continue;
    const canonical = normaliseArticleUrl(article.canonicalUrl);
    if (canonical && (canonical.endsWith(pathKey) || canonical.includes(hostPath))) return article;
  }
  const titleKey = row.title.trim().toLowerCase();
  if (titleKey) {
    const fuzzy = articles.find(
      (article) => article.sourceBrand === brand && article.title.trim().toLowerCase() === titleKey,
    );
    if (fuzzy) return fuzzy;
  }
  return undefined;
}

function findProfileForAuthor(
  profiles: LanguageJournalistProfile[],
  brand: string,
  authorRaw: string,
): LanguageJournalistProfile | undefined {
  const identity = normalizeAuthorIdentity(authorRaw, brand);
  if (!identity) return undefined;
  const key = journalistIdentityKey(brand, identity);
  return profiles.find((profile) => {
    if (profile.brand !== brand) return false;
    const pid = normalizeAuthorIdentity(profile.name, profile.brand);
    return pid ? journalistIdentityKey(profile.brand, pid) === key : false;
  });
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function importChartbeatCsv(
  data: LanguageStudioData,
  input: { csvText: string; brand: string; label?: string },
): ChartbeatImportResult {
  const brand = input.brand.trim();
  const rows = parseChartbeatCsv(input.csvText).filter((row) => hostToBrand(row.host, brand) === brand);
  const now = new Date().toISOString();
  const importId = newLanguageId("lchartbeat");
  const articles = Object.values(data.articles);
  const profiles = Object.values(data.journalistProfiles);

  const max = {
    pageViews: Math.max(1, ...rows.map((row) => row.pageViews)),
    engaged: Math.max(1, ...rows.map((row) => row.totalEngagedMin)),
    quality: Math.max(1, ...rows.map((row) => row.qualityPageViews)),
  };

  if (!data.chartbeatImports) data.chartbeatImports = {};
  if (!data.chartbeatPageStats) data.chartbeatPageStats = {};

  const pageStats: ChartbeatPageStat[] = [];
  const unmatched: ChartbeatCsvRow[] = [];
  const profileAgg = new Map<
    string,
    { pageViews: number; engaged: number; quality: number; weights: number[]; articleIds: string[] }
  >();

  let matchedArticles = 0;
  for (const row of rows) {
    const weight = computeRowWeight(row, max);
    const article = findArticleForRow(articles, brand, row);
    const profile = findProfileForAuthor(profiles, brand, row.author);
    const stat: ChartbeatPageStat = {
      id: newLanguageId("lcbpage"),
      importId,
      brand,
      title: row.title,
      path: row.path,
      host: row.host,
      author: row.author,
      pageViews: row.pageViews,
      totalEngagedMin: row.totalEngagedMin,
      qualityPageViews: row.qualityPageViews,
      performanceWeight: weight,
      articleId: article?.id,
      journalistProfileId: profile?.id,
      createdAt: now,
    };
    pageStats.push(stat);
    data.chartbeatPageStats[stat.id] = stat;

    if (article) matchedArticles += 1;
    else unmatched.push(row);

    if (profile) {
      const bucket = profileAgg.get(profile.id) ?? { pageViews: 0, engaged: 0, quality: 0, weights: [], articleIds: [] };
      bucket.pageViews += row.pageViews;
      bucket.engaged += row.totalEngagedMin;
      bucket.quality += row.qualityPageViews;
      bucket.weights.push(weight);
      if (article?.id) bucket.articleIds.push(article.id);
      profileAgg.set(profile.id, bucket);
    }
  }

  let profileUpdates = 0;
  const leaderboard: ChartbeatImportResult["leaderboard"] = [];
  for (const [profileId, agg] of profileAgg) {
    const profile = data.journalistProfiles[profileId];
    if (!profile) continue;
    const performanceScore =
      agg.weights.length > 0
        ? Math.round(agg.weights.reduce((sum, value) => sum + value, 0) / agg.weights.length)
        : undefined;
    profile.stats = {
      importedArticleCount: profile.stats?.importedArticleCount ?? 0,
      exportedArticleCount: profile.stats?.exportedArticleCount ?? 0,
      socialPostCount: profile.stats?.socialPostCount ?? 0,
      ...profile.stats,
      performanceScore,
      totalPageViews: (profile.stats?.totalPageViews ?? 0) + agg.pageViews,
      totalEngagedMinutes: (profile.stats?.totalEngagedMinutes ?? 0) + agg.engaged,
      lastPerformanceImportAt: now,
    };
    profile.sampleArticleIds = uniqueStrings([...agg.articleIds, ...profile.sampleArticleIds]).slice(0, 20);
    profile.updatedAt = now;
    recomputeJournalistStats(data, profileId);
    profileUpdates += 1;
    leaderboard.push({
      profileId,
      name: profile.name,
      score: performanceScore ?? 0,
      pageViews: agg.pageViews,
    });
  }

  leaderboard.sort((a, b) => b.score - a.score || b.pageViews - a.pageViews);

  const importRow: ChartbeatImport = {
    id: importId,
    brand,
    label: input.label?.trim() || `Chartbeat ${brand} ${now.slice(0, 10)}`,
    rowCount: rows.length,
    matchedArticleCount: matchedArticles,
    unmatchedRowCount: unmatched.length,
    profileUpdateCount: profileUpdates,
    createdAt: now,
  };
  data.chartbeatImports[importId] = importRow;

  return {
    import: importRow,
    matchedArticles,
    unmatchedRows: unmatched.length,
    profileUpdates,
    pageStats,
    leaderboard,
    unmatched: unmatched.slice(0, 50),
  };
}
