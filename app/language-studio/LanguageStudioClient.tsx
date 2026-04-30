"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { GovernancePanel } from "@/app/language-studio/GovernancePanels";
import { QualityGuardrailsPanel } from "@/app/language-studio/QualityGuardrailsPanel";
import { LANGUAGE_LABELS, type LanguageCode, type LanguageProviderMode, type TranslationMode } from "@/app/lib/language-studio/types";

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
  slug: string;
  status: "draft" | "approved" | "rejected";
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

const tabs = ["Dashboard", "Imports", "Translations", "Review Queue", "Guardrails", "Knowledge Files", "Glossary", "Protected Terms", "Market Rules", "Prompt Rules", "Compliance Notes", "Quality Checks", "Export Feeds", "Client Access", "Settings"] as const;
const inputClass = "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";
const textareaClass = `${inputClass} min-h-28 font-mono text-xs`;
const targetOptions = Object.entries(LANGUAGE_LABELS).filter(([code]) => code !== "en") as Array<[LanguageCode, string]>;
const clientDocs = [
  { slug: "client-access", title: "Client Access Guide", description: "How to create clients, issue keys, revoke access and review logs." },
  { slug: "client-api", title: "Client API Reference", description: "XML and JSON endpoint examples, authentication and payload fields." },
  { slug: "language-studio", title: "Language Studio Admin Guide", description: "Import, translate, review, approve and export workflow." },
  { slug: "install", title: "Plexa Install Guide", description: "Local install, admin setup and generated files." },
  { slug: "environment", title: "Environment Variables", description: "OpenAI, DeepL, cron, admin and runtime settings." },
  { slug: "deployment", title: "Deployment Guide", description: "Production build, Vercel cron and storage notes." },
  { slug: "troubleshooting", title: "Troubleshooting", description: "Common import, image, translation, cron and API issues." },
];

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

