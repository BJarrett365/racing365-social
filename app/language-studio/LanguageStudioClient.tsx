"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { GovernancePanel } from "@/app/language-studio/GovernancePanels";
import { QualityGuardrailsPanel } from "@/app/language-studio/QualityGuardrailsPanel";
import { withAppPathPrefix } from "@/app/lib/app-base-path";
import { stripArticleMetadataLines } from "@/app/lib/language-studio/article-pages";
import { mergeUniqueTagsFromCommaSeparated, uniqueTags } from "@/app/lib/language-studio/tags";
import { LANGUAGE_LABELS, LANGUAGE_SPORT_CONTEXTS, type LanguageCode, type LanguageContentStyle, type LanguageProviderMode, type LanguageSourceParserType, type LanguageSportContext, type LanguageTranslation as StoredLanguageTranslation, type TranslationMode } from "@/app/lib/language-studio/types";

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
  sport?: LanguageSportContext;
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
  clientIds?: string[];
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
  status: "draft" | "review_needed" | "approved" | "rejected" | "exported" | "failed";
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
  allowedSports: LanguageSportContext[];
  allowedFormats: Array<"xml" | "json">;
  notes?: string;
  /** Preserved when editing so POST can keep the same client record. */
  createdAt?: string;
  updatedAt?: string;
};

type ClientApiKeyRow = {
  id: string;
  clientId: string;
  label: string;
  maskedKey: string;
  active: boolean;
  allowedBrands: string[];
  allowedLanguages: LanguageCode[];
  allowedSports: LanguageSportContext[];
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
  defaultSport?: LanguageSportContext;
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

const primaryTabs = ["Dashboard", "Imports", "Rewrite", "Translations", "Review Queue", "Published", "Automated"] as const;
const secondaryTabs = ["Source Brands", "Journalists", "Guardrails", "Knowledge Files", "Glossary", "Protected Terms", "Market Rules", "Prompt Rules", "Compliance Notes", "Quality Checks", "Export Feeds", "Client Access", "Settings"] as const;
type LanguageStudioTab = (typeof primaryTabs)[number] | (typeof secondaryTabs)[number];
const allLanguageStudioTabs = [...primaryTabs, ...secondaryTabs] as readonly string[];
function tabLabel(tab: LanguageStudioTab): string {
  if (tab === "Journalists") return "Content Creators";
  if (tab === "Imports") return "Import";
  return tab;
}

const IMPORT_PARSER_OPTIONS: { value: LanguageSourceParserType; label: string }[] = [
  { value: "rss-default", label: "RSS / XML default" },
  { value: "xml", label: "XML feed" },
  { value: "wordpress-rss", label: "WordPress RSS" },
  { value: "json-api", label: "JSON API" },
  { value: "html-page", label: "URL / HTML page" },
  { value: "custom", label: "Custom" },
];
const inputClass = "mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)] shadow-sm placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:cursor-not-allowed disabled:bg-[color:var(--surface-muted)] disabled:text-[color:var(--text-muted)]";
const textareaClass = `${inputClass} min-h-28 font-mono text-xs`;
const miniButtonClass = "inline-flex items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-bold text-[color:var(--text-secondary)] shadow-sm transition hover:border-[color:var(--accent)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:border-[color:var(--border)] disabled:bg-[color:var(--surface-muted)] disabled:text-[color:var(--text-muted)] disabled:opacity-70";
const dangerMiniButtonClass = "inline-flex items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-700 shadow-sm transition hover:border-red-500 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-200";
const amberButtonClass = "inline-flex items-center justify-center rounded-xl border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-800 shadow-sm transition hover:border-amber-500 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-100";
const targetOptions = Object.entries(LANGUAGE_LABELS).filter(([code]) => code !== "en") as Array<[LanguageCode, string]>;
const clientLanguageOptions = Object.entries(LANGUAGE_LABELS) as Array<[LanguageCode, string]>;
const contentStyleOptions: LanguageContentStyle[] = ["News", "Transfer", "Opinion", "Preview", "Review", "Analysis", "Feature", "Live", "Tips"];
const sportContextOptions = LANGUAGE_SPORT_CONTEXTS;
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
  { slug: "install", title: "Planet Sport Studio Install Guide", description: "Local install, admin setup and generated files." },
  { slug: "environment", title: "Environment Variables", description: "OpenAI, DeepL, cron, admin and runtime settings." },
  { slug: "deployment", title: "Deployment Guide", description: "Production build, Vercel cron and storage notes." },
  { slug: "troubleshooting", title: "Troubleshooting", description: "Common import, image, translation, cron and API issues." },
];

function ArticleSportTagEditor({
  article,
  busy,
  onSave,
}: {
  article?: Article;
  busy: boolean;
  onSave: (sport: LanguageSportContext | "") => void;
}) {
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(article?.sport ?? "");
  }, [article?.id, article?.sport]);
  if (!article) return null;
  const unchanged = (value || "") === (article.sport ?? "");
  return (
    <div className="rounded-lg border border-[#1f2d26] bg-black/10 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">Article sport tag</p>
      <p className="mt-1 text-xs text-slate-500">Client XML/API feeds and automations use this (e.g. Racing365 → Horse Racing only).</p>
      <select className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} disabled={busy}>
        <option value="">Not set</option>
        {sportContextOptions.map((sport) => (
          <option key={sport} value={sport}>{sport}</option>
        ))}
      </select>
      <div className="mt-2">
        <R365Button type="button" disabled={busy || unchanged} onClick={() => onSave(value === "" ? "" : (value as LanguageSportContext))}>
          Save sport tag
        </R365Button>
      </div>
    </div>
  );
}

function ManualStringTagsEditor({
  label,
  description,
  tags,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const addDraft = () => {
    const next = mergeUniqueTagsFromCommaSeparated(tags, draft);
    if (next.length === tags.length && draft.trim()) return;
    onChange(next);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span key={`${tag}-${index}`} className="inline-flex items-center gap-1 rounded-full border border-[#1f2d26] bg-black/30 px-2 py-1 text-xs text-slate-200">
            {tag}
            <button
              type="button"
              className="rounded-full px-1 text-slate-500 hover:text-white"
              disabled={disabled}
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(tags.filter((t) => t.trim().toLowerCase() !== tag.trim().toLowerCase()))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <input
          className={`${inputClass} min-w-[12rem] flex-1`}
          placeholder="Type a tag or comma-separated list"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
        />
        <button type="button" className={miniButtonClass} disabled={disabled || !draft.trim()} onClick={() => addDraft()}>
          Add
        </button>
      </div>
      <p className="text-[11px] text-slate-600">Duplicates (ignoring case) are ignored. Press Enter or Add.</p>
    </div>
  );
}

function ArticleTagsEditor({
  article,
  busy,
  onSave,
}: {
  article?: Article;
  busy: boolean;
  onSave: (tags: string[]) => void;
}) {
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => {
    setTags(article?.tags ? uniqueTags(article.tags) : []);
  }, [article?.id, JSON.stringify(article?.tags ?? [])]);
  if (!article) return null;
  const baseline = uniqueTags(article.tags);
  const unchanged = JSON.stringify(tags) === JSON.stringify(baseline);
  return (
    <div className="rounded-lg border border-[#1f2d26] bg-black/10 p-3">
      <ManualStringTagsEditor
        label="Article tags"
        description="Manual tags on the source article (e.g. topics, series). Save when done."
        tags={tags}
        onChange={setTags}
        disabled={busy}
      />
      <div className="mt-2">
        <R365Button type="button" disabled={busy || unchanged} onClick={() => onSave(tags)}>
          Save article tags
        </R365Button>
      </div>
    </div>
  );
}

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
    tags: uniqueTags(article.tags.map(decodeHtmlEntities)),
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
    tags: uniqueTags(row.tags.map(decodeHtmlEntities)),
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
      hashtags: post.hashtags ? uniqueTags(post.hashtags.map(decodeHtmlEntities)) : post.hashtags,
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

