"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { GovernancePanel } from "@/app/language-studio/GovernancePanels";
import { QualityGuardrailsPanel } from "@/app/language-studio/QualityGuardrailsPanel";
import { stripArticleMetadataLines } from "@/app/lib/language-studio/article-pages";
import { LANGUAGE_LABELS, type LanguageCode, type LanguageContentStyle, type LanguageProviderMode, type LanguageSourceParserType, type LanguageSportContext, type LanguageTranslation as StoredLanguageTranslation, type TranslationMode } from "@/app/lib/language-studio/types";

type SocialEmbed = {
  id: string;
  provider: "x" | "instagram" | "youtube" | "tiktok" | "facebook" | "threads" | "unknown";
  marker: string;
  url?: string;
  originalText: string;
  translatedText?: string;
  author?: string;
  handle?: string;
  publishedAt?: string;
  position: number;
};

type SocialPost = {
  platform: "appAlerts" | "facebook" | "x" | "instagram" | "youtube" | "tiktok" | "whatsapp" | "telegram";
  text: string;
  headline?: string;
  hashtags?: string[];
  callToAction?: string;
};

type Article = {
  id: string;
  sourceBrand: string;
  title: string;
  standfirst: string;
  body: string;
  status: string;
  tags: string[];
  author?: string;
  publishDate?: string;
  modifiedDate?: string;
  imageUrl?: string;
  imageLibraryRel?: string;
  socialEmbeds?: SocialEmbed[];
  createdAt?: string;
  updatedAt?: string;
};

type Translation = {
  id: string;
  articleId: string;
  targetLanguage: LanguageCode;
  title: string;
  standfirst: string;
  body: string;
  seoTitle: string;
  metaDescription: string;
  tags: string[];
  socialEmbeds?: SocialEmbed[];
  socialPosts?: SocialPost[];
  slug: string;
  status: "draft" | "approved" | "rejected";
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
};

type GlossaryEntry = {
  id: string;
  brand: string;
  sourceTerm: string;
  targetLanguage?: LanguageCode | "";
  targetTerm?: string;
  protected: boolean;
};

type Rule = {
  id: string;
  brand: string;
  targetLanguage?: LanguageCode | "";
  title: string;
  rule: string;
};

type ExportRow = {
  id: string;
  translationId: string;
  targetLanguage: LanguageCode;
  format: "xml" | "json";
  payload: string;
  createdAt: string;
};

type ClientRow = {
  id: string;
  name: string;
  contactEmail?: string;
  active: boolean;
  allowedBrands: string[];
  allowedLanguages: LanguageCode[];
  allowedFormats: Array<"xml" | "json">;
  notes?: string;
};

type ClientApiKeyRow = {
  id: string;
  clientId: string;
  label: string;
  maskedKey: string;
  active: boolean;
  allowedBrands: string[];
  allowedLanguages: LanguageCode[];
  allowedFormats: Array<"xml" | "json">;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
};

type ClientAccessLogRow = {
  id: string;
  clientId: string;
  apiKeyId: string;
  format: "xml" | "json";
  status: number;
  detail?: string;
  createdAt: string;
};

type SourceBrandRow = {
  id: string;
  name: string;
  feedUrl: string;
  sourceLanguage: LanguageCode;
  parserType: LanguageSourceParserType;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type JournalistProfileRow = {
  id: string;
  name: string;
  brand: string;
  sports: string[];
  styleNotes: string;
  articleGuidelines?: string;
  exampleTitles: string[];
  sampleArticleIds: string[];
  source: "imported" | "manual";
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const HTML_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: "\"",
  apos: "'",
  lt: "<",
  gt: ">",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201c",
  rdquo: "\u201d",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
};

const primaryTabs = ["Dashboard", "Imports", "Rewrite", "Translations", "Review Queue"] as const;
const secondaryTabs = ["Source Brands", "Journalists", "Guardrails", "Knowledge Files", "Glossary", "Protected Terms", "Market Rules", "Prompt Rules", "Compliance Notes", "Quality Checks", "Export Feeds", "Client Access", "Settings"] as const;
type LanguageStudioTab = (typeof primaryTabs)[number] | (typeof secondaryTabs)[number];
const allLanguageStudioTabs = [...primaryTabs, ...secondaryTabs] as readonly string[];
const inputClass = "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";
const textareaClass = `${inputClass} min-h-28 font-mono text-xs`;
const miniButtonClass = "rounded-md border border-[#1f2d26] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-[#22c55e]/60 hover:text-white";
const dangerMiniButtonClass = "rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-200 hover:border-red-400 hover:text-red-100";
const amberButtonClass = "rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-100 hover:border-amber-300";
const targetOptions = Object.entries(LANGUAGE_LABELS).filter(([code]) => code !== "en") as Array<[LanguageCode, string]>;
const contentStyleOptions: LanguageContentStyle[] = ["News", "Transfer", "Opinion", "Preview", "Review", "Analysis", "Feature", "Live"];
const sportContextOptions: LanguageSportContext[] = ["Football", "Horse Racing", "Rugby Union", "Rugby League", "Formula 1", "Cricket", "Golf", "Tennis", "NFL", "Boxing", "MMA", "Basketball"];
const socialPlatformLabels: Record<SocialPost["platform"], string> = {
  appAlerts: "App Alerts",
  facebook: "Facebook",
  x: "X",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};
const socialPlatformOrder = Object.keys(socialPlatformLabels) as SocialPost["platform"][];
const clientDocs = [
  { slug: "client-access", title: "Client Access Guide", description: "How to create clients, issue keys, revoke access and review logs." },
  { slug: "client-api", title: "Client API Reference", description: "XML and JSON endpoint examples, authentication and payload fields." },
  { slug: "language-studio", title: "Language Studio Admin Guide", description: "Import, translate, review, approve and export workflow." },
  { slug: "install", title: "Plexa Install Guide", description: "Local install, admin setup and generated files." },
  { slug: "environment", title: "Environment Variables", description: "OpenAI, DeepL, cron, admin and runtime settings." },
  { slug: "deployment", title: "Deployment Guide", description: "Production build, Vercel cron and storage notes." },
  { slug: "troubleshooting", title: "Troubleshooting", description: "Common import, image, translation, cron and API issues." },
];

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#0*(\d+);?/g, (_, dec: string) => {
      const n = Number(dec);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
    .replace(/&#x0*([0-9a-f]+);?/gi, (_, hex: string) => {
      const n = Number.parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
    .replace(/&([a-z]+);/gi, (match, entity: string) => HTML_ENTITIES[entity.toLowerCase()] ?? match);
}

function normaliseArticle(article: Article): Article {
  const decoded = {
    ...article,
    title: decodeHtmlEntities(article.title),
    standfirst: decodeHtmlEntities(article.standfirst),
    body: decodeHtmlEntities(article.body),
    author: article.author ? decodeHtmlEntities(article.author) : article.author,
    tags: article.tags.map(decodeHtmlEntities),
    socialEmbeds: article.socialEmbeds?.map((embed) => ({
      ...embed,
      originalText: decodeHtmlEntities(embed.originalText),
      translatedText: embed.translatedText ? decodeHtmlEntities(embed.translatedText) : embed.translatedText,
      author: embed.author ? decodeHtmlEntities(embed.author) : embed.author,
    })),
  };
  return {
    ...decoded,
    body: stripArticleMetadataLines(decoded.body, decoded),
  };
}

function normaliseTranslation(row: Translation, sourceArticle?: Article): Translation {
  const decoded = {
    ...row,
    title: decodeHtmlEntities(row.title),
    standfirst: decodeHtmlEntities(row.standfirst),
    body: decodeHtmlEntities(row.body),
    seoTitle: decodeHtmlEntities(row.seoTitle),
    metaDescription: decodeHtmlEntities(row.metaDescription),
    tags: row.tags.map(decodeHtmlEntities),
    socialEmbeds: row.socialEmbeds?.map((embed) => ({
      ...embed,
      originalText: decodeHtmlEntities(embed.originalText),
      translatedText: embed.translatedText ? decodeHtmlEntities(embed.translatedText) : embed.translatedText,
      author: embed.author ? decodeHtmlEntities(embed.author) : embed.author,
    })),
    socialPosts: row.socialPosts?.map((post) => ({
      ...post,
      text: decodeHtmlEntities(post.text),
      headline: post.headline ? decodeHtmlEntities(post.headline) : post.headline,
      callToAction: post.callToAction ? decodeHtmlEntities(post.callToAction) : post.callToAction,
      hashtags: post.hashtags?.map(decodeHtmlEntities),
    })),
  };
  return {
    ...decoded,
    body: sourceArticle ? stripArticleMetadataLines(decoded.body, { ...sourceArticle, title: decoded.title }) : decoded.body,
  };
}

async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    throw new Error(`Server returned an empty response (${res.status}). Check the Netlify function logs for the translation error.`);
  }
}

function formatArticleDate(value?: string): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthInputValue(): string {
  return new Date().toISOString().slice(0, 7);
}

