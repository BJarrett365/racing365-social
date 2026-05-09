"use client";

import { useEffect, useMemo, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import {
  LANGUAGE_SPORT_CONTEXTS,
  type LanguageArticleAutomationAction,
  type LanguageCode,
  type LanguageContentStyle,
  type LanguageProviderMode,
  type LanguageSportContext,
  type TranslationMode,
} from "@/app/lib/language-studio/types";

type ClientRow = {
  id: string;
  name: string;
  active: boolean;
};

type SourceBrandRow = {
  id: string;
  name: string;
  active: boolean;
};

type JournalistProfileRow = {
  id: string;
  name: string;
  brand: string;
  active: boolean;
};

type Automation = {
  id: string;
  name: string;
  active: boolean;
  clientIds: string[];
  sourceBrands: string[];
  action: LanguageArticleAutomationAction;
  contentStyle: LanguageContentStyle;
  sportContext: LanguageSportContext;
  journalistProfileId?: string;
  rewriteStyle: string;
  editorialGuidelines: string;
  targetLanguages: LanguageCode[];
  providerMode: LanguageProviderMode;
  translationMode: TranslationMode;
  outputStatus: "review_needed" | "draft";
  maxArticlesPerRun: number;
  onlyNewArticles: boolean;
  autoApprove: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  automations?: Automation[];
  clients?: ClientRow[];
  sourceBrands?: SourceBrandRow[];
  journalistProfiles?: JournalistProfileRow[];
  error?: string;
};

const inputClass = "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";
const textareaClass = `${inputClass} min-h-[96px]`;
const checkboxClass = "flex items-center gap-2 text-sm text-slate-300";
const languageOptions: Array<[LanguageCode, string]> = [["en", "English"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["it", "Italian"], ["pt", "Portuguese"]];

function emptyDraft(client?: ClientRow, source?: SourceBrandRow, profile?: JournalistProfileRow): Partial<Automation> {
  return {
    name: "Racing365 rewrite previews",
    active: true,
    clientIds: client ? [client.id] : [],
    sourceBrands: source ? [source.name] : ["Sportinglife"],
    action: "rewrite",
    contentStyle: "Preview",
    sportContext: "Horse Racing",
    journalistProfileId: profile?.id ?? "",
    rewriteStyle: "Original editorial rewrite for Google: fresh structure, sharp intro, natural expert racing tone, no synonym spinning.",
    editorialGuidelines: "Preserve quotes exactly in meaning and quote boundaries. Do not add facts, tips, odds claims, results or opinion beyond the source.",
    targetLanguages: [],
    providerMode: "openai",
    translationMode: "translate-localise",
    outputStatus: "review_needed",
    maxArticlesPerRun: 10,
    onlyNewArticles: true,
    autoApprove: false,
  };
}

function defaultDraftFromRows(clients: ClientRow[], sources: SourceBrandRow[], profiles: JournalistProfileRow[]): Partial<Automation> {
  const activeClients = clients.filter((row) => row.active);
  const activeSources = sources.filter((row) => row.active);
  const activeProfiles = profiles.filter((row) => row.active);
  const client = activeClients.find((row) => row.name.trim().toLowerCase() === "racing365") ?? activeClients[0];
  const source = activeSources.find((row) => row.name.trim().toLowerCase() === "sportinglife") ?? activeSources[0];
  const profile = activeProfiles.find((row) => row.name.trim().toLowerCase() === "editor f365")
    ?? activeProfiles.find((row) => row.name.trim().toLowerCase().includes("editor") && row.brand.trim().toLowerCase().includes("365"))
    ?? activeProfiles[0];
  return emptyDraft(client, source, profile);
}

async function readApiJson<T>(res: Response, fallback: string): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return (await res.json()) as T;
  const text = await res.text();
  const title = text.match(/<title>(.*?)<\/title>/i)?.[1];
  throw new Error(title ? `${fallback}: ${title}` : `${fallback}: server returned ${res.status}`);
}

export function ArticleAutomationsPanel() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [sourceBrands, setSourceBrands] = useState<SourceBrandRow[]>([]);
  const [profiles, setProfiles] = useState<JournalistProfileRow[]>([]);
  const [draft, setDraft] = useState<Partial<Automation>>(emptyDraft());
  const [adminToken, setAdminToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeClients = useMemo(() => clients.filter((row) => row.active), [clients]);
  const activeSources = useMemo(() => sourceBrands.filter((row) => row.active), [sourceBrands]);
  const activeProfiles = useMemo(() => profiles.filter((row) => row.active), [profiles]);
  const racing365 = activeClients.find((row) => row.name.trim().toLowerCase() === "racing365") ?? activeClients[0];
  const sportinglife = activeSources.find((row) => row.name.trim().toLowerCase() === "sportinglife") ?? activeSources[0];
  const editorF365 = activeProfiles.find((row) => row.name.trim().toLowerCase() === "editor f365")
    ?? activeProfiles.find((row) => row.name.trim().toLowerCase().includes("editor") && row.brand.trim().toLowerCase().includes("365"))
    ?? activeProfiles[0];

  const load = async () => {
    const res = await fetch("/api/language/automations");
    const data = await readApiJson<ApiResponse>(res, "Could not load article automations");
    if (!res.ok) throw new Error(data.error || "Could not load article automations.");
    const nextAutomations = data.automations ?? [];
    const nextClients = data.clients ?? [];
    const nextSources = data.sourceBrands ?? [];
    const nextProfiles = data.journalistProfiles ?? [];
    setAutomations(nextAutomations);
    setClients(nextClients);
    setSourceBrands(nextSources);
    setProfiles(nextProfiles);
    setDraft((current) => {
      if (current.id || (current.clientIds?.length ?? 0) > 0 || current.journalistProfileId) return current;
      return defaultDraftFromRows(nextClients, nextSources, nextProfiles);
    });
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Could not load article automations."));
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Automation action failed.");
    } finally {
      setBusy(false);
    }
  };

  const toggleArrayValue = (key: "clientIds" | "sourceBrands" | "targetLanguages", value: string, checked: boolean) => {
    setDraft((row) => ({
      ...row,
      [key]: checked
        ? [...new Set([...(row[key] ?? []), value])]
        : (row[key] ?? []).filter((item) => item !== value),
    }));
  };

  const save = () => run(async () => {
    const res = await fetch("/api/language/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(adminToken ? { "x-admin-token": adminToken } : {}) },
      body: JSON.stringify({ ...draft, adminToken }),
    });
    const data = await readApiJson<{ error?: string; automation?: Automation }>(res, "Automation save failed");
    if (!res.ok) throw new Error(data.error || "Automation save failed.");
    if (!data.automation) throw new Error("Automation save did not return a rule.");
    setDraft(data.automation);
    setMessage(draft.id ? "Automation updated." : "Automation created.");
  });

  const remove = (id: string) => run(async () => {
    const target = automations.find((row) => row.id === id);
    if (!window.confirm(`Delete ${target?.name ?? "this automation"}?`)) return;
    const suffix = adminToken ? `&adminToken=${encodeURIComponent(adminToken)}` : "";
    const res = await fetch(`/api/language/automations?id=${encodeURIComponent(id)}${suffix}`, {
      method: "DELETE",
      headers: adminToken ? { "x-admin-token": adminToken } : undefined,
    });
    const data = await readApiJson<{ error?: string }>(res, "Automation delete failed");
    if (!res.ok) throw new Error(data.error || "Automation delete failed.");
    setDraft(emptyDraft(racing365, sportinglife, editorF365));
    setMessage("Automation deleted.");
  });

  const duplicate = (automation: Automation) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...copy } = automation;
    void _id;
    void _createdAt;
    void _updatedAt;
    setDraft({ ...copy, name: `${automation.name} copy` });
    setMessage("Automation duplicated in the form. Save it to create a new rule.");
  };

  return (
    <div className="space-y-6">
      {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      <section className="rounded-2xl border border-[#1f2d26] bg-[#0a0e0c] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Create / edit automation rule</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Predefine what should happen after feed imports. Rules create rewrite/translation work for the Review Queue; auto-approval is intentionally disabled for now.
            </p>
          </div>
          <R365Button type="button" variant="ghost" onClick={() => setDraft(emptyDraft(racing365, sportinglife, editorF365))}>New rule</R365Button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <label className="text-xs font-semibold uppercase text-slate-500">
            Rule name
            <input className={inputClass} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Action
            <select className={inputClass} value={draft.action ?? "rewrite"} onChange={(e) => setDraft({ ...draft, action: e.target.value as LanguageArticleAutomationAction })}>
              <option value="rewrite">Rewrite articles</option>
              <option value="translate">Translate articles</option>
              <option value="rewrite-translate">Rewrite then translate</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Admin token
            <input className={inputClass} type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} placeholder="When ADMIN_TOKEN is set" />
          </label>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[#1f2d26] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Clients</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {activeClients.map((client) => (
                <label key={client.id} className={checkboxClass}>
                  <input type="checkbox" checked={(draft.clientIds ?? []).includes(client.id)} onChange={(e) => toggleArrayValue("clientIds", client.id, e.target.checked)} />
                  {client.name}
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#1f2d26] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Incoming feeds</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {activeSources.map((source) => (
                <label key={source.id} className={checkboxClass}>
                  <input type="checkbox" checked={(draft.sourceBrands ?? []).includes(source.name)} onChange={(e) => toggleArrayValue("sourceBrands", source.name, e.target.checked)} />
                  {source.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          <label className="text-xs font-semibold uppercase text-slate-500">
            Content style
            <select className={inputClass} value={draft.contentStyle ?? "Preview"} onChange={(e) => setDraft({ ...draft, contentStyle: e.target.value as LanguageContentStyle })}>
              {["News", "Transfer", "Opinion", "Preview", "Review", "Analysis", "Feature", "Live", "Tips"].map((style) => <option key={style} value={style}>{style}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Sport
            <select className={inputClass} value={draft.sportContext ?? "Horse Racing"} onChange={(e) => setDraft({ ...draft, sportContext: e.target.value as LanguageSportContext })}>
              {LANGUAGE_SPORT_CONTEXTS.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Content creator profile
            <select className={inputClass} value={draft.journalistProfileId ?? ""} onChange={(e) => setDraft({ ...draft, journalistProfileId: e.target.value })}>
              <option value="">Manual style</option>
              {activeProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.brand}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Max articles / run
            <input className={inputClass} type="number" min={1} max={100} value={draft.maxArticlesPerRun ?? 10} onChange={(e) => setDraft({ ...draft, maxArticlesPerRun: Number(e.target.value) })} />
          </label>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Rewrite style
            <textarea className={textareaClass} value={draft.rewriteStyle ?? ""} onChange={(e) => setDraft({ ...draft, rewriteStyle: e.target.value })} />
          </label>
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Editorial guidelines
            <textarea className={textareaClass} value={draft.editorialGuidelines ?? ""} onChange={(e) => setDraft({ ...draft, editorialGuidelines: e.target.value })} />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-[#1f2d26] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Translate articles</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <label className="text-xs font-semibold uppercase text-slate-500">
              Provider
              <select className={inputClass} value={draft.providerMode ?? "openai"} onChange={(e) => setDraft({ ...draft, providerMode: e.target.value as LanguageProviderMode })}>
                <option value="openai">OpenAI</option>
                <option value="deepl">DeepL</option>
                <option value="deepl-openai">DeepL + OpenAI localisation</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Translation mode
              <select className={inputClass} value={draft.translationMode ?? "translate-localise"} onChange={(e) => setDraft({ ...draft, translationMode: e.target.value as TranslationMode })}>
                <option value="translate-only">Translate only</option>
                <option value="translate-localise">Translate + localise</option>
                <option value="translate-rewrite">Translate and rewrite</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Output status
              <select className={inputClass} value={draft.outputStatus ?? "review_needed"} onChange={(e) => setDraft({ ...draft, outputStatus: e.target.value as "review_needed" | "draft" })}>
                <option value="review_needed">Needs review</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {languageOptions.map(([code, label]) => (
              <label key={code} className={checkboxClass}>
                <input type="checkbox" checked={(draft.targetLanguages ?? []).includes(code)} onChange={(e) => toggleArrayValue("targetLanguages", code, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className={checkboxClass}><input type="checkbox" checked={draft.active ?? true} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />Active</label>
          <label className={checkboxClass}><input type="checkbox" checked={draft.onlyNewArticles ?? true} onChange={(e) => setDraft({ ...draft, onlyNewArticles: e.target.checked })} />Only new/unprocessed articles</label>
          <label className={checkboxClass}><input type="checkbox" checked={false} disabled />Auto-approve disabled</label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <R365Button type="button" onClick={() => void save()} disabled={busy}>{busy ? "Saving..." : draft.id ? "Save changes" : "Create rule"}</R365Button>
          {draft.id ? <R365Button type="button" variant="ghost" onClick={() => void remove(draft.id as string)} disabled={busy}>Delete</R365Button> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[#1f2d26] bg-[#0a0e0c] p-5">
        <h2 className="text-xl font-black text-white">Automation rules</h2>
        <div className="mt-4 space-y-3">
          {automations.length === 0 ? <p className="text-sm text-slate-500">No automation rules yet.</p> : automations.map((automation) => (
            <div key={automation.id} className="rounded-xl border border-[#1f2d26] bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{automation.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {automation.action} · {automation.contentStyle} · {automation.sportContext} · {automation.outputStatus === "review_needed" ? "Needs review" : "Draft"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{automation.sourceBrands.join(", ") || "All feeds"} → {automation.clientIds.length} client(s)</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${automation.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-900/40 text-slate-300"}`}>
                  {automation.active ? "active" : "paused"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded-lg border border-[#1f2d26] px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-[#22c55e]/50" onClick={() => setDraft(automation)}>Edit</button>
                <button type="button" className="rounded-lg border border-[#1f2d26] px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-[#22c55e]/50" onClick={() => duplicate(automation)}>Duplicate</button>
                <button type="button" className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10" onClick={() => void remove(automation.id)} disabled={busy}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