/** Source articles that have finished the pipeline — listed under Published, not Rewrite/Translations. */
function isStoredPipelineArticleStatus(status: string): boolean {
  return status === "approved" || status === "translated" || status === "exported" || status === "archived";
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
  const [selectedRewriteClientIds, setSelectedRewriteClientIds] = useState<string[]>([]);
  const [newRewriteClientName, setNewRewriteClientName] = useState("");
  const [approvalBlocked, setApprovalBlocked] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboardDay, setDashboardDay] = useState(todayInputValue);
  const [dashboardMonth, setDashboardMonth] = useState(monthInputValue);
  const [pipelineSinceDate, setPipelineSinceDate] = useState("");
  const [publishedCalendarDay, setPublishedCalendarDay] = useState(todayInputValue);
  const [importMaxArticles, setImportMaxArticles] = useState("");
  const [importIncrementalSince, setImportIncrementalSince] = useState("");
  const [importParserType, setImportParserType] = useState<LanguageSourceParserType>("rss-default");

  const [sourceUrl, setSourceUrl] = useState("https://www.planetf1.com/partner-media-content-feed");
  const [xml, setXml] = useState("");
  const [processImages, setProcessImages] = useState(true);
  const [importFullArticles, setImportFullArticles] = useState(true);
  const [sourceBrand, setSourceBrand] = useState("PlanetF1");
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode>("en");
  const [targetLanguages, setTargetLanguages] = useState<LanguageCode[]>(["es"]);
  const [providerMode, setProviderMode] = useState<LanguageProviderMode>("openai");
  const [translationMode, setTranslationMode] = useState<TranslationMode>("translate-localise");
  const [rewriteStyle, setRewriteStyle] = useState("Original editorial rewrite for Google: fresh structure, sharp intro, natural expert sports tone, no synonym spinning. Remove internal links to the source site (nav hubs, tips indexes, racecards, homepages); keep only essential external factual links.");
  const [contentStyle, setContentStyle] = useState<LanguageContentStyle>("News");
  const [sportContext, setSportContext] = useState<LanguageSportContext>("Formula 1");
  const [journalistStyle, setJournalistStyle] = useState("");
  const [selectedJournalistProfileId, setSelectedJournalistProfileId] = useState("");
  const [editorialGuidelines, setEditorialGuidelines] = useState("Preserve quotes exactly in meaning and quote boundaries. Do not add facts, claims, results or opinion. Keep names, teams, numbers, dates and locations unchanged.");
  const [imageChangeUrl, setImageChangeUrl] = useState("");
  const [imageGenerationPrompt, setImageGenerationPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [processingOverlay, setProcessingOverlay] = useState(false);
  const [busyCaption, setBusyCaption] = useState<string | null>(null);
  const [processingElapsedSec, setProcessingElapsedSec] = useState(0);

  useEffect(() => {
    if (!busy || !processingOverlay) {
      setProcessingElapsedSec(0);
      return;
    }
    const started = Date.now();
    setProcessingElapsedSec(0);
    const id = window.setInterval(() => {
      setProcessingElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [busy, processingOverlay]);

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

  const articlesForPipeline = useMemo(() => {
    if (!pipelineSinceDate) return articles;
    return articles.filter((article) => {
      const day = dateInputValue(article.publishDate || article.createdAt || article.updatedAt || "");
      return day >= pipelineSinceDate;
    });
  }, [articles, pipelineSinceDate]);

  const articlesForActivePipeline = useMemo(
    () => articlesForPipeline.filter((article) => !isStoredPipelineArticleStatus(article.status)),
    [articlesForPipeline],
  );

  const selectedArticle = useMemo(
    () => articles.find((article) => article.id === selectedArticleId) ?? articlesForActivePipeline[0] ?? articles[0],
    [articles, articlesForActivePipeline, selectedArticleId],
  );
  const translationArticleIds = articleSelectionMode === "all"
    ? articlesForActivePipeline.map((article) => article.id)
    : selectedArticleIds.length > 0
      ? selectedArticleIds
      : selectedArticle
        ? [selectedArticle.id]
        : [];
  const selectedTranslation = useMemo(
    () => translations.find((translation) => translation.id === selectedTranslationId) ?? translations[0],
    [translations, selectedTranslationId],
  );
  const activeClients = useMemo(() => clients.filter((client) => client.active), [clients]);
  const originalForTranslation = selectedTranslation
    ? articles.find((article) => article.id === selectedTranslation.articleId)
    : selectedArticle;
  const publishedOnDay = useMemo(() => {
    return translations.filter((row) => {
      if (row.status !== "approved" && row.status !== "exported") return false;
      const day = dateInputValue(row.approvedAt ?? row.updatedAt ?? row.createdAt);
      return day === publishedCalendarDay;
    });
  }, [translations, publishedCalendarDay]);

  const publishedRewritesOnDay = useMemo(
    () => publishedOnDay.filter((row) => row.id.startsWith("lrewrite-")),
    [publishedOnDay],
  );
  const publishedTranslatedOnDay = useMemo(
    () => publishedOnDay.filter((row) => !row.id.startsWith("lrewrite-")),
    [publishedOnDay],
  );

  const storedArticlesOnDay = useMemo(() => {
    return articles
      .filter((a) => isStoredPipelineArticleStatus(a.status))
      .filter((a) => dateInputValue(a.updatedAt ?? a.publishDate ?? a.createdAt ?? "") === publishedCalendarDay)
      .sort((a, b) => {
        const bTime = Date.parse(b.publishDate || b.updatedAt || b.createdAt || "");
        const aTime = Date.parse(a.publishDate || a.updatedAt || a.createdAt || "");
        if (Number.isFinite(bTime) && Number.isFinite(aTime) && bTime !== aTime) return bTime - aTime;
        return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
      });
  }, [articles, publishedCalendarDay]);

  const primaryTabCounts: Partial<Record<LanguageStudioTab, number>> = {
    Rewrite: articlesForActivePipeline.length,
    Translations: articlesForActivePipeline.length,
    "Review Queue": translations.filter((translation) => translation.status !== "approved" && translation.status !== "exported").length,
    Published: publishedOnDay.length + storedArticlesOnDay.length,
  };
  const dashboardCounts = useMemo(() => {
    const articleDayRows = articles.filter((article) => dateInputValue(article.createdAt ?? article.updatedAt ?? article.publishDate) === dashboardDay);
    const articleMonthRows = articles.filter((article) => monthValue(article.createdAt ?? article.updatedAt ?? article.publishDate) === dashboardMonth);
    const translationDayRows = translations.filter((row) => dateInputValue(row.createdAt ?? row.updatedAt) === dashboardDay);
    const translationMonthRows = translations.filter((row) => monthValue(row.createdAt ?? row.updatedAt) === dashboardMonth);
    const approvedDayRows = translations.filter(
      (row) => (row.status === "approved" || row.status === "exported") && dateInputValue(row.approvedAt ?? row.updatedAt ?? row.createdAt) === dashboardDay,
    );
    const approvedMonthRows = translations.filter(
      (row) => (row.status === "approved" || row.status === "exported") && monthValue(row.approvedAt ?? row.updatedAt ?? row.createdAt) === dashboardMonth,
    );
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

  const loadAll = useCallback(async () => {
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
    setClients(
      (clientsData.clients ?? []).map((c: ClientRow) => ({
        ...c,
        allowedBrands: Array.isArray(c.allowedBrands) ? c.allowedBrands : [],
        allowedLanguages: Array.isArray(c.allowedLanguages) ? c.allowedLanguages : [],
        allowedSports: Array.isArray(c.allowedSports) ? c.allowedSports : [],
        allowedFormats: (Array.isArray(c.allowedFormats) && c.allowedFormats.length ? c.allowedFormats : ["xml", "json"]) as Array<"xml" | "json">,
      })),
    );
    setClientApiKeys(
      (clientsData.apiKeys ?? []).map((k: ClientApiKeyRow) => ({
        ...k,
        allowedBrands: Array.isArray(k.allowedBrands) ? k.allowedBrands : [],
        allowedLanguages: Array.isArray(k.allowedLanguages) ? k.allowedLanguages : [],
        allowedSports: Array.isArray(k.allowedSports) ? k.allowedSports : [],
      })),
    );
    setClientAccessLogs(clientsData.accessLogs ?? []);
    setJournalistProfiles(uniqueJournalistProfiles(governanceData.journalistProfiles ?? []));
    const loadedSourceBrands = sourceBrandsData.sourceBrands ?? [];
    setSourceBrands(loadedSourceBrands);
    const selectedSource = loadedSourceBrands.find((row: SourceBrandRow) => row.name === sourceBrand) ?? loadedSourceBrands[0];
    if (selectedSource) {
      setSourceBrand(selectedSource.name);
      setSourceUrl(selectedSource.feedUrl);
      setSourceLanguage(selectedSource.sourceLanguage);
      setImportParserType(selectedSource.parserType ?? "rss-default");
    }
  }, [sourceBrand]);

  useEffect(() => {
    void loadAll().catch((e) => setError(e instanceof Error ? e.message : "Failed to load Language Studio"));
  }, [loadAll]);

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (isLanguageStudioTab(tabParam)) setTab(tabParam);
  }, []);

  useEffect(() => {
    if (selectedRewriteClientIds.length || activeClients.length === 0) return;
    const racing365 = activeClients.find((client) => client.name.trim().toLowerCase() === "racing365");
    if (racing365) setSelectedRewriteClientIds([racing365.id]);
  }, [activeClients, selectedRewriteClientIds.length]);

  const run = async (
    fn: () => Promise<void>,
    options: { reload?: boolean; processingOverlay?: boolean; busyCaption?: string | null } = {},
  ) => {
    setBusy(true);
    setProcessingOverlay(Boolean(options.processingOverlay));
    setBusyCaption(options.busyCaption ?? null);
    setError(null);
    setMessage(null);
    try {
      await fn();
      if (options.reload !== false) await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
      setProcessingOverlay(false);
      setBusyCaption(null);
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
          parserType: importParserType,
          processImages,
          importFullArticles,
          maxArticles: (() => {
            const n = Number(importMaxArticles);
            return Number.isFinite(n) && n > 0 ? Math.min(500, Math.floor(n)) : undefined;
          })(),
          incrementalAfter: importIncrementalSince.trim() ? `${importIncrementalSince.trim()}T00:00:00.000Z` : undefined,
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
    }, { reload: false, processingOverlay: true, busyCaption: "Importing latest articles from the feed…" });

  const translateSelected = () =>
    run(async () => {
      if (translationArticleIds.length === 0) throw new Error("Select at least one article first.");
      const res = await fetch("/api/language/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleIds: translationArticleIds,
          clientIds: selectedRewriteClientIds,
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
    }, { reload: false, processingOverlay: true, busyCaption: "Running translations and AI passes…" });

  const rewriteSelected = () =>
    run(async () => {
      if (translationArticleIds.length === 0) throw new Error("Select at least one article first.");
      const res = await fetch("/api/language/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleIds: translationArticleIds,
          clientIds: selectedRewriteClientIds,
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
    }, { reload: false, processingOverlay: true, busyCaption: "Running rewrites…" });

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

  const saveArticleSportTag = (sport: LanguageSportContext | "") =>
    run(async () => {
      if (!selectedArticle) throw new Error("Select an article first.");
      const res = await fetch("/api/language/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: selectedArticle.id,
          sport: sport === "" ? null : sport,
        }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save sport tag.");
      const row = data.article as Article | undefined;
      if (row) {
        setArticles((rows) => rows.map((article) => (article.id === row.id ? normaliseArticle(row) : article)));
      }
      setMessage(sport ? `Sport tag set to ${sport}.` : "Sport tag cleared.");
    }, { reload: false });

  const saveArticleTags = (tags: string[]) =>
    run(async () => {
      if (!selectedArticle) throw new Error("Select an article first.");
      const res = await fetch("/api/language/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: selectedArticle.id,
          tags: uniqueTags(tags),
        }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save article tags.");
      const row = data.article as Article | undefined;
      if (row) {
        setArticles((rows) => rows.map((article) => (article.id === row.id ? normaliseArticle(row) : article)));
      }
      setMessage("Article tags saved.");
    }, { reload: false });

  const reopenStoredArticleToTab = (articleId: string, targetTab: "Rewrite" | "Translations") =>
    run(async () => {
      const res = await fetch("/api/language/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not return article to the pipeline.");
      const row = data.article as Article | undefined;
      if (row) {
        setArticles((rows) => rows.map((a) => (a.id === row.id ? normaliseArticle(row) : a)));
      }
      setPipelineSinceDate("");
      setSelectedArticleId(articleId);
      setSelectedArticleIds([articleId]);
      setArticleSelectionMode("selected");
      setTab(targetTab);
      setMessage("Article moved back to Rewrite / Translate as a fresh import.");
    }, { reload: false });

  const saveTranslation = () =>
    run(async () => {
      if (!selectedTranslation) throw new Error("Select a translation first.");
      const res = await fetch("/api/language/review/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selectedTranslation, tags: uniqueTags(selectedTranslation.tags) }),
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

  const toggleRewriteClient = (clientId: string, checked: boolean) => {
    setSelectedRewriteClientIds((ids) => checked
      ? [...new Set([...ids, clientId])]
      : ids.filter((id) => id !== clientId));
  };

  const createRewriteClient = () =>
    run(async () => {
      const name = newRewriteClientName.trim();
      if (!name) throw new Error("Enter a client name first.");
      const res = await fetch("/api/language/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          active: true,
          allowedBrands: [],
          allowedLanguages: [],
          allowedSports: [],
          allowedFormats: ["xml", "json"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Client save failed");
      if (data.client?.id) setSelectedRewriteClientIds((ids) => [...new Set([...ids, String(data.client.id)])]);
      setNewRewriteClientName("");
      setMessage(`${name} added as a client.`);
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

  const deleteSourceBrandById = (id: string) =>
    run(async () => {
      const res = await fetch("/api/language/source-brands", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feed delete failed");
      setMessage("Feed deleted.");
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
            {tabLabel(item)}
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
          Editorial workflow: import the latest feed, rewrite and translate new pipeline articles, manually review, publish rewrites and translations by day, then export. Configure scheduled imports and post-import AI under{" "}
          <button type="button" className="font-semibold text-[#22c55e] underline decoration-[#22c55e]/50 hover:text-white" onClick={() => setTab("Automated")}>
            Automated
          </button>
          .
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Workflow
        </p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>Import (latest)</span>
          <span className="text-slate-600" aria-hidden>→</span>
          <span>Rewrite (new)</span>
          <span className="text-slate-600" aria-hidden>→</span>
          <span>Translate (new)</span>
          <span className="text-slate-600" aria-hidden>→</span>
          <span>Review (manual)</span>
          <span className="text-slate-600" aria-hidden>→</span>
          <span>Published</span>
          <span className="text-slate-600" aria-hidden>→</span>
          <span>Automated (crons &amp; AI)</span>
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {primaryTabs.map((item) => {
          const count = primaryTabCounts[item];
          return (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${tab === item ? "border-[#22c55e] bg-[#22c55e]/15 text-white" : "border-[#1f2d26] text-slate-400"}`}
            >
              <span>{tabLabel(item)}</span>
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
          <Panel title="Import" className="space-y-4 p-5">
            <h2 className="text-xl font-bold text-white">Import articles (latest)</h2>
            <p className="text-sm text-slate-400">
              Pull the newest items from RSS, XML, a URL or pasted markup. Optional max-per-run and publish-date filters help you stay on the latest stories. For hands-off runs, use{" "}
              <button type="button" className="font-semibold text-[#22c55e] underline decoration-[#22c55e]/50 hover:text-white" onClick={() => setTab("Automated")}>
                Automated
              </button>{" "}
              to schedule feed imports.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
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
                      setImportParserType(selected.parserType ?? "rss-default");
                    }
                  }}
                >
                  {activeSourceBrands.map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}
                  {!activeSourceBrands.some((row) => row.name === sourceBrand) ? <option value={sourceBrand}>{sourceBrand}</option> : null}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Source language
                <select className={inputClass} value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value as LanguageCode)}>
                  {Object.entries(LANGUAGE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Import type
                <select
                  className={inputClass}
                  value={importParserType}
                  onChange={(e) => setImportParserType(e.target.value as LanguageSourceParserType)}
                >
                  {IMPORT_PARSER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 block text-xs font-semibold uppercase text-slate-500">
              Feed URL or page URL
              <input className={inputClass} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
            </label>
            <p className="mt-2 text-xs text-slate-500">
              Import type decides how the URL or pasted XML is interpreted (RSS, XML, WordPress, JSON API, HTML page crawl, or custom). Choosing a source brand loads its defaults; you can override before importing. Add or edit feeds in{" "}
              <strong className="font-semibold text-slate-300">Saved feeds</strong> below (or under Source Brands in admin).
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
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Max articles this run
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  max={500}
                  placeholder="Empty = no limit"
                  value={importMaxArticles}
                  onChange={(e) => setImportMaxArticles(e.target.value.replace(/[^\d]/g, ""))}
                />
                <span className="mt-1 block font-normal text-slate-500">Newest feed items first; caps cost on large RSS files.</span>
              </label>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Only items published on or after
                <input className={inputClass} type="date" value={importIncrementalSince} onChange={(e) => setImportIncrementalSince(e.target.value)} />
                <span className="mt-1 block font-normal text-slate-500">Uses feed publish dates; leave empty to import the whole feed (subject to max).</span>
              </label>
            </div>
            <R365Button type="button" onClick={() => void importFeed()} disabled={busy}>{busy ? "Importing..." : "Import feed"}</R365Button>
          </Panel>
          <Panel title="Saved feeds" className="space-y-4 p-5">
            <SavedFeedsEditor
              sourceBrands={sourceBrands}
              onSave={saveSourceBrand}
              onDelete={deleteSourceBrandById}
              busy={busy}
              intro="Add, edit or remove partner feeds. Changes apply everywhere you pick a source brand (imports, crons, automations)."
            />
          </Panel>
          {adminPanel}
        </div>
      ) : null}

      {tab === "Translations" ? (
        <div className="space-y-4">
          <Panel title="Translations" className="space-y-4 p-5">
            <h2 className="text-xl font-bold text-white">Translation Queue</h2>
            <p className="text-sm text-slate-400">
              Only <span className="font-semibold text-slate-200">imported new articles</span> that are still in the pipeline and available for translation (not finished items in{" "}
              <button type="button" className="font-semibold text-[#22c55e] underline decoration-[#22c55e]/50 hover:text-white" onClick={() => setTab("Published")}>
                Published
              </button>
              ).
            </p>
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[#1f2d26] bg-black/20 p-3">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Show source articles from day ≥
                <input className={inputClass} type="date" value={pipelineSinceDate} onChange={(e) => setPipelineSinceDate(e.target.value)} />
              </label>
              <button type="button" className="rounded-lg border border-[#1f2d26] px-3 py-2 text-sm text-slate-300" onClick={() => setPipelineSinceDate("")}>
                All dates
              </button>
              <p className="text-xs text-slate-500">Matches publish date when set, otherwise import date. Applies to the list and &quot;all listed articles&quot; runs.</p>
            </div>
            {articlesForActivePipeline.length === 0 ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                No pipeline articles match this filter. Clear the date filter, import new items, or open{" "}
                <button type="button" className="font-semibold text-white underline" onClick={() => setTab("Published")}>Published</button>{" "}
                to send a stored article back here.
              </p>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <ArticleList
              articles={articlesForActivePipeline}
              selectedId={selectedArticle?.id ?? ""}
              selectedIds={selectedArticleIds}
              onSelect={setSelectedArticleId}
              onToggle={(id) => setSelectedArticleIds((rows) => rows.includes(id) ? rows.filter((row) => row !== id) : [...rows, id])}
            />
            <div className="space-y-3">
              <ArticleSportTagEditor article={selectedArticle} busy={busy} onSave={saveArticleSportTag} />
              <ArticleTagsEditor article={selectedArticle} busy={busy} onSave={saveArticleTags} />
              <div className="rounded-lg border border-[#1f2d26] p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Articles to translate</p>
                <div className="mt-2 space-y-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={articleSelectionMode === "selected"} onChange={() => setArticleSelectionMode("selected")} />
                    Selected articles ({translationArticleIds.length})
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={articleSelectionMode === "all"} onChange={() => setArticleSelectionMode("all")} />
                    All listed articles ({articlesForActivePipeline.length})
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={miniButtonClass} onClick={() => setSelectedArticleIds(articlesForActivePipeline.map((article) => article.id))}>Select all</button>
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
                Use Content Creator Profile
                <select className={inputClass} value={selectedJournalistProfileId} onChange={(e) => applyJournalistProfile(e.target.value)}>
                  <option value="">Manual creator style</option>
                  {activeJournalistProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {profile.brand}{profile.sports.length ? ` · ${profile.sports.join(", ")}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Creator Style
                <textarea className={textareaClass} value={journalistStyle} onChange={(e) => setJournalistStyle(e.target.value)} />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Article / Editorial Guidelines
                <textarea className={textareaClass} value={editorialGuidelines} onChange={(e) => setEditorialGuidelines(e.target.value)} />
              </label>
              <label className="text-xs font-semibold uppercase text-slate-500">Provider mode<select className={inputClass} value={providerMode} onChange={(e) => setProviderMode(e.target.value as LanguageProviderMode)}><option value="openai">OpenAI only</option><option value="deepl">DeepL only</option><option value="deepl-openai">DeepL + OpenAI localisation</option></select></label>
              <label className="text-xs font-semibold uppercase text-slate-500">Translation mode<select className={inputClass} value={translationMode} onChange={(e) => setTranslationMode(e.target.value as TranslationMode)}><option value="translate-only">Translate only</option><option value="translate-localise">Translate + localise</option><option value="translate-rewrite">Translate and rewrite</option><option value="headline-only">Regenerate headline only</option><option value="seo-only">Regenerate SEO only</option><option value="summary-only">Regenerate summary only</option></select></label>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Client content</p>
                    <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                      Select one or more clients. Approved translations will appear in those clients&apos; XML/API feeds.
                    </p>
                  </div>
                  {selectedRewriteClientIds.length ? (
                    <span className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-black text-[color:var(--accent-foreground)]">
                      {selectedRewriteClientIds.length} selected
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {activeClients.map((client) => (
                    <label key={client.id} className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={selectedRewriteClientIds.includes(client.id)}
                        onChange={(e) => toggleRewriteClient(client.id, e.target.checked)}
                      />
                      {client.name}
                    </label>
                  ))}
                </div>
                {activeClients.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-[color:var(--surface-muted)] p-3 text-sm text-[color:var(--text-secondary)]">
                    No clients yet. Add Racing365 or another client below.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    className={inputClass}
                    placeholder="Add a client, e.g. Racing365"
                    value={newRewriteClientName}
                    onChange={(e) => setNewRewriteClientName(e.target.value)}
                  />
                  <button type="button" className={miniButtonClass} onClick={() => void createRewriteClient()} disabled={busy || !newRewriteClientName.trim()}>
                    Add client
                  </button>
                </div>
              </div>
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
              <p className="mt-2 text-sm text-slate-400">
                This tab lists <span className="font-semibold text-slate-200">imported new articles</span> available for rewriting — items still in the pipeline, not archived under{" "}
                <button type="button" className="font-semibold text-[#22c55e] underline decoration-[#22c55e]/50 hover:text-white" onClick={() => setTab("Published")}>
                  Published
                </button>
                .
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[#1f2d26] bg-black/20 p-3">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Show source articles from day ≥
                <input className={inputClass} type="date" value={pipelineSinceDate} onChange={(e) => setPipelineSinceDate(e.target.value)} />
              </label>
              <button type="button" className="rounded-lg border border-[#1f2d26] px-3 py-2 text-sm text-slate-300" onClick={() => setPipelineSinceDate("")}>
                All dates
              </button>
              <p className="text-xs text-slate-500">Same date filter as Translations; uses publish date when set, otherwise import date.</p>
            </div>
            {articlesForActivePipeline.length === 0 ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                No pipeline articles match this filter. Clear the date filter, import new items, or open{" "}
                <button type="button" className="font-semibold text-white underline" onClick={() => setTab("Published")}>Published</button>{" "}
                to send a stored article back here.
              </p>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
            <ArticleList
              articles={articlesForActivePipeline}
              selectedId={selectedArticle?.id ?? ""}
              selectedIds={selectedArticleIds}
              onSelect={setSelectedArticleId}
              onToggle={(id) => setSelectedArticleIds((rows) => rows.includes(id) ? rows.filter((row) => row !== id) : [...rows, id])}
            />
            <div className="space-y-3">
              <ArticleSportTagEditor article={selectedArticle} busy={busy} onSave={saveArticleSportTag} />
              <ArticleTagsEditor article={selectedArticle} busy={busy} onSave={saveArticleTags} />
              <div className="rounded-lg border border-[#1f2d26] p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Articles to rewrite</p>
                <div className="mt-2 space-y-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={articleSelectionMode === "selected"} onChange={() => setArticleSelectionMode("selected")} />
                    Selected articles ({translationArticleIds.length})
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={articleSelectionMode === "all"} onChange={() => setArticleSelectionMode("all")} />
                    All listed articles ({articlesForActivePipeline.length})
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={miniButtonClass} onClick={() => setSelectedArticleIds(articlesForActivePipeline.map((article) => article.id))}>Select all</button>
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
                Use Content Creator Profile
                <select
                  className={inputClass}
                  value={selectedJournalistProfileId}
                  onChange={(e) => applyJournalistProfile(e.target.value)}
                >
                  <option value="">Manual creator style</option>
                  {activeJournalistProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {profile.brand}{profile.sports.length ? ` · ${profile.sports.join(", ")}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Creator Style
                <textarea className={textareaClass} value={journalistStyle} onChange={(e) => setJournalistStyle(e.target.value)} />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Article / Editorial Guidelines
                <textarea className={textareaClass} value={editorialGuidelines} onChange={(e) => setEditorialGuidelines(e.target.value)} />
              </label>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Client content</p>
                    <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                      Select one or more clients. Approved rewrites will appear in those clients&apos; XML/API feeds.
                    </p>
                  </div>
                  {selectedRewriteClientIds.length ? (
                    <span className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-black text-[color:var(--accent-foreground)]">
                      {selectedRewriteClientIds.length} selected
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {activeClients.map((client) => (
                    <label key={client.id} className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={selectedRewriteClientIds.includes(client.id)}
                        onChange={(e) => toggleRewriteClient(client.id, e.target.checked)}
                      />
                      {client.name}
                    </label>
                  ))}
                </div>
                {activeClients.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-[color:var(--surface-muted)] p-3 text-sm text-[color:var(--text-secondary)]">
                    No clients yet. Add Racing365 or another client below.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    className={inputClass}
                    placeholder="Add a client, e.g. Racing365"
                    value={newRewriteClientName}
                    onChange={(e) => setNewRewriteClientName(e.target.value)}
                  />
                  <button type="button" className={miniButtonClass} onClick={() => void createRewriteClient()} disabled={busy || !newRewriteClientName.trim()}>
                    Add client
                  </button>
                </div>
              </div>
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
            <h2 className="text-xl font-bold text-white">Review queue (manual)</h2>
            <p className="text-sm text-slate-400">
              Human approval for AI rewrites and translations before they are published to client feeds. Automations and crons send work here unless auto-approve is enabled.
            </p>
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
                                  socialPosts: socialPostsForEditor(selectedTranslation).map((row) => row.platform === post.platform ? { ...row, hashtags: uniqueTags(e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean)) } : row),
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
                    <ManualStringTagsEditor
                      label="Tags"
                      description="Translation tags for feeds and filters."
                      tags={selectedTranslation.tags}
                      onChange={(next) => updateSelectedTranslation({ tags: uniqueTags(next) })}
                      disabled={busy}
                    />
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Client availability</p>
                      <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                        Approved content appears only in selected client feeds. Leave unselected for legacy brand/language feed behaviour.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {activeClients.map((client) => (
                          <label key={client.id} className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)]">
                            <input
                              type="checkbox"
                              checked={(selectedTranslation.clientIds ?? []).includes(client.id)}
                              onChange={(e) => updateSelectedTranslation({
                                clientIds: e.target.checked
                                  ? [...new Set([...(selectedTranslation.clientIds ?? []), client.id])]
                                  : (selectedTranslation.clientIds ?? []).filter((id) => id !== client.id),
                              })}
                            />
                            {client.name}
                          </label>
                        ))}
                      </div>
                    </div>
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
              <div className="min-w-0 space-y-4 2xl:sticky 2xl:top-4 2xl:self-start">
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

      {tab === "Published" ? (
        <div className="space-y-4">
          <Panel title="Published" className="space-y-4 p-5">
            <h2 className="text-xl font-bold text-white">Published</h2>
            <p className="max-w-3xl text-sm text-slate-400">
              Day-based archive: <span className="font-semibold text-slate-200">Published rewrites</span> and{" "}
              <span className="font-semibold text-slate-200">Published – translated</span> are feed-ready rows that were approved or exported.{" "}
              <span className="font-semibold text-slate-200">Finished source articles</span> are stored originals (approved, translated, exported, or archived); use Rewrite or Translate again to move them back to the live import queues.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Calendar day
                <input className={inputClass} type="date" value={publishedCalendarDay} onChange={(e) => setPublishedCalendarDay(e.target.value)} />
              </label>
              <button type="button" className="rounded-lg border border-[#1f2d26] px-3 py-2 text-sm text-slate-300" onClick={() => setPublishedCalendarDay(todayInputValue())}>
                Today
              </button>
              <Link
                href={withAppPathPrefix("/language-studio?tab=Export%20Feeds")}
                className="rounded-lg border border-[#22c55e]/40 px-3 py-2 text-sm font-semibold text-[#22c55e] hover:bg-[#22c55e]/10"
              >
                Export feeds
              </Link>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Published rewrites</h3>
              <p className="text-xs text-slate-500">
                {publishedRewritesOnDay.length} approved or exported English rewrite(s) on this day.
              </p>
              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {publishedRewritesOnDay.length === 0 ? (
                  <p className="rounded-lg border border-[#1f2d26] bg-black/20 p-4 text-sm text-slate-500">No published rewrites on this day.</p>
                ) : (
                  publishedRewritesOnDay.map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1f2d26] bg-black/20 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">{row.title || "Untitled"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {LANGUAGE_LABELS[row.targetLanguage]} · {row.status}
                          {row.approvedAt ? ` · approved ${formatArticleDate(row.approvedAt)}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={miniButtonClass}
                        onClick={() => {
                          setSelectedTranslationId(row.id);
                          setTab("Review Queue");
                        }}
                      >
                        Open in review
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2 border-t border-[#1f2d26] pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Published – translated</h3>
              <p className="text-xs text-slate-500">
                {publishedTranslatedOnDay.length} approved or exported translation(s) on this day.
              </p>
              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {publishedTranslatedOnDay.length === 0 ? (
                  <p className="rounded-lg border border-[#1f2d26] bg-black/20 p-4 text-sm text-slate-500">No published translations on this day.</p>
                ) : (
                  publishedTranslatedOnDay.map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1f2d26] bg-black/20 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">{row.title || "Untitled"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {LANGUAGE_LABELS[row.targetLanguage]} · {row.status}
                          {row.approvedAt ? ` · approved ${formatArticleDate(row.approvedAt)}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={miniButtonClass}
                        onClick={() => {
                          setSelectedTranslationId(row.id);
                          setTab("Review Queue");
                        }}
                      >
                        Open in review
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2 border-t border-[#1f2d26] pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Finished source articles</h3>
              <p className="text-xs text-slate-500">
                {storedArticlesOnDay.length} stored original(s) touched on this day (by last update). Send back to the live queues when you need another AI pass.
              </p>
              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {storedArticlesOnDay.length === 0 ? (
                  <p className="rounded-lg border border-[#1f2d26] bg-black/20 p-4 text-sm text-slate-500">No finished source articles for this day.</p>
                ) : (
                  storedArticlesOnDay.map((article) => (
                    <div key={article.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1f2d26] bg-black/20 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">{article.title || "Untitled"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {article.sourceBrand} · {article.status} · {formatArticleDate(article.publishDate || article.updatedAt || article.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={miniButtonClass} onClick={() => void reopenStoredArticleToTab(article.id, "Rewrite")} disabled={busy}>
                          Rewrite again
                        </button>
                        <button type="button" className={miniButtonClass} onClick={() => void reopenStoredArticleToTab(article.id, "Translations")} disabled={busy}>
                          Translate again
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>
          {adminPanel}
        </div>
      ) : null}

      {tab === "Automated" ? (
        <div className="space-y-4">
          <Panel title="Automated" className="space-y-4 p-5">
            <h2 className="text-xl font-bold text-white">Crons and AI automations</h2>
            <p className="max-w-3xl text-sm text-slate-400">
              Use a <span className="font-semibold text-slate-200">feed cron</span> to import the latest articles on a schedule (incremental windows and per-run caps are configured per job). Use{" "}
              <span className="font-semibold text-slate-200">article automations</span> so that after each import, matching brands and clients automatically get OpenAI rewrite and/or translation passes — results still land in{" "}
              <button type="button" className="font-semibold text-[#22c55e] underline decoration-[#22c55e]/50 hover:text-white" onClick={() => setTab("Review Queue")}>
                Review Queue
              </button>{" "}
              for manual approval unless you enable auto-approve on an automation.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#1f2d26] bg-black/20 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Import crons</p>
                <p className="mt-2 text-sm text-slate-300">
                  Schedule RSS, XML, URL or API pulls. Each job can limit how many items run per pass and only import items newer than the last successful watermark.
                </p>
                <Link
                  href={withAppPathPrefix("/admin/crons")}
                  className="mt-4 inline-flex rounded-lg border border-[#22c55e]/40 px-4 py-2 text-sm font-bold text-[#22c55e] hover:bg-[#22c55e]/10"
                >
                  Open import crons →
                </Link>
              </div>
              <div className="rounded-xl border border-[#1f2d26] bg-black/20 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">AI rewrite &amp; translate automations</p>
                <p className="mt-2 text-sm text-slate-300">
                  Define which clients and source brands get automatic rewrites, translations, or both after an import. Tune limits per automation (e.g. only new article IDs, max per run).
                </p>
                <Link
                  href={withAppPathPrefix("/admin/article-automations")}
                  className="mt-4 inline-flex rounded-lg border border-[#22c55e]/40 px-4 py-2 text-sm font-bold text-[#22c55e] hover:bg-[#22c55e]/10"
                >
                  Open article automations →
                </Link>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Admin routes may require your deployment&apos;s admin token or signed-in operator access, depending on how Planet Sport Studio is hosted.
            </p>
          </Panel>
          {adminPanel}
        </div>
      ) : null}

      {tab === "Guardrails" ? <GovernancePanel section="Guardrails" /> : null}
      {tab === "Source Brands" ? (
        <SourceBrandsPanel sourceBrands={sourceBrands} onSave={saveSourceBrand} onDelete={deleteSourceBrandById} busy={busy} />
      ) : null}
      {tab === "Journalists" ? <GovernancePanel section="Journalists" /> : null}
      {tab === "Knowledge Files" ? <GovernancePanel section="Knowledge Files" /> : null}
      {tab === "Glossary" ? <GlossaryPanel glossary={glossary} onSave={saveGlossary} busy={busy} /> : null}
      {tab === "Protected Terms" ? <GovernancePanel section="Protected Terms" /> : null}
      {tab === "Market Rules" ? <GovernancePanel section="Market Rules" /> : null}
      {tab === "Prompt Rules" ? <GovernancePanel section="Prompt Rules" /> : null}
      {tab === "Compliance Notes" ? <GovernancePanel section="Compliance Notes" /> : null}
      {tab === "Quality Checks" ? <GovernancePanel section="Quality Checks" /> : null}
      {tab === "Export Feeds" ? (
        <ExportsPanel
          exportsRows={exportsRows}
          clients={clients}
          apiKeys={clientApiKeys}
          translations={translations}
        />
      ) : null}
      {tab === "Client Access" ? (
        <ClientAccessPanel
          clients={clients}
          apiKeys={clientApiKeys}
          accessLogs={clientAccessLogs}
          rawApiKey={latestRawApiKey}
          onClearRawApiKey={() => setLatestRawApiKey(null)}
          onSaveClient={saveClient}
          onDeleteClient={deleteClient}
          onCreateKey={createClientApiKey}
          onRevokeKey={revokeClientApiKey}
          busy={busy}
        />
      ) : null}
      {tab === "Settings" ? <RulesPanel rules={rules} onSave={saveRule} busy={busy} /> : null}
      {busy && processingOverlay ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
          aria-valuetext={`${busyCaption || "Processing"}. Elapsed ${processingElapsedSec} seconds.`}
        >
          <div className="w-full max-w-md rounded-2xl border border-[#22c55e]/40 bg-[#0a0e0c] p-8 text-center shadow-2xl">
            <p className="text-lg font-bold text-white">Processing</p>
            <p className="mt-2 text-sm text-slate-300">{busyCaption || "Please wait…"}</p>
            <div className="ls-processing-track mt-6" role="progressbar" aria-label="Working">
              <div className="ls-processing-bar" />
            </div>
            <p className="mt-3 text-xs tabular-nums tracking-wide text-slate-500">
              Elapsed{" "}
              <span className="font-semibold text-slate-300">
                {processingElapsedSec < 60
                  ? `${processingElapsedSec}s`
                  : `${Math.floor(processingElapsedSec / 60)}m ${String(processingElapsedSec % 60).padStart(2, "0")}s`}
              </span>
            </p>
          </div>
        </div>
      ) : null}
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
    <div className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-sm">
      <div>
        <p className="text-sm font-bold text-[color:var(--text-primary)]">Source Image</p>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">Thumbnail and image tools for social/video output.</p>
      </div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={article?.title ?? "Source image"} className="aspect-video w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] object-cover" />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface-muted)] text-xs text-[color:var(--text-muted)]">
          No source image
        </div>
      )}
      {article?.imageLibraryRel ? <p className="truncate text-xs font-semibold text-[color:var(--success)]">Library: {article.imageLibraryRel}</p> : null}
      {article?.imageUrl ? <p className="truncate text-xs text-[color:var(--text-muted)]">Remote: {article.imageUrl}</p> : null}
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
      <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
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
      <p className="rounded-xl bg-[color:var(--surface-muted)] p-3 text-xs leading-5 text-[color:var(--text-secondary)]">
        Image to Image is parked until the Runway/OpenAI image edit provider is connected.
      </p>
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
                    {article.sport ? <span className="font-semibold text-[#22c55e]">{article.sport}</span> : null}
                    {article.sport ? " · " : ""}
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
  const isPublished = (row: Translation) => row.status === "approved" || row.status === "exported";
  const reviewRows = translations.filter((row) => !isPublished(row));
  const approvedRows = translations.filter(isPublished);
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
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Published ({approvedRows.length})</p>
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

function SavedFeedsEditor({
  sourceBrands,
  onSave,
  onDelete,
  busy,
  intro,
}: {
  sourceBrands: SourceBrandRow[];
  onSave: (source: Partial<SourceBrandRow>) => void;
  onDelete: (id: string) => void;
  busy: boolean;
  intro: string;
}) {
  const emptyDraft = (): Partial<SourceBrandRow> => ({
    name: "",
    feedUrl: "",
    sourceLanguage: "en",
    parserType: "wordpress-rss",
    active: true,
    notes: "",
    defaultSport: undefined,
  });
  const [source, setSource] = useState<Partial<SourceBrandRow>>(emptyDraft);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">{intro}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={miniButtonClass}
          onClick={() => setSource(emptyDraft())}
        >
          New feed
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <input className={inputClass} placeholder="Brand name" value={source.name ?? ""} onChange={(e) => setSource({ ...source, name: e.target.value })} />
        <select className={inputClass} value={source.sourceLanguage ?? "en"} onChange={(e) => setSource({ ...source, sourceLanguage: e.target.value as LanguageCode })}>
          {Object.entries(LANGUAGE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <select className={inputClass} value={source.parserType ?? "wordpress-rss"} onChange={(e) => setSource({ ...source, parserType: e.target.value as LanguageSourceParserType })}>
          <option value="wordpress-rss">WordPress RSS / partner feed</option>
          <option value="rss-default">Default RSS</option>
          <option value="xml">XML feed</option>
          <option value="json-api">JSON API</option>
          <option value="html-page">HTML page</option>
          <option value="custom">Custom parser needed</option>
        </select>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={source.active ?? true} onChange={(e) => setSource({ ...source, active: e.target.checked })} />
          Active
        </label>
        <R365Button type="button" onClick={() => onSave(source)} disabled={busy}>{source.id ? "Update feed" : "Save feed"}</R365Button>
      </div>
      <input className={inputClass} placeholder="Feed URL" value={source.feedUrl ?? ""} onChange={(e) => setSource({ ...source, feedUrl: e.target.value })} />
      <label className="mt-3 block text-xs font-semibold uppercase text-slate-500">
        Default sport tag for imports
        <select
          className={inputClass}
          value={source.defaultSport ?? ""}
          onChange={(e) => setSource({ ...source, defaultSport: e.target.value === "" ? undefined : (e.target.value as LanguageSportContext) })}
        >
          <option value="">Auto-detect from URL / categories</option>
          {sportContextOptions.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
        </select>
      </label>
      <textarea className={textareaClass} placeholder="Notes, parser hints, source caveats" value={source.notes ?? ""} onChange={(e) => setSource({ ...source, notes: e.target.value })} />
      {sourceBrands.length === 0 ? <p className="text-sm text-slate-500">No saved feeds yet. Add a brand name and feed URL, then save.</p> : null}
      <div className="grid gap-2 md:grid-cols-2">
        {sourceBrands.map((row) => (
          <div key={row.id} className="rounded-lg border border-[#1f2d26] p-3 text-sm text-slate-300">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="text-white">{row.name}</strong>
                <p className="mt-1 truncate text-xs text-slate-500">{row.feedUrl}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {row.defaultSport ? <span className="text-[#22c55e]">{row.defaultSport}</span> : "Auto sport"} · {LANGUAGE_LABELS[row.sourceLanguage]} · {row.parserType} · {row.active ? "active" : "inactive"}
                </p>
                {row.notes ? <p className="mt-2 text-xs text-slate-400">{row.notes}</p> : null}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" className="text-xs text-[#22c55e]" onClick={() => setSource(row)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-300"
                  onClick={() => {
                    if (!window.confirm("Delete this feed? Cron jobs and automations may still reference it by name until you update them.")) return;
                    onDelete(row.id);
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
  );
}

function SourceBrandsPanel({
  sourceBrands,
  onSave,
  onDelete,
  busy,
}: {
  sourceBrands: SourceBrandRow[];
  onSave: (source: Partial<SourceBrandRow>) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  return (
    <Panel title="Source Brands" className="space-y-4 p-5">
      <div>
        <h2 className="text-xl font-bold text-white">Source Brands and Feed Parsers</h2>
        <p className="mt-1 text-sm text-slate-400">
          Partner feeds are also editable from the <strong className="font-semibold text-slate-200">Import</strong> tab under &quot;Saved feeds&quot;.
        </p>
      </div>
      <SavedFeedsEditor
        sourceBrands={sourceBrands}
        onSave={onSave}
        onDelete={onDelete}
        busy={busy}
        intro="Add partner feeds here, then choose them from the Imports tab. Use the default RSS parser for WordPress-style feeds, and mark custom sources for a future test-parse workflow."
      />
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
  onClearRawApiKey,
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
  onClearRawApiKey: () => void;
  onSaveClient: (client: Partial<ClientRow>) => void;
  onDeleteClient: (id: string) => void;
  onCreateKey: (apiKey: Partial<ClientApiKeyRow>) => void;
  onRevokeKey: (id: string) => void;
  busy: boolean;
}) {
  const clientFormRef = useRef<HTMLDivElement>(null);
  const clientNameInputRef = useRef<HTMLInputElement>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [client, setClient] = useState<Partial<ClientRow>>({
    name: "",
    active: true,
    allowedBrands: [],
    allowedLanguages: [],
    allowedSports: [],
    allowedFormats: ["xml", "json"],
  });
  const [keyDraft, setKeyDraft] = useState<Partial<ClientApiKeyRow>>({
    label: "Client feed key",
    allowedBrands: [],
    allowedLanguages: [],
    allowedSports: [],
    allowedFormats: ["xml", "json"],
  });
  const selectedClient = clients.find((row) => row.id === keyDraft.clientId) ?? clients[0];
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const jsonApiUrl = `${withAppPathPrefix("/api/client-api/translations")}?key=${rawApiKey || "CLIENT_KEY"}`;
  const jsonFeedUrl = `${withAppPathPrefix("/api/client-feeds/translations.json")}?key=${rawApiKey || "CLIENT_KEY"}`;
  const xmlUrl = `${withAppPathPrefix("/api/client-feeds/translations.xml")}?key=${rawApiKey || "CLIENT_KEY"}`;
  const fullJsonApi = rawApiKey ? `${origin}${jsonApiUrl}` : "";
  const fullJsonFeed = rawApiKey ? `${origin}${jsonFeedUrl}` : "";
  const fullXml = rawApiKey ? `${origin}${xmlUrl}` : "";

  const showCopyHint = (msg: string) => {
    setCopyHint(msg);
    window.setTimeout(() => setCopyHint(null), 3200);
  };

  const copyToClipboard = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showCopyHint(`${label} copied`);
    } catch {
      showCopyHint("Browser blocked clipboard — select the text and copy manually");
    }
  };

  const loadClientIntoForm = (row: ClientRow) => {
    setClient({
      id: row.id,
      name: row.name,
      contactEmail: row.contactEmail ?? "",
      active: row.active ?? true,
      allowedBrands: Array.isArray(row.allowedBrands) ? [...row.allowedBrands] : [],
      allowedLanguages: Array.isArray(row.allowedLanguages) ? [...row.allowedLanguages] : [],
      allowedSports: Array.isArray(row.allowedSports) ? [...row.allowedSports] : [],
      allowedFormats: (Array.isArray(row.allowedFormats) && row.allowedFormats.length
        ? [...row.allowedFormats]
        : ["xml", "json"]) as Array<"xml" | "json">,
      notes: row.notes ?? "",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
    queueMicrotask(() => {
      clientFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      clientNameInputRef.current?.focus({ preventScroll: true });
    });
  };

  return (
    <Panel title="Client Access" className="space-y-5 p-5">
      <div>
        <h2 className="text-xl font-bold text-white">Client Login and Feed/API Access</h2>
        <p className="mt-1 text-sm text-slate-400">
          Create a client, issue a key, then provide XML, JSON feed or JSON API access to approved translations only.
        </p>
        <div className="mt-3 rounded-lg border border-slate-600/35 bg-black/25 p-3 text-xs leading-relaxed text-slate-400">
          <p>
            <strong className="text-slate-200">Why you only see part of a key:</strong> the full secret is never stored (only a hash), so existing keys cannot be shown or emailed from this screen. That is normal.
          </p>
          <p className="mt-2">
            <strong className="text-slate-200">To send a key to a client:</strong> use <strong className="text-slate-200">Create API key</strong>, then copy the full value from the <strong className="text-slate-200">highlighted key panel</strong> immediately (or use the copy buttons). To rotate access, create a new key, send it to the client, then <strong className="text-slate-200">Revoke</strong> the old key when they have switched.
          </p>
          <p className="mt-2">
            <strong className="text-slate-200">Editing a client:</strong> click <strong className="text-slate-200">Edit</strong> on a row in the <strong className="text-slate-200">Clients</strong> list (left column). The form <strong className="text-slate-200">directly above</strong> that list loads that client; change fields and press <strong className="text-slate-200">Update client</strong>.
          </p>
        </div>
        {copyHint ? <p className="mt-2 text-xs font-medium text-[#22c55e]">{copyHint}</p> : null}
      </div>

      {rawApiKey ? (
        <div
          className="rounded-xl border-2 border-amber-500 p-4 text-sm shadow-lg"
          style={{
            backgroundColor: "#0c1222",
            color: "#e2e8f0",
            borderColor: "#d97706",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-bold text-white">New API key — copy now (shown once)</p>
            <button
              type="button"
              className="text-xs font-semibold text-amber-300 underline decoration-amber-500/80 underline-offset-2 hover:text-amber-100"
              onClick={() => onClearRawApiKey()}
            >
              I have saved it — hide key
            </button>
          </div>
          <code
            className="mt-3 block break-all rounded-lg border border-slate-600 bg-black px-3 py-3 font-mono text-[13px] leading-relaxed text-emerald-300"
            style={{ wordBreak: "break-all" }}
          >
            {rawApiKey}
          </code>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-amber-600/80 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
              onClick={() => void copyToClipboard("API key", rawApiKey)}
            >
              Copy key
            </button>
            <button
              type="button"
              className="rounded-lg border border-amber-600/80 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
              onClick={() => void copyToClipboard("XML feed URL", fullXml)}
            >
              Copy XML URL
            </button>
            <button
              type="button"
              className="rounded-lg border border-amber-600/80 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
              onClick={() => void copyToClipboard("JSON feed URL", fullJsonFeed)}
            >
              Copy JSON feed URL
            </button>
            <button
              type="button"
              className="rounded-lg border border-amber-600/80 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
              onClick={() => void copyToClipboard("JSON API URL", fullJsonApi)}
            >
              Copy JSON API URL
            </button>
          </div>
          <p className="mt-4 text-xs font-medium text-slate-300">Relative paths (same host as this page):</p>
          <p className="mt-1 break-all text-xs text-slate-200">
            JSON API:{" "}
            <code className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-emerald-200">{jsonApiUrl}</code>
          </p>
          <p className="mt-1 break-all text-xs text-slate-200">
            JSON feed:{" "}
            <code className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-emerald-200">{jsonFeedUrl}</code>
          </p>
          <p className="mt-1 break-all text-xs text-slate-200">
            XML:{" "}
            <code className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-emerald-200">{xmlUrl}</code>
          </p>
          {origin ? (
            <p className="mt-3 break-all text-xs text-slate-300">
              Full URLs for clients use this host:{" "}
              <code className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-emerald-200">{origin}</code>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div ref={clientFormRef} className="rounded-lg border border-[#1f2d26] p-4 ring-offset-2 ring-offset-[#0b1210] transition-shadow scroll-mt-4">
            <h3 className="font-bold text-white">Create / update client</h3>
            {client.id ? <p className="mt-1 text-xs font-medium text-[#22c55e]">Editing: {client.name}</p> : <p className="mt-1 text-xs text-slate-500">New client — fill in details, then save.</p>}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input ref={clientNameInputRef} className={inputClass} placeholder="Client name" value={client.name ?? ""} onChange={(e) => setClient({ ...client, name: e.target.value })} />
              <input className={inputClass} placeholder="Contact email" value={client.contactEmail ?? ""} onChange={(e) => setClient({ ...client, contactEmail: e.target.value })} />
              <input className={inputClass} placeholder="Allowed brands, comma-separated" value={(client.allowedBrands ?? []).join(", ")} onChange={(e) => setClient({ ...client, allowedBrands: csv(e.target.value) })} />
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={client.active ?? true} onChange={(e) => setClient({ ...client, active: e.target.checked })} />Active</label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300 md:grid-cols-4">
              {clientLanguageOptions.map(([code, label]) => (
                <label key={code} className="flex items-center gap-2">
                  <input type="checkbox" checked={(client.allowedLanguages ?? []).includes(code)} onChange={(e) => setClient({ ...client, allowedLanguages: e.target.checked ? [...(client.allowedLanguages ?? []), code] : (client.allowedLanguages ?? []).filter((row) => row !== code) })} />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Allowed sports (none = all)</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
              {LANGUAGE_SPORT_CONTEXTS.map((sport) => (
                <label key={sport} className="flex items-center gap-2 rounded border border-[#1f2d26] px-2 py-1">
                  <input
                    type="checkbox"
                    checked={(client.allowedSports ?? []).includes(sport)}
                    onChange={(e) => setClient({
                      ...client,
                      allowedSports: e.target.checked
                        ? [...(client.allowedSports ?? []), sport]
                        : (client.allowedSports ?? []).filter((row) => row !== sport),
                    })}
                  />
                  {sport}
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
            <div className="mt-3 flex flex-wrap gap-2">
              <R365Button type="button" onClick={() => onSaveClient(client)} disabled={busy}>
                {client.id ? "Update client" : "Save client"}
              </R365Button>
              {client.id ? (
                <R365Button type="button" variant="ghost" onClick={() => setClient({ name: "", active: true, allowedBrands: [], allowedLanguages: [], allowedSports: [], allowedFormats: ["xml", "json"] })} disabled={busy}>
                  Clear form (new client)
                </R365Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-[#1f2d26] p-4">
            <h3 className="font-bold text-white">Clients</h3>
            <div className="mt-3 space-y-2">
              {clients.length === 0 ? <p className="text-sm text-slate-500">No clients yet.</p> : clients.map((row) => (
                <div key={row.id} className="rounded border border-[#1f2d26] p-3 text-sm text-slate-300">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <strong className="text-white">{row.name}</strong>
                      <p className="text-xs text-slate-500">{row.active ? "Active" : "Inactive"} · {(row.allowedBrands ?? []).join(", ") || "all brands"} · {(row.allowedLanguages ?? []).join(", ") || "all languages"} · {(row.allowedSports ?? []).join(", ") || "all sports"}</p>
                      {row.contactEmail ? <p className="mt-1 text-xs text-slate-500">{row.contactEmail}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="text-xs text-[#22c55e]" onClick={() => loadClientIntoForm(row)}>
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
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-[#1f2d26] p-4">
            <h3 className="font-bold text-white">Issue API key</h3>
            <select className={inputClass} value={keyDraft.clientId ?? selectedClient?.id ?? ""} onChange={(e) => setKeyDraft({ ...keyDraft, clientId: e.target.value })}>
              {clients.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            <input className={inputClass} placeholder="Key label" value={keyDraft.label ?? ""} onChange={(e) => setKeyDraft({ ...keyDraft, label: e.target.value })} />
            <input className={inputClass} placeholder="Allowed brands, comma-separated" value={(keyDraft.allowedBrands ?? []).join(", ")} onChange={(e) => setKeyDraft({ ...keyDraft, allowedBrands: csv(e.target.value) })} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300 md:grid-cols-4">
              {clientLanguageOptions.map(([code, label]) => (
                <label key={code} className="flex items-center gap-2">
                  <input type="checkbox" checked={(keyDraft.allowedLanguages ?? []).includes(code)} onChange={(e) => setKeyDraft({ ...keyDraft, allowedLanguages: e.target.checked ? [...(keyDraft.allowedLanguages ?? []), code] : (keyDraft.allowedLanguages ?? []).filter((row) => row !== code) })} />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Key sports (none = same as client)</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
              {LANGUAGE_SPORT_CONTEXTS.map((sport) => (
                <label key={sport} className="flex items-center gap-2 rounded border border-[#1f2d26] px-2 py-1">
                  <input
                    type="checkbox"
                    checked={(keyDraft.allowedSports ?? []).includes(sport)}
                    onChange={(e) => setKeyDraft({
                      ...keyDraft,
                      allowedSports: e.target.checked
                        ? [...(keyDraft.allowedSports ?? []), sport]
                        : (keyDraft.allowedSports ?? []).filter((row) => row !== sport),
                    })}
                  />
                  {sport}
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
                  <p className="mt-1 text-xs text-slate-500">{(row.allowedFormats ?? []).join(", ").toUpperCase() || "—"} · {(row.allowedLanguages ?? []).join(", ") || "all languages"} · {(row.allowedSports ?? []).join(", ") || "all sports"} · Last used {formatArticleDate(row.lastUsedAt)}</p>
                </div>
              ))}
            </div>
          </div>
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

function ExportsPanel({
  exportsRows,
  clients,
  apiKeys,
  translations,
}: {
  exportsRows: ExportRow[];
  clients: ClientRow[];
  apiKeys: ClientApiKeyRow[];
  translations: Translation[];
}) {
  const deliverable = translations.filter((row) => row.status === "approved" || row.status === "exported");
  const clientRows = clients.filter((client) => client.active);
  return (
    <Panel title="Export Feeds" className="space-y-5 p-5">
      <div>
        <h2 className="text-xl font-bold text-white">Export Feeds</h2>
        <p className="mt-1 text-sm text-slate-500">
          Live client feeds serve approved/exported rewrite and translation outputs. Automation outputs appear here after Review Queue approval.
        </p>
      </div>

      <div className="rounded-lg border border-[#1f2d26] bg-black/10 p-4">
        <h3 className="font-bold text-white">Client delivery feeds</h3>
        <div className="mt-3 space-y-3">
          {clientRows.length === 0 ? <p className="text-sm text-slate-500">No active clients yet.</p> : clientRows.map((client) => {
            const clientKeys = apiKeys.filter((key) => key.clientId === client.id && key.active);
            const itemCount = deliverable.filter((row) => !row.clientIds?.length || row.clientIds.includes(client.id)).length;
            return (
              <div key={client.id} className="rounded-lg border border-[#1f2d26] p-3 text-sm text-slate-300">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{client.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {itemCount} approved/exported item(s) · Formats: {(client.allowedFormats ?? []).join(", ").toUpperCase() || "XML, JSON"}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#22c55e]/40 bg-[#22c55e]/10 px-2 py-1 text-xs font-bold text-[#22c55e]">
                    Live feed
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs">
                  <p>XML: <code className="break-all rounded bg-black/30 px-2 py-1">{`${withAppPathPrefix("/api/client-feeds/translations.xml")}?key=CLIENT_KEY`}</code></p>
                  <p>JSON feed: <code className="break-all rounded bg-black/30 px-2 py-1">{`${withAppPathPrefix("/api/client-feeds/translations.json")}?key=CLIENT_KEY`}</code></p>
                  <p>JSON API: <code className="break-all rounded bg-black/30 px-2 py-1">{`${withAppPathPrefix("/api/client-api/translations")}?key=CLIENT_KEY`}</code></p>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {clientKeys.length
                    ? `Active keys: ${clientKeys.map((key) => key.maskedKey).join(", ")}`
                    : "Create an API key in Client Access before sending the feed to this client."}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-[#1f2d26] p-4">
        <h3 className="font-bold text-white">Stored export payloads</h3>
        <div className="mt-3 space-y-3">
          {exportsRows.length === 0 ? (
            <p className="text-sm text-slate-500">No stored exports yet.</p>
          ) : exportsRows.map((row) => (
            <details key={row.id} className="rounded-lg border border-[#1f2d26] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-white">
                {row.format.toUpperCase()} · {LANGUAGE_LABELS[row.targetLanguage]} · {new Date(row.createdAt).toLocaleString()}
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-3 text-xs text-slate-300">{row.payload}</pre>
            </details>
          ))}
        </div>
      </div>
    </Panel>
  );
}