function dateInputValue(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function monthValue(value?: string): string {
  return dateInputValue(value).slice(0, 7);
}

function articleImageSrc(article?: Article): string {
  if (!article) return "";
  if (article.imageLibraryRel) return `/api/file?rel=${encodeURIComponent(article.imageLibraryRel)}`;
  return article.imageUrl ?? "";
}

function socialPostsForEditor(translation: Translation): SocialPost[] {
  return socialPlatformOrder.map((platform) => {
    const existing = translation.socialPosts?.find((post) => post.platform === platform);
    return existing ?? {
      platform,
      headline: translation.title,
      text: "",
      hashtags: [],
      callToAction: "",
    };
  });
}

function hasIncompleteSocialOutput(translation: Translation): boolean {
  return socialPostsForEditor(translation).some((post) => !post.text.trim());
}

function inferredArticleMeta(article: Article): { author?: string; publishDate?: string } {
  const lines = article.body.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const titleIndex = lines.findIndex((line) => line.toLowerCase() === article.title.trim().toLowerCase());
  const afterTitle = titleIndex >= 0 ? lines.slice(titleIndex + 1, titleIndex + 5) : lines.slice(0, 5);
  const author = afterTitle.find((line) => line.length <= 80 && !/\d/.test(line) && !/[.!?]/.test(line));
  const publishDate = afterTitle.find((line) =>
    /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|abr)[a-z]*\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\b/i.test(line),
  );
  return { author, publishDate };
}

function uniqueJournalistProfiles(rows: JournalistProfileRow[]): JournalistProfileRow[] {
  const byId = new Map<string, JournalistProfileRow>();
  for (const row of rows) {
    const existing = byId.get(row.id);
    if (!existing || String(row.updatedAt ?? "") >= String(existing.updatedAt ?? "")) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()];
}

function isLanguageStudioTab(value: string | null): value is LanguageStudioTab {
  return Boolean(value && allLanguageStudioTabs.includes(value));
}