export function LanguageStudioClient() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Dashboard");
  const [articles, setArticles] = useState<Article[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [exportsRows, setExportsRows] = useState<ExportRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientApiKeys, setClientApiKeys] = useState<ClientApiKeyRow[]>([]);
  const [clientAccessLogs, setClientAccessLogs] = useState<ClientAccessLogRow[]>([]);
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

  const [sourceUrl, setSourceUrl] = useState("https://www.planetf1.com/partner-media-content-feed");
  const [xml, setXml] = useState("");
  const [processImages, setProcessImages] = useState(true);
  const [importFullArticles, setImportFullArticles] = useState(true);
  const [sourceBrand, setSourceBrand] = useState("PlanetF1");
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode>("en");
  const [targetLanguages, setTargetLanguages] = useState<LanguageCode[]>(["es"]);
  const [providerMode, setProviderMode] = useState<LanguageProviderMode>("openai");
  const [translationMode, setTranslationMode] = useState<TranslationMode>("translate-localise");
  const [busy, setBusy] = useState(false);

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

  const loadAll = async () => {
    const [articleRes, transRes, glossaryRes, rulesRes, exportsRes, clientsRes] = await Promise.all([
      fetch("/api/language/articles"),
      fetch("/api/language/translations"),
      fetch("/api/language/glossary"),
      fetch("/api/language/rules"),
      fetch("/api/language/exports"),
      fetch("/api/language/clients"),
    ]);
    const articleData = await articleRes.json();
    const transData = await transRes.json();
    const glossaryData = await glossaryRes.json();
    const rulesData = await rulesRes.json();
    const exportsData = await exportsRes.json();
    const clientsData = await clientsRes.json();
    setArticles(articleData.articles ?? []);
    setTranslations(transData.translations ?? []);
    setGlossary(glossaryData.glossary ?? []);
    setRules(rulesData.rules ?? []);
    setExportsRows(exportsData.exports ?? []);
    setClients(clientsData.clients ?? []);
    setClientApiKeys(clientsData.apiKeys ?? []);
    setClientAccessLogs(clientsData.accessLogs ?? []);
  };

  useEffect(() => {
    void loadAll().catch((e) => setError(e instanceof Error ? e.message : "Failed to load Language Studio"));
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
      const importedArticles = Array.isArray(data.articles) ? data.articles as Article[] : [];
      const savedImages = importedArticles.filter((article) => article.imageLibraryRel).length;
      if (importedArticles.length > 0) {
        setArticles(importedArticles);
        setSelectedArticleId(importedArticles[0]?.id ?? "");
        setSelectedArticleIds(importedArticles.map((article) => article.id));
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
        body: JSON.stringify({ articleIds: translationArticleIds, targetLanguages, providerMode, translationMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Translation failed");
      setSelectedTranslationId(data.translations?.[0]?.id ?? "");
      setMessage(`${data.translations?.length ?? 0} translation(s) created from ${translationArticleIds.length} article(s).`);
      setTab("Review Queue");
    });

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
      setAdminOverride(false);
      setOverrideReason("");
      setMessage(approved ? "Translation approved." : "Translation rejected.");
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

  const updateSelectedTranslation = (patch: Partial<Translation>) => {
    if (!selectedTranslation) return;
    setTranslations((rows) => rows.map((row) => (row.id === selectedTranslation.id ? { ...row, ...patch } : row)));
  };

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
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full border px-3 py-1.5 text-sm ${tab === item ? "border-[#22c55e] bg-[#22c55e]/15 text-white" : "border-[#1f2d26] text-slate-400"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      {tab === "Dashboard" ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Stat title="Articles" value={articles.length} />
          <Stat title="Translations" value={translations.length} />
          <Stat title="Approved" value={translations.filter((row) => row.status === "approved").length} />
          <Stat title="Exports" value={exportsRows.length} />
        </div>
      ) : null}

      {tab === "Imports" ? (
        <Panel title="Imports" className="space-y-4 p-5">
          <h2 className="text-xl font-bold text-white">Import XML / RSS / URL / API</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs font-semibold uppercase text-slate-500">Source brand<input className={inputClass} value={sourceBrand} onChange={(e) => setSourceBrand(e.target.value)} /></label>
            <label className="text-xs font-semibold uppercase text-slate-500">Source language<select className={inputClass} value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value as LanguageCode)}>{Object.entries(LANGUAGE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
            <label className="text-xs font-semibold uppercase text-slate-500 md:col-span-2">Feed URL<input className={inputClass} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} /></label>
          </div>
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
      ) : null}

      {tab === "Translations" ? (
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
                  <button type="button" className="text-xs text-[#22c55e]" onClick={() => setSelectedArticleIds(articles.map((article) => article.id))}>Select all</button>
                  <button type="button" className="text-xs text-slate-400" onClick={() => setSelectedArticleIds([])}>Clear</button>
                </div>
              </div>
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
      ) : null}

      {tab === "Review Queue" ? (
        <Panel title="Review Queue" className="space-y-4 p-5">
          <h2 className="text-xl font-bold text-white">Review Editor</h2>
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <TranslationList translations={translations} selectedId={selectedTranslation?.id ?? ""} onSelect={setSelectedTranslationId} />
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_360px]">
              <ArticlePreview title="Original article" article={originalForTranslation} />
              {selectedTranslation ? (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-white">Translated version ({LANGUAGE_LABELS[selectedTranslation.targetLanguage]})</p>
                  <input className={inputClass} value={selectedTranslation.title} onChange={(e) => updateSelectedTranslation({ title: e.target.value })} />
                  <textarea className={textareaClass} value={selectedTranslation.standfirst} onChange={(e) => updateSelectedTranslation({ standfirst: e.target.value })} />
                  <textarea className={`${textareaClass} min-h-64`} value={selectedTranslation.body} onChange={(e) => updateSelectedTranslation({ body: e.target.value })} />
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
                  <input className={inputClass} value={selectedTranslation.seoTitle} onChange={(e) => updateSelectedTranslation({ seoTitle: e.target.value })} />
                  <textarea className={textareaClass} value={selectedTranslation.metaDescription} onChange={(e) => updateSelectedTranslation({ metaDescription: e.target.value })} />
                  <input className={inputClass} value={selectedTranslation.tags.join(", ")} onChange={(e) => updateSelectedTranslation({ tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
                  <input className={inputClass} value={selectedTranslation.slug} onChange={(e) => updateSelectedTranslation({ slug: e.target.value })} />
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
              <QualityGuardrailsPanel
                translationId={selectedTranslation?.id}
                adminOverride={adminOverride}
                overrideReason={overrideReason}
                onBlockedChange={setApprovalBlocked}
                onAdminOverrideChange={setAdminOverride}
                onOverrideReasonChange={setOverrideReason}
              />
            </div>
          </div>
        </Panel>
      ) : null}

      {tab === "Guardrails" ? <GovernancePanel section="Guardrails" /> : null}
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
  return <div className="max-h-[650px] space-y-2 overflow-y-auto pr-1">{translations.map((row) => <button key={row.id} type="button" onClick={() => onSelect(row.id)} className={`block w-full rounded-lg border p-3 text-left ${selectedId === row.id ? "border-[#22c55e] bg-[#22c55e]/10" : "border-[#1f2d26] bg-black/20"}`}><p className="font-semibold text-white">{row.title || "Untitled translation"}</p><p className="mt-1 text-xs text-slate-500">{LANGUAGE_LABELS[row.targetLanguage]} · {row.status}</p></button>)}</div>;
}

function ArticlePreview({ title, article }: { title: string; article?: Article }) {
  if (!article) return <p className="text-sm text-slate-500">No article selected.</p>;
  const meta = inferredArticleMeta(article);
  return (
    <div className="space-y-3 rounded-lg border border-[#1f2d26] bg-black/20 p-4">
      <p className="text-sm font-bold text-white">{title}</p>
      <h3 className="text-lg font-black text-white">{article.title}</h3>
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
  );
}

function GlossaryPanel({ glossary, onSave, busy }: { glossary: GlossaryEntry[]; onSave: (entry: Partial<GlossaryEntry>) => void; busy: boolean }) {
  const [entry, setEntry] = useState<Partial<GlossaryEntry>>({ brand: "PlanetF1", protected: true });
  return <Panel title="Glossary" className="space-y-4 p-5"><h2 className="text-xl font-bold text-white">Glossary and protected terms</h2><div className="grid gap-3 md:grid-cols-5"><input className={inputClass} placeholder="Brand" value={entry.brand ?? ""} onChange={(e) => setEntry({ ...entry, brand: e.target.value })} /><input className={inputClass} placeholder="Source term" value={entry.sourceTerm ?? ""} onChange={(e) => setEntry({ ...entry, sourceTerm: e.target.value })} /><select className={inputClass} value={entry.targetLanguage ?? ""} onChange={(e) => setEntry({ ...entry, targetLanguage: e.target.value as LanguageCode })}><option value="">Any language</option>{targetOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><input className={inputClass} placeholder="Target term" value={entry.targetTerm ?? ""} onChange={(e) => setEntry({ ...entry, targetTerm: e.target.value })} /><label className="mt-3 flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={Boolean(entry.protected)} onChange={(e) => setEntry({ ...entry, protected: e.target.checked })} />Protected</label></div><R365Button type="button" onClick={() => onSave(entry)} disabled={busy}>Save glossary entry</R365Button><div className="grid gap-2 md:grid-cols-2">{glossary.map((row) => <div key={row.id} className="rounded-lg border border-[#1f2d26] p-3 text-sm text-slate-300"><strong className="text-white">{row.sourceTerm}</strong>{row.targetTerm ? ` → ${row.targetTerm}` : ""}<p className="text-xs text-slate-500">{row.brand} · {row.protected ? "protected" : "mapping"}</p></div>)}</div></Panel>;
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