export function LanguageStudioClient() {
  const [tab, setTab] = useState<LanguageStudioTab>("Dashboard");
  const [articles, setArticles] = useState<Article[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [exportsRows, setExportsRows] = useState<ExportRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientApiKeys, setClientApiKeys] = useState<ClientApiKeyRow[]>([]);
  const [clientAccessLogs, setClientAccessLogs] = useState<ClientAccessLogRow[]>([]);
  const [sourceBrands, setSourceBrands] = useState<SourceBrandRow[]>([]);
  const [journalistProfiles, setJournalistProfiles] = useState<JournalistProfileRow[]>([]);
  const [latestRawApiKey, setLatestRawApiKey] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [articleSelectionMode, setArticleSelectionMode] = useState<"selected" | "all">("selected");
  const [selectedTranslationId, setSelectedTranslationId] = useState("");
  const [approvalBlocked, setApprovalBlocked] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboardDay, setDashboardDay] = useState(todayInputValue);
  const [dashboardMonth, setDashboardMonth] = useState(monthInputValue);

  const [sourceUrl, setSourceUrl] = useState("https://www.planetf1.com/partner-media-content-feed");
  const [xml, setXml] = useState("");
  const [processImages, setProcessImages] = useState(true);
  const [importFullArticles, setImportFullArticles] = useState(true);
  const [sourceBrand, setSourceBrand] = useState("PlanetF1");
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode>("en");
  const [targetLanguages, setTargetLanguages] = useState<LanguageCode[]>(["es"]);
  const [providerMode, setProviderMode] = useState<LanguageProviderMode>("openai");
  const [translationMode, setTranslationMode] = useState<TranslationMode>("translate-localise");
  const [rewriteStyle, setRewriteStyle] = useState("Original editorial rewrite for Google: fresh structure, sharp intro, natural expert sports tone, no synonym spinning.");
  const [contentStyle, setContentStyle] = useState<LanguageContentStyle>("News");
  const [sportContext, setSportContext] = useState<LanguageSportContext>("Formula 1");
  const [journalistStyle, setJournalistStyle] = useState("");
  const [selectedJournalistProfileId, setSelectedJournalistProfileId] = useState("");
  const [editorialGuidelines, setEditorialGuidelines] = useState("Preserve quotes exactly in meaning and quote boundaries. Do not add facts, claims, results or opinion. Keep names, teams, numbers, dates and locations unchanged.");
  const [imageChangeUrl, setImageChangeUrl] = useState("");
  const [imageGenerationPrompt, setImageGenerationPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const activeSourceBrands = sourceBrands.filter((row) => row.active);
  const activeJournalistProfiles = useMemo(
    () => uniqueJournalistProfiles(journalistProfiles).filter((row) => row.active),
    [journalistProfiles],
  );
  const applyJournalistProfile = (profileId: string) => {
    const profile = activeJournalistProfiles.find((row) => row.id === profileId);
    setSelectedJournalistProfileId(profileId);
    if (!profile) return;
    setJournalistStyle(`${profile.name} (${profile.brand}${profile.sports.length ? ` · ${profile.sports.join(", ")}` : ""})\n${profile.styleNotes}`);
    if (profile.articleGuidelines) setEditorialGuidelines(profile.articleGuidelines);
  };

  const selectedArticle = useMemo(() => articles.find((article) => article.id === selectedArticleId) ?? articles[0], [articles, selectedArticleId]);
  const translationArticleIds = articleSelectionMode === "all"
    ? articles.map((article) => article.id)
    : selectedArticleIds.length > 0
      ? selectedArticleIds
      : selectedArticle
        ? [selectedArticle.id]
        : [];
  const selectedTranslation = useMemo(
    () => translations.find((translation) => translation.id === selectedTranslationId) ?? translations[0],
    [translations, selectedTranslationId],
  );
  const originalForTranslation = selectedTranslation
    ? articles.find((article) => article.id === selectedTranslation.articleId)
    : selectedArticle;
  const primaryTabCounts: Partial<Record<LanguageStudioTab, number>> = {
    Rewrite: articles.length,
    Translations: articles.length,
    "Review Queue": translations.filter((translation) => translation.status !== "approved").length,
  };
  const dashboardCounts = useMemo(() => {
    const articleDayRows = articles.filter((article) => dateInputValue(article.createdAt ?? article.updatedAt ?? article.publishDate) === dashboardDay);
    const articleMonthRows = articles.filter((article) => monthValue(article.createdAt ?? article.updatedAt ?? article.publishDate) === dashboardMonth);
    const translationDayRows = translations.filter((row) => dateInputValue(row.createdAt ?? row.updatedAt) === dashboardDay);
    const translationMonthRows = translations.filter((row) => monthValue(row.createdAt ?? row.updatedAt) === dashboardMonth);
    const approvedDayRows = translations.filter((row) => row.status === "approved" && dateInputValue(row.approvedAt ?? row.updatedAt ?? row.createdAt) === dashboardDay);
    const approvedMonthRows = translations.filter((row) => row.status === "approved" && monthValue(row.approvedAt ?? row.updatedAt ?? row.createdAt) === dashboardMonth);
    const exportDayRows = exportsRows.filter((row) => dateInputValue(row.createdAt) === dashboardDay);
    const exportMonthRows = exportsRows.filter((row) => monthValue(row.createdAt) === dashboardMonth);

    return {
      day: {
        articles: articleDayRows.length,
        translations: translationDayRows.length,
        approved: approvedDayRows.length,
        exports: exportDayRows.length,
      },
      month: {
        articles: articleMonthRows.length,
        translations: translationMonthRows.length,
        approved: approvedMonthRows.length,
        exports: exportMonthRows.length,
      },
    };
  }, [articles, dashboardDay, dashboardMonth, exportsRows, translations]);

  const loadAll = async () => {
    const [articleRes, transRes, glossaryRes, rulesRes, exportsRes, clientsRes, sourceBrandsRes, governanceRes] = await Promise.all([
      fetch("/api/language/articles"),
      fetch("/api/language/translations"),
      fetch("/api/language/glossary"),
      fetch("/api/language/rules"),
      fetch("/api/language/exports"),
      fetch("/api/language/clients"),
      fetch("/api/language/source-brands"),
      fetch("/api/language/governance"),
    ]);
    const articleData = await articleRes.json();
    const transData = await transRes.json();
    const glossaryData = await glossaryRes.json();
    const rulesData = await rulesRes.json();
    const exportsData = await exportsRes.json();
    const clientsData = await clientsRes.json();
    const sourceBrandsData = await sourceBrandsRes.json();
    const governanceData = await governanceRes.json();
    const loadedArticles = (articleData.articles ?? []).map((article: Article) => normaliseArticle(article));
    const articleById = new Map<string, Article>(loadedArticles.map((article: Article) => [article.id, article]));
    setArticles(loadedArticles);
    setTranslations((transData.translations ?? []).map((row: Translation) => normaliseTranslation(row, articleById.get(row.articleId))));
    setGlossary(glossaryData.glossary ?? []);
    setRules(rulesData.rules ?? []);
    setExportsRows(exportsData.exports ?? []);
    setClients(clientsData.clients ?? []);
    setClientApiKeys(clientsData.apiKeys ?? []);
    setClientAccessLogs(clientsData.accessLogs ?? []);
    setJournalistProfiles(uniqueJournalistProfiles(governanceData.journalistProfiles ?? []));
    const loadedSourceBrands = sourceBrandsData.sourceBrands ?? [];
    setSourceBrands(loadedSourceBrands);
    const selectedSource = loadedSourceBrands.find((row: SourceBrandRow) => row.name === sourceBrand) ?? loadedSourceBrands[0];
    if (selectedSource) {
      setSourceBrand(selectedSource.name);
      setSourceUrl(selectedSource.feedUrl);
      setSourceLanguage(selectedSource.sourceLanguage);
    }
  };

  useEffect(() => {
    void loadAll().catch((e) => setError(e instanceof Error ? e.message : "Failed to load Language Studio"));
  }, []);

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (isLanguageStudioTab(tabParam)) setTab(tabParam);
  }, []);

  const run = async (fn: () => Promise<void>, options: { reload?: boolean } = {}) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      if (options.reload !== false) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const importFeed = () =>
    run(async () => {
      const res = await fetch("/api/language/import/xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: sourceUrl.trim() || undefined,
          xml: xml.trim() || undefined,
          sourceBrand,
          sourceLanguage,
          processImages,
          importFullArticles,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      const importedArticles = Array.isArray(data.articles) ? (data.articles as Article[]).map(normaliseArticle) : [];
      const savedImages = importedArticles.filter((article) => article.imageLibraryRel).length;
      if (importedArticles.length > 0) {
        setArticles(importedArticles);
        setSelectedArticleId(importedArticles[0]?.id ?? "");
        setSelectedArticleIds(importedArticles.map((article) => article.id));
      }
      if (Array.isArray(data.journalistProfiles)) {
        const importedProfiles = uniqueJournalistProfiles(data.journalistProfiles as JournalistProfileRow[]);
        setJournalistProfiles((rows) => {
          const importedIds = new Set(importedProfiles.map((profile) => profile.id));
          return uniqueJournalistProfiles([...importedProfiles, ...rows.filter((profile) => !importedIds.has(profile.id))]);
        });
      }
      setMessage(
        `${importedArticles.length} article(s) imported (${data.createdCount ?? 0} new, ${data.updatedCount ?? 0} updated). ${savedImages} image(s) saved to Library.`,
      );
      setTab("Translations");
    }, { reload: false });

  const translateSelected = () =>
    run(async () => {
      if (translationArticleIds.length === 0) throw new Error("Select at least one article first.");
      const res = await fetch("/api/language/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleIds: translationArticleIds,
          targetLanguages,
          providerMode,
          translationMode,
          journalistProfileId: selectedJournalistProfileId || undefined,
          rewriteStyle,
          journalistStyle,
          editorialGuidelines,
          contentStyle,
          sportContext,
        }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Translation failed");
      const createdTranslations = Array.isArray(data.translations)
        ? (data.translations as Translation[]).map((row) => normaliseTranslation(row, articles.find((article) => article.id === row.articleId)))
        : [];
      if (createdTranslations.length > 0) {
        setTranslations((rows) => {
          const existingIds = new Set(createdTranslations.map((row) => row.id));
          return [...createdTranslations, ...rows.filter((row) => !existingIds.has(row.id))];
        });
      }
      setSelectedTranslationId(createdTranslations[0]?.id ?? "");
      setMessage(`${createdTranslations.length} translation(s) created from ${translationArticleIds.length} article(s).`);
      setTab("Review Queue");
    }, { reload: false });

  const rewriteSelected = () =>
    run(async () => {
      if (translationArticleIds.length === 0) throw new Error("Select at least one article first.");
      const res = await fetch("/api/language/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleIds: translationArticleIds,
          providerMode: "openai",
          journalistProfileId: selectedJournalistProfileId || undefined,
          rewriteStyle,
          journalistStyle,
          editorialGuidelines,
          contentStyle,
          sportContext,
        }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Rewrite failed");
      const createdRewrites = Array.isArray(data.rewrites)
        ? (data.rewrites as Translation[]).map((row) => normaliseTranslation(row, articles.find((article) => article.id === row.articleId)))
        : [];
      if (createdRewrites.length > 0) {
        setTranslations((rows) => {
          const existingIds = new Set(createdRewrites.map((row) => row.id));
          return [...createdRewrites, ...rows.filter((row) => !existingIds.has(row.id))];
        });
        setSelectedTranslationId(createdRewrites[0]?.id ?? "");
      }
      setMessage(`${createdRewrites.length} rewrite(s) created from ${translationArticleIds.length} article(s).`);
      setTab("Review Queue");
    }, { reload: false });

  const deleteSelectedArticles = () =>
    run(async () => {
      if (translationArticleIds.length === 0) throw new Error("Select at least one article first.");
      const res = await fetch("/api/language/articles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleIds: translationArticleIds }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Delete failed");
      const deletedIds = Array.isArray(data.deletedIds) ? data.deletedIds.map(String) : [];
      const blockedIds = Array.isArray(data.blockedIds) ? data.blockedIds.map(String) : [];
      setArticles((rows) => rows.filter((article) => !deletedIds.includes(article.id)));
      setSelectedArticleIds((ids) => ids.filter((id) => !deletedIds.includes(id)));
      setTranslations((rows) => rows.filter((row) => !deletedIds.includes(row.articleId)));
      setMessage(`${deletedIds.length} article(s) deleted.${blockedIds.length ? ` ${blockedIds.length} approved/exported article(s) were kept.` : ""}`);
    }, { reload: false });

  const saveTranslation = () =>
    run(async () => {
      if (!selectedTranslation) throw new Error("Select a translation first.");
      const res = await fetch("/api/language/review/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedTranslation),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage("Translation saved.");
    });

  const approveTranslation = (approved: boolean) =>
    run(async () => {
      if (!selectedTranslation) throw new Error("Select a translation first.");
      const res = await fetch("/api/language/review/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translationId: selectedTranslation.id, approved, adminOverride, overrideReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");
      if (data.translation) {
        setTranslations((rows) => rows.map((row) => row.id === selectedTranslation.id
          ? normaliseTranslation(data.translation as Translation, articles.find((article) => article.id === selectedTranslation.articleId))
          : row));
      } else if (!approved) {
        setTranslations((rows) => rows.filter((row) => row.id !== selectedTranslation.id));
      }
      if (approved) {
        const exportsRes = await fetch("/api/language/exports");
        const exportsData = await exportsRes.json();
        setExportsRows(exportsData.exports ?? []);
      }
      setAdminOverride(false);
      setOverrideReason("");
      setMessage(approved ? "Translation approved and exported to XML + JSON." : "Translation rejected and deleted.");
    });

  const exportTranslation = (format: "xml" | "json") =>
    run(async () => {
      if (!selectedTranslation) throw new Error("Select a translation first.");
      const res = await fetch(format === "xml" ? "/api/language/export/xml" : "/api/language/export/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translationId: selectedTranslation.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");
      setMessage(`${format.toUpperCase()} export created.`);
      setTab("Export Feeds");
    });

  const saveGlossary = (entry: Partial<GlossaryEntry>) =>
    run(async () => {
      const res = await fetch("/api/language/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Glossary save failed");
      setMessage("Glossary entry saved.");
    });

  const saveRule = (rule: Partial<Rule>) =>
    run(async () => {
      const res = await fetch("/api/language/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rule save failed");
      setMessage("Rule saved.");
    });

  const saveClient = (client: Partial<ClientRow>) =>
    run(async () => {
      const res = await fetch("/api/language/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(client),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Client save failed");
      setMessage("Client saved.");
    });

  const createClientApiKey = (apiKey: Partial<ClientApiKeyRow>) =>
    run(async () => {
      const res = await fetch("/api/language/client-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API key creation failed");
      setLatestRawApiKey(data.rawKey ?? null);
      setMessage("API key created. Copy it now; it will only be shown once.");
    });

  const revokeClientApiKey = (id: string) =>
    run(async () => {
      const res = await fetch("/api/language/client-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API key revoke failed");
      setMessage("API key revoked.");
    });

  const deleteClient = (id: string) =>
    run(async () => {
      const res = await fetch(`/api/language/clients?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Client delete failed");
      setMessage("Client deleted.");
    });

  const saveSourceBrand = (source: Partial<SourceBrandRow>) =>
    run(async () => {
      const res = await fetch("/api/language/source-brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(source),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Source brand save failed");
      setMessage("Source brand saved.");
    });

  const updateSelectedTranslation = (patch: Partial<Translation>) => {
    if (!selectedTranslation) return;
    setTranslations((rows) => rows.map((row) => (row.id === selectedTranslation.id ? { ...row, ...patch } : row)));
  };

  const updateArticleImage = (action: "delete" | "change") =>
    run(async () => {
      const article = originalForTranslation ?? selectedArticle;
      if (!article) throw new Error("Select an article first.");
      const res = await fetch("/api/language/articles/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id, action, imageUrl: imageChangeUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image update failed");
      const updated = normaliseArticle(data.article as Article);
      setArticles((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      if (action === "change") setImageChangeUrl("");
      setMessage(action === "delete" ? "Article image removed." : "Article image changed and saved to Library where possible.");
    }, { reload: false });

  const generateSocialOutput = () =>
    run(async () => {
      if (!selectedTranslation) throw new Error("Select a translation first.");
      const res = await fetch("/api/language/social-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translationId: selectedTranslation.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Social output generation failed");
      const updated = normaliseTranslation(data.translation as Translation, articles.find((article) => article.id === selectedTranslation.articleId));
      setTranslations((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setMessage("Social output generated for all platforms.");
    }, { reload: false });

  const startImageToVideo = () =>
    run(async () => {
      const article = originalForTranslation ?? selectedArticle;
      const src = articleImageSrc(article);
      if (!article || !src) throw new Error("Select an article with an image first.");
      const promptImage = /^https:\/\//i.test(src)
        ? src
        : typeof window !== "undefined" && window.location.protocol === "https:"
          ? new URL(src, window.location.origin).toString()
          : "";
      if (!promptImage) throw new Error("Image to Video needs a public HTTPS image URL. Use this on Netlify or change to a remote HTTPS image.");
      const res = await fetch("/api/runway/image-to-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptImage,
          promptText: imageGenerationPrompt || `Create a subtle editorial sports news video from this source image: ${article.title}`,
          duration: 8,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image to Video failed");
      setMessage(`Image to Video started. Runway task: ${data.taskId}`);
    }, { reload: false });

  const startTextToImage = () =>
    run(async () => {
      const article = originalForTranslation ?? selectedArticle;
      if (!article) throw new Error("Select an article first.");
      const res = await fetch("/api/runway/text-to-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: imageGenerationPrompt || `Editorial sports news thumbnail image for: ${article.title}. Clean, premium, realistic, no text overlays.`,
          ratio: "1080:1920",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Text to Image failed");
      setMessage(`Text to Image started. Runway task: ${data.taskId}`);
    }, { reload: false });

  const adminPanel = (
    <Panel title="Language Studio Admin" className="p-5">
      <div className="flex flex-wrap gap-2">
        {secondaryTabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className="rounded-full border border-[#1f2d26] px-3 py-1.5 text-sm text-slate-400"
          >
            {item}
          </button>
        ))}
      </div>
    </Panel>
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22c55e]">Control Room</p>
        <h1 className="mt-1 text-3xl font-black text-white">Language Studio</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          Import XML/RSS/API content, translate and localise it, review human edits, then export approved XML or API JSON.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {primaryTabs.map((item) => {
          const count = primaryTabCounts[item];
          return (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${tab === item ? "border-[#22c55e] bg-[#22c55e]/15 text-white" : "border-[#1f2d26] text-slate-400"}`}
            >
              <span>{item}</span>
              {typeof count === "number" ? (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tab === item ? "bg-[#22c55e] text-black" : "bg-slate-800 text-slate-300"}`}>
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      {tab === "Dashboard" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Stat title="Articles" value={articles.length} />
            <Stat title="Translations" value={translations.length} />
            <Stat title="Approved" value={translations.filter((row) => row.status === "approved").length} />
            <Stat title="Exports" value={exportsRows.length} />
          </div>
          <Panel title="Processed Today" className="space-y-4 p-5">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Filter by day
                <input className={inputClass} type="date" value={dashboardDay} onChange={(e) => setDashboardDay(e.target.value)} />
              </label>
              <button type="button" className="rounded-lg border border-[#1f2d26] px-3 py-2 text-sm text-slate-300" onClick={() => setDashboardDay(todayInputValue())}>
                Today
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Stat title="Imported" value={dashboardCounts.day.articles} />
              <Stat title="Processed" value={dashboardCounts.day.translations} />
              <Stat title="Approved" value={dashboardCounts.day.approved} />
              <Stat title="Exported" value={dashboardCounts.day.exports} />
            </div>
          </Panel>
          <Panel title="Processed This Month" className="space-y-4 p-5">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Filter by month
                <input className={inputClass} type="month" value={dashboardMonth} onChange={(e) => setDashboardMonth(e.target.value)} />
              </label>
              <button type="button" className="rounded-lg border border-[#1f2d26] px-3 py-2 text-sm text-slate-300" onClick={() => setDashboardMonth(monthInputValue())}>
                This month
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Stat title="Imported" value={dashboardCounts.month.articles} />
              <Stat title="Processed" value={dashboardCounts.month.translations} />
              <Stat title="Approved" value={dashboardCounts.month.approved} />
              <Stat title="Exported" value={dashboardCounts.month.exports} />
            </div>
          </Panel>
          {adminPanel}
        </div>
      ) : null}

      {tab === "Imports" ? (
        <div className="space-y-4">
          <Panel title="Imports" className="space-y-4 p-5">
            <h2 className="text-xl font-bold text-white">Import XML / RSS / URL / API</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Source brand
                <select
                  className={inputClass}
                  value={sourceBrand}
                  onChange={(e) => {
                    const selected = sourceBrands.find((row) => row.name === e.target.value);
                    setSourceBrand(e.target.value);
                    if (selected) {
                      setSourceUrl(selected.feedUrl);
                      setSourceLanguage(selected.sourceLanguage);
                    }
                  }}
                >
                  {activeSourceBrands.map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}
                  {!activeSourceBrands.some((row) => row.name === sourceBrand) ? <option value={sourceBrand}>{sourceBrand}</option> : null}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase text-slate-500">Source language<select className={inputClass} value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value as LanguageCode)}>{Object.entries(LANGUAGE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
              <label className="text-xs font-semibold uppercase text-slate-500 md:col-span-2">Feed URL<input className={inputClass} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} /></label>
            </div>
            <p className="text-xs text-slate-500">
              Parser: {sourceBrands.find((row) => row.name === sourceBrand)?.parserType ?? "manual"} · Use Source Brands in the dashboard admin area to add Football365, DAZN, BBC, Sky, ESPN or custom feeds.
            </p>
            <label className="block text-xs font-semibold uppercase text-slate-500">Or paste XML<textarea className={textareaClass} value={xml} onChange={(e) => setXml(e.target.value)} /></label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={processImages} onChange={(e) => setProcessImages(e.target.checked)} />
              Process article images and store them in the Library
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={importFullArticles} onChange={(e) => setImportFullArticles(e.target.checked)} />
              Follow article URLs and import the full article body
            </label>
            <R365Button type="button" onClick={() => void importFeed()} disabled={busy}>{busy ? "Importing..." : "Import feed"}</R365Button>
          </Panel>
          {adminPanel}
        </div>
      ) : null}

      {tab === "Translations" ? (
        <div className="space-y-4">
          <Panel title="Translations" className="space-y-4 p-5">
            <h2 className="text-xl font-bold text-white">Translation Queue</h2>
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <ArticleList
              articles={articles}
              selectedId={selectedArticle?.id ?? ""}
              selectedIds={selectedArticleIds}
              onSelect={setSelectedArticleId}
              onToggle={(id) => setSelectedArticleIds((rows) => rows.includes(id) ? rows.filter((row) => row !== id) : [...rows, id])}
            />
            <div className="space-y-3">
              <div className="rounded-lg border border-[#1f2d26] p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Articles to translate</p>
                <div className="mt-2 space-y-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={articleSelectionMode === "selected"} onChange={() => setArticleSelectionMode("selected")} />
                    Selected articles ({translationArticleIds.length})
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={articleSelectionMode === "all"} onChange={() => setArticleSelectionMode("all")} />
                    All imported articles ({articles.length})
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={miniButtonClass} onClick={() => setSelectedArticleIds(articles.map((article) => article.id))}>Select all</button>
                  <button type="button" className={miniButtonClass} onClick={() => setSelectedArticleIds([])}>Clear</button>
                  <button type="button" className={dangerMiniButtonClass} onClick={() => void deleteSelectedArticles()}>Delete selected</button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Content style
                  <select className={inputClass} value={contentStyle} onChange={(e) => setContentStyle(e.target.value as LanguageContentStyle)}>
                    {contentStyleOptions.map((style) => <option key={style} value={style}>{style}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Sport
                  <select className={inputClass} value={sportContext} onChange={(e) => setSportContext(e.target.value as LanguageSportContext)}>
                    {sportContextOptions.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Style
                <textarea className={textareaClass} value={rewriteStyle} onChange={(e) => setRewriteStyle(e.target.value)} />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Use Journalist Profile
                <select className={inputClass} value={selectedJournalistProfileId} onChange={(e) => applyJournalistProfile(e.target.value)}>
                  <option value="">Manual journalist style</option>
                  {activeJournalistProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {profile.brand}{profile.sports.length ? ` · ${profile.sports.join(", ")}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Journalist Style
                <textarea className={textareaClass} value={journalistStyle} onChange={(e) => setJournalistStyle(e.target.value)} />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Article / Editorial Guidelines
                <textarea className={textareaClass} value={editorialGuidelines} onChange={(e) => setEditorialGuidelines(e.target.value)} />
              </label>
              <label className="text-xs font-semibold uppercase text-slate-500">Provider mode<select className={inputClass} value={providerMode} onChange={(e) => setProviderMode(e.target.value as LanguageProviderMode)}><option value="openai">OpenAI only</option><option value="deepl">DeepL only</option><option value="deepl-openai">DeepL + OpenAI localisation</option></select></label>
              <label className="text-xs font-semibold uppercase text-slate-500">Translation mode<select className={inputClass} value={translationMode} onChange={(e) => setTranslationMode(e.target.value as TranslationMode)}><option value="translate-only">Translate only</option><option value="translate-localise">Translate + localise</option><option value="translate-rewrite">Translate and rewrite</option><option value="headline-only">Regenerate headline only</option><option value="seo-only">Regenerate SEO only</option><option value="summary-only">Regenerate summary only</option></select></label>
              <div className="rounded-lg border border-[#1f2d26] p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Target languages</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  {targetOptions.map(([code, label]) => (
                    <label key={code} className="flex items-center gap-2">
                      <input type="checkbox" checked={targetLanguages.includes(code)} onChange={(e) => setTargetLanguages((rows) => e.target.checked ? [...rows, code] : rows.filter((row) => row !== code))} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <R365Button type="button" onClick={() => void translateSelected()} disabled={busy || translationArticleIds.length === 0}>{busy ? "Translating..." : "Run translation/localisation"}</R365Button>
            </div>
            </div>
          </Panel>
          {adminPanel}
        </div>
      ) : null}

      {tab === "Rewrite" ? (
        <div className="space-y-4">
          <Panel title="Rewrite" className="space-y-4 p-5">
            <div>
              <h2 className="text-xl font-bold text-white">Rewrite Articles</h2>
              <p className="mt-1 text-sm text-slate-400">
                Rewrite imported articles in the source language for originality, Google usefulness and editorial quality. Quotes, facts, numbers and names stay protected.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
            <ArticleList
              articles={articles}
              selectedId={selectedArticle?.id ?? ""}
              selectedIds={selectedArticleIds}
              onSelect={setSelectedArticleId}
              onToggle={(id) => setSelectedArticleIds((rows) => rows.includes(id) ? rows.filter((row) => row !== id) : [...rows, id])}
            />
            <div className="space-y-3">
              <div className="rounded-lg border border-[#1f2d26] p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Articles to rewrite</p>
                <div className="mt-2 space-y-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={articleSelectionMode === "selected"} onChange={() => setArticleSelectionMode("selected")} />
                    Selected articles ({translationArticleIds.length})
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={articleSelectionMode === "all"} onChange={() => setArticleSelectionMode("all")} />
                    All imported articles ({articles.length})
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={miniButtonClass} onClick={() => setSelectedArticleIds(articles.map((article) => article.id))}>Select all</button>
                  <button type="button" className={miniButtonClass} onClick={() => setSelectedArticleIds([])}>Clear</button>
                  <button type="button" className={dangerMiniButtonClass} onClick={() => void deleteSelectedArticles()}>Delete selected</button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Content style
                  <select className={inputClass} value={contentStyle} onChange={(e) => setContentStyle(e.target.value as LanguageContentStyle)}>
                    {contentStyleOptions.map((style) => <option key={style} value={style}>{style}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Sport
                  <select className={inputClass} value={sportContext} onChange={(e) => setSportContext(e.target.value as LanguageSportContext)}>
                    {sportContextOptions.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Style
                <textarea className={textareaClass} value={rewriteStyle} onChange={(e) => setRewriteStyle(e.target.value)} />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Use Journalist Profile
                <select
                  className={inputClass}
                  value={selectedJournalistProfileId}
                  onChange={(e) => applyJournalistProfile(e.target.value)}
                >
                  <option value="">Manual journalist style</option>
                  {activeJournalistProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {profile.brand}{profile.sports.length ? ` · ${profile.sports.join(", ")}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Journalist Style
                <textarea className={textareaClass} value={journalistStyle} onChange={(e) => setJournalistStyle(e.target.value)} />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Article / Editorial Guidelines
                <textarea className={textareaClass} value={editorialGuidelines} onChange={(e) => setEditorialGuidelines(e.target.value)} />
              </label>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                Google rewrite rule: create a fresh structure and original phrasing, not thin synonym spinning. Preserve source facts and direct quotes.
              </div>
              <R365Button type="button" onClick={() => void rewriteSelected()} disabled={busy || translationArticleIds.length === 0}>{busy ? "Rewriting..." : "Run rewrite"}</R365Button>
            </div>
            </div>
          </Panel>
          {adminPanel}
        </div>
      ) : null}

      {tab === "Review Queue" ? (
        <div className="space-y-4">
          <Panel title="Review Queue" className="space-y-4 p-5">
            <h2 className="text-xl font-bold text-white">Review Editor</h2>
            <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <TranslationList translations={translations} selectedId={selectedTranslation?.id ?? ""} onSelect={setSelectedTranslationId} />
            <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-4">
                <ArticlePreview title="Original article" article={originalForTranslation} />
                {selectedTranslation ? (
                  <div className="space-y-3 rounded-lg border border-[#1f2d26] bg-black/20 p-4">
                    <p className="text-sm font-bold text-white">Translated version ({LANGUAGE_LABELS[selectedTranslation.targetLanguage]})</p>
                    <input className={inputClass} value={selectedTranslation.title} onChange={(e) => updateSelectedTranslation({ title: e.target.value })} />
                    <textarea className={textareaClass} value={selectedTranslation.standfirst} onChange={(e) => updateSelectedTranslation({ standfirst: e.target.value })} />
                    <textarea className={`${textareaClass} min-h-[360px]`} value={selectedTranslation.body} onChange={(e) => updateSelectedTranslation({ body: e.target.value })} />
                    {selectedTranslation.socialEmbeds?.length ? (
                      <div className="space-y-2 rounded-lg border border-[#1f2d26] bg-black/20 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Translated social embeds</p>
                        {selectedTranslation.socialEmbeds.map((embed) => (
                          <label key={embed.id} className="block text-xs text-slate-400">
                            {embed.marker} · {embed.provider}{embed.handle ? ` · ${embed.handle}` : ""}
                            <textarea
                              className={textareaClass}
                              value={embed.translatedText ?? ""}
                              onChange={(e) => updateSelectedTranslation({
                                socialEmbeds: selectedTranslation.socialEmbeds?.map((row) => row.id === embed.id ? { ...row, translatedText: e.target.value } : row),
                              })}
                            />
                          </label>
                        ))}
                      </div>
                    ) : null}
                    <div className="space-y-2 rounded-lg border border-[#1f2d26] bg-black/20 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase text-slate-500">Social Output</p>
                        </div>
                        {hasIncompleteSocialOutput(selectedTranslation) ? (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                            <p className="font-semibold text-white">Platform copy is incomplete.</p>
                            <p className="mt-1">Use AI to complete every platform copy field, then review/edit before approval.</p>
                            <button type="button" className={`${amberButtonClass} mt-2`} onClick={() => void generateSocialOutput()} disabled={busy}>
                              {busy ? "Generating social output..." : "Complete all social fields with AI"}
                            </button>
                          </div>
                        ) : null}
                        <div className="grid gap-3 lg:grid-cols-2">
                          {socialPostsForEditor(selectedTranslation).map((post) => (
                            <div key={post.platform} className="space-y-2 rounded border border-[#1f2d26] bg-black/20 p-3">
                              <p className="text-xs font-bold uppercase text-slate-400">{socialPlatformLabels[post.platform]}</p>
                              <input
                                className={inputClass}
                                placeholder="Headline"
                                value={post.headline ?? ""}
                                onChange={(e) => updateSelectedTranslation({
                                  socialPosts: socialPostsForEditor(selectedTranslation).map((row) => row.platform === post.platform ? { ...row, headline: e.target.value } : row),
                                })}
                              />
                              <textarea
                                className={textareaClass}
                                placeholder="Platform copy"
                                value={post.text}
                                onChange={(e) => updateSelectedTranslation({
                                  socialPosts: socialPostsForEditor(selectedTranslation).map((row) => row.platform === post.platform ? { ...row, text: e.target.value } : row),
                                })}
                              />
                              <input
                                className={inputClass}
                                placeholder="Hashtags, comma-separated"
                                value={(post.hashtags ?? []).join(", ")}
                                onChange={(e) => updateSelectedTranslation({
                                  socialPosts: socialPostsForEditor(selectedTranslation).map((row) => row.platform === post.platform ? { ...row, hashtags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) } : row),
                                })}
                              />
                              <input
                                className={inputClass}
                                placeholder="Call to action"
                                value={post.callToAction ?? ""}
                                onChange={(e) => updateSelectedTranslation({
                                  socialPosts: socialPostsForEditor(selectedTranslation).map((row) => row.platform === post.platform ? { ...row, callToAction: e.target.value } : row),
                                })}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <label className="text-xs font-semibold uppercase text-slate-500">SEO title<input className={inputClass} value={selectedTranslation.seoTitle} onChange={(e) => updateSelectedTranslation({ seoTitle: e.target.value })} /></label>
                      <label className="text-xs font-semibold uppercase text-slate-500">Slug<input className={inputClass} value={selectedTranslation.slug} onChange={(e) => updateSelectedTranslation({ slug: e.target.value })} /></label>
                    </div>
                    <label className="block text-xs font-semibold uppercase text-slate-500">Meta description<textarea className={textareaClass} value={selectedTranslation.metaDescription} onChange={(e) => updateSelectedTranslation({ metaDescription: e.target.value })} /></label>
                    <label className="block text-xs font-semibold uppercase text-slate-500">Tags<input className={inputClass} value={selectedTranslation.tags.join(", ")} onChange={(e) => updateSelectedTranslation({ tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></label>
                    <div className="flex flex-wrap gap-2">
                      <R365Button type="button" variant="ghost" onClick={() => void saveTranslation()} disabled={busy}>Save</R365Button>
                      <R365Button type="button" onClick={() => void approveTranslation(true)} disabled={busy || (approvalBlocked && !(adminOverride && overrideReason.trim()))}>Approve</R365Button>
                      <R365Button type="button" variant="ghost" onClick={() => void approveTranslation(false)} disabled={busy}>Reject</R365Button>
                      <R365Button type="button" variant="ghost" onClick={() => void translateSelected()} disabled={busy}>Regenerate</R365Button>
                      <R365Button type="button" variant="ghost" onClick={() => void exportTranslation("xml")} disabled={busy || selectedTranslation.status !== "approved"}>Export XML</R365Button>
                      <R365Button type="button" variant="ghost" onClick={() => void exportTranslation("json")} disabled={busy || selectedTranslation.status !== "approved"}>Export JSON</R365Button>
                    </div>
                  </div>
                ) : <p className="text-sm text-slate-500">No translation selected.</p>}
              </div>
              <div className="min-w-0 2xl:sticky 2xl:top-4 2xl:self-start">
                <SourceImagePanel
                  article={originalForTranslation}
                  imageChangeUrl={imageChangeUrl}
                  imageGenerationPrompt={imageGenerationPrompt}
                  busy={busy}
                  onImageChangeUrl={setImageChangeUrl}
                  onImageGenerationPrompt={setImageGenerationPrompt}
                  onDelete={() => void updateArticleImage("delete")}
                  onChange={() => void updateArticleImage("change")}
                  onImageToVideo={() => void startImageToVideo()}
                  onTextToImage={() => void startTextToImage()}
                />
                <QualityGuardrailsPanel
                  translationId={selectedTranslation?.id}
                  translation={selectedTranslation as unknown as StoredLanguageTranslation | undefined}
                  adminOverride={adminOverride}
                  overrideReason={overrideReason}
                  onBlockedChange={setApprovalBlocked}
                  onAdminOverrideChange={setAdminOverride}
                  onOverrideReasonChange={setOverrideReason}
                  onTranslationFixed={(translation) => {
                    setTranslations((rows) => rows.map((row) => row.id === translation.id
                      ? normaliseTranslation(translation as Translation, articles.find((article) => article.id === translation.articleId))
                      : row));
                    setMessage("AI fixed the selected quality issue and saved the lesson to Knowledge Files.");
                  }}
                />
              </div>
            </div>
            </div>
          </Panel>
          {adminPanel}
        </div>
      ) : null}

      {tab === "Guardrails" ? <GovernancePanel section="Guardrails" /> : null}
      {tab === "Source Brands" ? <SourceBrandsPanel sourceBrands={sourceBrands} onSave={saveSourceBrand} busy={busy} /> : null}
      {tab === "Journalists" ? <GovernancePanel section="Journalists" /> : null}
      {tab === "Knowledge Files" ? <GovernancePanel section="Knowledge Files" /> : null}
      {tab === "Glossary" ? <GlossaryPanel glossary={glossary} onSave={saveGlossary} busy={busy} /> : null}
      {tab === "Protected Terms" ? <GovernancePanel section="Protected Terms" /> : null}
      {tab === "Market Rules" ? <GovernancePanel section="Market Rules" /> : null}
      {tab === "Prompt Rules" ? <GovernancePanel section="Prompt Rules" /> : null}
      {tab === "Compliance Notes" ? <GovernancePanel section="Compliance Notes" /> : null}
      {tab === "Quality Checks" ? <GovernancePanel section="Quality Checks" /> : null}
      {tab === "Export Feeds" ? <ExportsPanel exportsRows={exportsRows} /> : null}
      {tab === "Client Access" ? (
        <ClientAccessPanel
          clients={clients}
          apiKeys={clientApiKeys}
          accessLogs={clientAccessLogs}
          rawApiKey={latestRawApiKey}
          onSaveClient={saveClient}
          onDeleteClient={deleteClient}
          onCreateKey={createClientApiKey}
          onRevokeKey={revokeClientApiKey}
          busy={busy}
        />
      ) : null}
      {tab === "Settings" ? <RulesPanel rules={rules} onSave={saveRule} busy={busy} /> : null}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return <Panel title={title} className="p-5"><p className="text-3xl font-black text-white">{value}</p></Panel>;
}

function SourceImagePanel({
  article,
  imageChangeUrl,
  imageGenerationPrompt,
  busy,
  onImageChangeUrl,
  onImageGenerationPrompt,
  onDelete,
  onChange,
  onImageToVideo,
  onTextToImage,
}: {
  article?: Article;
  imageChangeUrl: string;
  imageGenerationPrompt: string;
  busy: boolean;
  onImageChangeUrl: (value: string) => void;
  onImageGenerationPrompt: (value: string) => void;
  onDelete: () => void;
  onChange: () => void;
  onImageToVideo: () => void;
  onTextToImage: () => void;
}) {
  const src = articleImageSrc(article);
  return (
    <div className="mb-4 space-y-3 rounded-lg border border-[#1f2d26] bg-black/20 p-4">
      <div>
        <p className="text-sm font-bold text-white">Source Image</p>
        <p className="mt-1 text-xs text-slate-500">Thumbnail and image tools for social/video output.</p>
      </div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={article?.title ?? "Source image"} className="aspect-video w-full rounded-lg border border-[#1f2d26] bg-black object-cover" />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-[#1f2d26] bg-black/30 text-xs text-slate-500">
          No source image
        </div>
      )}
      {article?.imageLibraryRel ? <p className="truncate text-xs text-[#22c55e]">Library: {article.imageLibraryRel}</p> : null}
      {article?.imageUrl ? <p className="truncate text-xs text-slate-500">Remote: {article.imageUrl}</p> : null}
      <div className="space-y-2">
        <input
          className={inputClass}
          placeholder="Change image URL"
          value={imageChangeUrl}
          onChange={(e) => onImageChangeUrl(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={miniButtonClass} onClick={onChange} disabled={busy || !imageChangeUrl.trim()}>Change</button>
          <button type="button" className={dangerMiniButtonClass} onClick={onDelete} disabled={busy || !src}>Delete</button>
        </div>
      </div>
      <label className="block text-xs font-semibold uppercase text-slate-500">
        Image generation prompt
        <textarea
          className={textareaClass}
          placeholder="Optional prompt for Image to Video / Text to Image"
          value={imageGenerationPrompt}
          onChange={(e) => onImageGenerationPrompt(e.target.value)}
        />
      </label>
      <div className="grid gap-2">
        <button type="button" className={miniButtonClass} onClick={onImageToVideo} disabled={busy || !src}>Image to Video +</button>
        <button type="button" className={miniButtonClass} onClick={onTextToImage} disabled={busy || !article}>Text to Image +</button>
        <button type="button" className={miniButtonClass} disabled title="Image to Image needs the chosen provider wired next.">
          Image to Image + Runway / OpenAI
        </button>
      </div>
      <p className="text-xs text-slate-500">Image to Image is parked until the Runway/OpenAI image edit provider is connected.</p>
    </div>
  );
}

function ArticleList({
  articles,
  selectedId,
  selectedIds,
  onSelect,
  onToggle,
}: {
  articles: Article[];
  selectedId: string;
  selectedIds: string[];
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  if (articles.length === 0) {
    return (
      <div className="rounded-lg border border-[#1f2d26] bg-black/20 p-4 text-sm text-slate-400">
        No imported articles found yet. Run an import from the Imports tab, then check the success message for the
        parsed article count.
      </div>
    );
  }

  return (
    <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
      {articles.map((article) => {
          const meta = inferredArticleMeta(article);
          return (
            <div
              key={article.id}
              className={`rounded-lg border p-3 ${selectedId === article.id ? "border-[#22c55e] bg-[#22c55e]/10" : "border-[#1f2d26] bg-black/20"}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.includes(article.id)}
                  onChange={() => onToggle(article.id)}
                  aria-label={`Select ${article.title}`}
                />
                <button type="button" onClick={() => onSelect(article.id)} className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-white">{article.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {article.sourceBrand} · {article.status} · body {article.body.length.toLocaleString()} chars · {article.imageLibraryRel ? "image saved" : article.imageUrl ? "image found" : "no image"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {article.author || meta.author || "Unknown author"} · {formatArticleDate(article.publishDate || meta.publishDate)}
                  </p>
                  {article.imageLibraryRel ? (
                    <p className="mt-1 truncate text-xs text-[#22c55e]">Library: {article.imageLibraryRel}</p>
                  ) : article.imageUrl ? (
                    <p className="mt-1 truncate text-xs text-slate-500">Remote image: {article.imageUrl}</p>
                  ) : null}
                  <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                    {article.body || article.standfirst || "No body content parsed"}
                  </p>
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );
}

function TranslationList({ translations, selectedId, onSelect }: { translations: Translation[]; selectedId: string; onSelect: (id: string) => void }) {
  const reviewRows = translations.filter((row) => row.status !== "approved");
  const approvedRows = translations.filter((row) => row.status === "approved");
  const renderRow = (row: Translation) => (
    <button
      key={row.id}
      type="button"
      onClick={() => onSelect(row.id)}
      className={`block w-full rounded-lg border p-3 text-left ${selectedId === row.id ? "border-[#22c55e] bg-[#22c55e]/10" : "border-[#1f2d26] bg-black/20"}`}
    >
      <p className="font-semibold text-white">{row.title || "Untitled translation"}</p>
      <p className="mt-1 text-xs text-slate-500">
        {LANGUAGE_LABELS[row.targetLanguage]} · {row.status}{row.id.startsWith("lrewrite-") ? " · rewrite" : ""}
      </p>
    </button>
  );

  return (
    <div className="max-h-[650px] space-y-4 overflow-y-auto pr-1">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs review ({reviewRows.length})</p>
        {reviewRows.length ? reviewRows.map(renderRow) : <p className="rounded-lg border border-[#1f2d26] bg-black/20 p-3 text-xs text-slate-500">No translations waiting for review.</p>}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Approved ({approvedRows.length})</p>
        {approvedRows.length ? approvedRows.map(renderRow) : <p className="rounded-lg border border-[#1f2d26] bg-black/20 p-3 text-xs text-slate-500">No approved translations yet.</p>}
      </div>
    </div>
  );
}

function ArticlePreview({ title, article }: { title: string; article?: Article }) {
  if (!article) return <p className="text-sm text-slate-500">No article selected.</p>;
  const meta = inferredArticleMeta(article);
  return (
    <details className="rounded-lg border border-[#1f2d26] bg-black/20 p-4">
      <summary className="cursor-pointer list-none">
        <p className="text-sm font-bold text-white">{title}</p>
        <h3 className="mt-1 text-base font-black text-white">{article.title}</h3>
        <p className="mt-2 text-xs text-slate-500">
          {article.author || meta.author || "Unknown author"} · {formatArticleDate(article.publishDate || meta.publishDate)} · body {article.body.length.toLocaleString()} chars
        </p>
        <p className="mt-2 text-xs text-[#22c55e]">Click to expand source article</p>
      </summary>
      <div className="mt-4 space-y-3">
        <div className="grid gap-2 rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3 text-xs text-slate-300 md:grid-cols-3">
          <div><p className="font-semibold uppercase tracking-wide text-slate-500">Author</p><p className="mt-1 text-white">{article.author || meta.author || "Not set"}</p></div>
          <div><p className="font-semibold uppercase tracking-wide text-slate-500">Publish date</p><p className="mt-1 text-white">{formatArticleDate(article.publishDate || meta.publishDate)}</p></div>
          <div><p className="font-semibold uppercase tracking-wide text-slate-500">Edit date</p><p className="mt-1 text-white">{formatArticleDate(article.modifiedDate)}</p></div>
        </div>
        <p className="text-xs text-slate-500">Body length: {article.body.length.toLocaleString()} characters · Tags: {article.tags.join(", ") || "none"}</p>
        {article.imageLibraryRel ? <p className="truncate text-xs text-[#22c55e]">Image saved to Library: {article.imageLibraryRel}</p> : article.imageUrl ? <p className="truncate text-xs text-slate-500">Remote image: {article.imageUrl}</p> : <p className="text-xs text-slate-600">No article image found.</p>}
        <p className="text-sm text-slate-300">{article.standfirst}</p>
        {article.socialEmbeds?.length ? (
          <div className="space-y-2 rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Social embeds stripped from body</p>
            {article.socialEmbeds.map((embed) => (
              <div key={embed.id} className="text-xs text-slate-300">
                <p className="font-semibold text-white">{embed.marker} · {embed.provider}{embed.handle ? ` · ${embed.handle}` : ""}</p>
                <p className="mt-1 whitespace-pre-wrap">{embed.originalText || "No visible embed text"}</p>
                {embed.url ? <p className="mt-1 truncate text-slate-500">{embed.url}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
        <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-slate-400">{article.body}</div>
      </div>
    </details>
  );
}

function GlossaryPanel({ glossary, onSave, busy }: { glossary: GlossaryEntry[]; onSave: (entry: Partial<GlossaryEntry>) => void; busy: boolean }) {
  const [entry, setEntry] = useState<Partial<GlossaryEntry>>({ brand: "PlanetF1", protected: true });
  return <Panel title="Glossary" className="space-y-4 p-5"><h2 className="text-xl font-bold text-white">Glossary and protected terms</h2><div className="grid gap-3 md:grid-cols-5"><input className={inputClass} placeholder="Brand" value={entry.brand ?? ""} onChange={(e) => setEntry({ ...entry, brand: e.target.value })} /><input className={inputClass} placeholder="Source term" value={entry.sourceTerm ?? ""} onChange={(e) => setEntry({ ...entry, sourceTerm: e.target.value })} /><select className={inputClass} value={entry.targetLanguage ?? ""} onChange={(e) => setEntry({ ...entry, targetLanguage: e.target.value as LanguageCode })}><option value="">Any language</option>{targetOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><input className={inputClass} placeholder="Target term" value={entry.targetTerm ?? ""} onChange={(e) => setEntry({ ...entry, targetTerm: e.target.value })} /><label className="mt-3 flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={Boolean(entry.protected)} onChange={(e) => setEntry({ ...entry, protected: e.target.checked })} />Protected</label></div><R365Button type="button" onClick={() => onSave(entry)} disabled={busy}>Save glossary entry</R365Button><div className="grid gap-2 md:grid-cols-2">{glossary.map((row) => <div key={row.id} className="rounded-lg border border-[#1f2d26] p-3 text-sm text-slate-300"><strong className="text-white">{row.sourceTerm}</strong>{row.targetTerm ? ` → ${row.targetTerm}` : ""}<p className="text-xs text-slate-500">{row.brand} · {row.protected ? "protected" : "mapping"}</p></div>)}</div></Panel>;
}

function SourceBrandsPanel({
  sourceBrands,
  onSave,
  busy,
}: {
  sourceBrands: SourceBrandRow[];
  onSave: (source: Partial<SourceBrandRow>) => void;
  busy: boolean;
}) {
  const [source, setSource] = useState<Partial<SourceBrandRow>>({
    name: "",
    feedUrl: "",
    sourceLanguage: "en",
    parserType: "wordpress-rss",
    active: true,
  });

  return (
    <Panel title="Source Brands" className="space-y-4 p-5">
      <div>
        <h2 className="text-xl font-bold text-white">Source Brands and Feed Parsers</h2>
        <p className="mt-1 text-sm text-slate-400">
          Add partner feeds here, then choose them from the Imports tab. Use the default RSS parser for WordPress-style feeds, and mark custom sources for a future test-parse workflow.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <input className={inputClass} placeholder="Brand name" value={source.name ?? ""} onChange={(e) => setSource({ ...source, name: e.target.value })} />
        <select className={inputClass} value={source.sourceLanguage ?? "en"} onChange={(e) => setSource({ ...source, sourceLanguage: e.target.value as LanguageCode })}>
          {Object.entries(LANGUAGE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <select className={inputClass} value={source.parserType ?? "wordpress-rss"} onChange={(e) => setSource({ ...source, parserType: e.target.value as LanguageSourceParserType })}>
          <option value="wordpress-rss">WordPress RSS / partner feed</option>
          <option value="rss-default">Default RSS</option>
          <option value="json-api">JSON API</option>
          <option value="html-page">HTML page</option>
          <option value="custom">Custom parser needed</option>
        </select>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={source.active ?? true} onChange={(e) => setSource({ ...source, active: e.target.checked })} />
          Active
        </label>
        <R365Button type="button" onClick={() => onSave(source)} disabled={busy}>Save source</R365Button>
      </div>
      <input className={inputClass} placeholder="Feed URL" value={source.feedUrl ?? ""} onChange={(e) => setSource({ ...source, feedUrl: e.target.value })} />
      <textarea className={textareaClass} placeholder="Notes, parser hints, source caveats" value={source.notes ?? ""} onChange={(e) => setSource({ ...source, notes: e.target.value })} />
      <div className="grid gap-2 md:grid-cols-2">
        {sourceBrands.map((row) => (
          <div key={row.id} className="rounded-lg border border-[#1f2d26] p-3 text-sm text-slate-300">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="text-white">{row.name}</strong>
                <p className="mt-1 truncate text-xs text-slate-500">{row.feedUrl}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {LANGUAGE_LABELS[row.sourceLanguage]} · {row.parserType} · {row.active ? "active" : "inactive"}
                </p>
                {row.notes ? <p className="mt-2 text-xs text-slate-400">{row.notes}</p> : null}
              </div>
              <button type="button" className="text-xs text-[#22c55e]" onClick={() => setSource(row)}>
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RulesPanel({ rules, onSave, busy }: { rules: Rule[]; onSave: (rule: Partial<Rule>) => void; busy: boolean }) {
  const [rule, setRule] = useState<Partial<Rule>>({ brand: "PlanetF1" });
  return <Panel title="Settings" className="space-y-4 p-5"><h2 className="text-xl font-bold text-white">Language rules and style profiles</h2><div className="grid gap-3 md:grid-cols-3"><input className={inputClass} placeholder="Brand" value={rule.brand ?? ""} onChange={(e) => setRule({ ...rule, brand: e.target.value })} /><select className={inputClass} value={rule.targetLanguage ?? ""} onChange={(e) => setRule({ ...rule, targetLanguage: e.target.value as LanguageCode })}><option value="">Any language</option>{targetOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><input className={inputClass} placeholder="Rule title" value={rule.title ?? ""} onChange={(e) => setRule({ ...rule, title: e.target.value })} /></div><textarea className={textareaClass} placeholder="Editorial tone, SEO, compliance or market rule" value={rule.rule ?? ""} onChange={(e) => setRule({ ...rule, rule: e.target.value })} /><R365Button type="button" onClick={() => onSave(rule)} disabled={busy}>Save rule</R365Button><div className="grid gap-2 md:grid-cols-2">{rules.map((row) => <div key={row.id} className="rounded-lg border border-[#1f2d26] p-3 text-sm text-slate-300"><strong className="text-white">{row.title}</strong><p className="mt-1">{row.rule}</p><p className="text-xs text-slate-500">{row.brand} · {row.targetLanguage || "all languages"}</p></div>)}</div></Panel>;
}

function csv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function ClientAccessPanel({
  clients,
  apiKeys,
  accessLogs,
  rawApiKey,
  onSaveClient,
  onDeleteClient,
  onCreateKey,
  onRevokeKey,
  busy,
}: {
  clients: ClientRow[];
  apiKeys: ClientApiKeyRow[];
  accessLogs: ClientAccessLogRow[];
  rawApiKey: string | null;
  onSaveClient: (client: Partial<ClientRow>) => void;
  onDeleteClient: (id: string) => void;
  onCreateKey: (apiKey: Partial<ClientApiKeyRow>) => void;
  onRevokeKey: (id: string) => void;
  busy: boolean;
}) {
  const [client, setClient] = useState<Partial<ClientRow>>({
    name: "",
    active: true,
    allowedBrands: ["PlanetF1"],
    allowedLanguages: ["es"],
    allowedFormats: ["xml", "json"],
  });
  const [keyDraft, setKeyDraft] = useState<Partial<ClientApiKeyRow>>({
    label: "Client feed key",
    allowedBrands: ["PlanetF1"],
    allowedLanguages: ["es"],
    allowedFormats: ["xml", "json"],
  });
  const selectedClient = clients.find((row) => row.id === keyDraft.clientId) ?? clients[0];
  const jsonUrl = `/api/client-api/translations?key=${rawApiKey || "CLIENT_KEY"}`;
  const xmlUrl = `/api/client-feeds/translations.xml?key=${rawApiKey || "CLIENT_KEY"}`;

  return (
    <Panel title="Client Access" className="space-y-5 p-5">
      <div>
        <h2 className="text-xl font-bold text-white">Client Login and Feed/API Access</h2>
        <p className="mt-1 text-sm text-slate-400">
          Create a client, issue a key, then provide XML or JSON access to approved translations only.
        </p>
      </div>

      {rawApiKey ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          <p className="font-bold">New API key - copy now</p>
          <code className="mt-2 block break-all rounded bg-black/40 p-2 text-xs">{rawApiKey}</code>
          <p className="mt-2 text-xs">JSON: <code>{jsonUrl}</code></p>
          <p className="mt-1 text-xs">XML: <code>{xmlUrl}</code></p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-[#1f2d26] p-4">
          <h3 className="font-bold text-white">Create / update client</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className={inputClass} placeholder="Client name" value={client.name ?? ""} onChange={(e) => setClient({ ...client, name: e.target.value })} />
            <input className={inputClass} placeholder="Contact email" value={client.contactEmail ?? ""} onChange={(e) => setClient({ ...client, contactEmail: e.target.value })} />
            <input className={inputClass} placeholder="Allowed brands, comma-separated" value={(client.allowedBrands ?? []).join(", ")} onChange={(e) => setClient({ ...client, allowedBrands: csv(e.target.value) })} />
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={client.active ?? true} onChange={(e) => setClient({ ...client, active: e.target.checked })} />Active</label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300 md:grid-cols-4">
            {targetOptions.map(([code, label]) => (
              <label key={code} className="flex items-center gap-2">
                <input type="checkbox" checked={(client.allowedLanguages ?? []).includes(code)} onChange={(e) => setClient({ ...client, allowedLanguages: e.target.checked ? [...(client.allowedLanguages ?? []), code] : (client.allowedLanguages ?? []).filter((row) => row !== code) })} />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-sm text-slate-300">
            {(["xml", "json"] as const).map((format) => (
              <label key={format} className="flex items-center gap-2">
                <input type="checkbox" checked={(client.allowedFormats ?? []).includes(format)} onChange={(e) => setClient({ ...client, allowedFormats: e.target.checked ? [...(client.allowedFormats ?? []), format] : (client.allowedFormats ?? []).filter((row) => row !== format) })} />
                {format.toUpperCase()}
              </label>
            ))}
          </div>
          <textarea className={textareaClass} placeholder="Client notes" value={client.notes ?? ""} onChange={(e) => setClient({ ...client, notes: e.target.value })} />
          <R365Button type="button" onClick={() => onSaveClient(client)} disabled={busy}>Save client</R365Button>
        </div>

        <div className="rounded-lg border border-[#1f2d26] p-4">
          <h3 className="font-bold text-white">Issue API key</h3>
          <select className={inputClass} value={keyDraft.clientId ?? selectedClient?.id ?? ""} onChange={(e) => setKeyDraft({ ...keyDraft, clientId: e.target.value })}>
            {clients.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <input className={inputClass} placeholder="Key label" value={keyDraft.label ?? ""} onChange={(e) => setKeyDraft({ ...keyDraft, label: e.target.value })} />
          <input className={inputClass} placeholder="Allowed brands, comma-separated" value={(keyDraft.allowedBrands ?? []).join(", ")} onChange={(e) => setKeyDraft({ ...keyDraft, allowedBrands: csv(e.target.value) })} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300 md:grid-cols-4">
            {targetOptions.map(([code, label]) => (
              <label key={code} className="flex items-center gap-2">
                <input type="checkbox" checked={(keyDraft.allowedLanguages ?? []).includes(code)} onChange={(e) => setKeyDraft({ ...keyDraft, allowedLanguages: e.target.checked ? [...(keyDraft.allowedLanguages ?? []), code] : (keyDraft.allowedLanguages ?? []).filter((row) => row !== code) })} />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-sm text-slate-300">
            {(["xml", "json"] as const).map((format) => (
              <label key={format} className="flex items-center gap-2">
                <input type="checkbox" checked={(keyDraft.allowedFormats ?? []).includes(format)} onChange={(e) => setKeyDraft({ ...keyDraft, allowedFormats: e.target.checked ? [...(keyDraft.allowedFormats ?? []), format] : (keyDraft.allowedFormats ?? []).filter((row) => row !== format) })} />
                {format.toUpperCase()}
              </label>
            ))}
          </div>
          <R365Button type="button" onClick={() => onCreateKey({ ...keyDraft, clientId: keyDraft.clientId ?? selectedClient?.id })} disabled={busy || clients.length === 0}>Create API key</R365Button>
        </div>
      </div>

      <div className="rounded-lg border border-[#1f2d26] p-4">
        <h3 className="font-bold text-white">Client and API documentation</h3>
        <p className="mt-1 text-sm text-slate-400">
          Share these Markdown documents with clients or internal teams. Use Open to preview, Download to save a copy.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {clientDocs.map((doc) => (
            <div key={doc.slug} className="rounded-lg border border-[#1f2d26] bg-black/20 p-3">
              <p className="font-semibold text-white">{doc.title}</p>
              <p className="mt-1 text-xs text-slate-500">{doc.description}</p>
              <p className="mt-2 flex gap-3 text-xs">
                <a className="text-[#22c55e] hover:underline" href={`/api/docs/${doc.slug}`} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
                <a className="text-[#22c55e] hover:underline" href={`/api/docs/${doc.slug}?download=1`}>
                  Download
                </a>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-[#1f2d26] p-4">
          <h3 className="font-bold text-white">Clients</h3>
          <div className="mt-3 space-y-2">
            {clients.length === 0 ? <p className="text-sm text-slate-500">No clients yet.</p> : clients.map((row) => (
              <div key={row.id} className="rounded border border-[#1f2d26] p-3 text-sm text-slate-300">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <strong className="text-white">{row.name}</strong>
                    <p className="text-xs text-slate-500">{row.active ? "Active" : "Inactive"} · {row.allowedBrands.join(", ") || "all brands"} · {row.allowedLanguages.join(", ") || "all languages"}</p>
                    {row.contactEmail ? <p className="mt-1 text-xs text-slate-500">{row.contactEmail}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="text-xs text-[#22c55e]" onClick={() => setClient(row)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-300"
                      onClick={() => {
                        if (window.confirm(`Delete client "${row.name}" and its API keys?`)) onDeleteClient(row.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#1f2d26] p-4">
          <h3 className="font-bold text-white">API keys</h3>
          <div className="mt-3 space-y-2">
            {apiKeys.length === 0 ? <p className="text-sm text-slate-500">No API keys yet.</p> : apiKeys.map((row) => (
              <div key={row.id} className="rounded border border-[#1f2d26] p-3 text-sm text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-white">{row.label}</strong>
                  {row.active && !row.revokedAt ? <button type="button" className="text-xs text-red-300" onClick={() => onRevokeKey(row.id)}>Revoke</button> : <span className="text-xs text-red-300">Revoked</span>}
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">{row.maskedKey}</p>
                <p className="mt-1 text-xs text-slate-500">{row.allowedFormats.join(", ").toUpperCase()} · {row.allowedLanguages.join(", ") || "all languages"} · Last used {formatArticleDate(row.lastUsedAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#1f2d26] p-4">
        <h3 className="font-bold text-white">Recent access</h3>
        <div className="mt-3 space-y-2">
          {accessLogs.length === 0 ? <p className="text-sm text-slate-500">No client requests yet.</p> : accessLogs.slice(0, 10).map((row) => (
            <p key={row.id} className="rounded border border-[#1f2d26] p-2 text-xs text-slate-400">
              {formatArticleDate(row.createdAt)} · {row.format.toUpperCase()} · {row.status} · {row.detail || "request"}
            </p>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ExportsPanel({ exportsRows }: { exportsRows: ExportRow[] }) {
  return <Panel title="Export Feeds" className="space-y-4 p-5"><h2 className="text-xl font-bold text-white">Export Feeds</h2>{exportsRows.length === 0 ? <p className="text-sm text-slate-500">No exports yet.</p> : exportsRows.map((row) => <details key={row.id} className="rounded-lg border border-[#1f2d26] p-3"><summary className="cursor-pointer text-sm font-semibold text-white">{row.format.toUpperCase()} · {LANGUAGE_LABELS[row.targetLanguage]} · {new Date(row.createdAt).toLocaleString()}</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-3 text-xs text-slate-300">{row.payload}</pre></details>)}</Panel>;
}
