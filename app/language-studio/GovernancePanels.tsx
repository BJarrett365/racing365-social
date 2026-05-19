"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { LANGUAGE_LABELS, type LanguageCode } from "@/app/lib/language-studio/types";
import { studioApiPath } from "@/app/lib/app-base-path";

type Section = "Guardrails" | "Protected Terms" | "Market Rules" | "Prompt Rules" | "Compliance Notes" | "Quality Checks" | "Knowledge Files" | "Journalists";
type GovernanceData = Record<string, Array<Record<string, unknown>>>;

const inputClass = "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";
const textareaClass = `${inputClass} min-h-24 font-mono text-xs`;

function csv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function GovernancePanel({ section }: { section: Section }) {
  const [data, setData] = useState<GovernanceData>({});
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const collection = useMemo(() => {
    if (section === "Protected Terms") return "protectedTerms";
    if (section === "Market Rules") return "marketRules";
    if (section === "Prompt Rules") return "promptRules";
    if (section === "Compliance Notes") return "complianceNotes";
    if (section === "Guardrails") return "guardrails";
    if (section === "Journalists") return "journalistProfiles";
    return "";
  }, [section]);

  const rows = collection ? data[collection] ?? [] : [];

  const load = async () => {
    const res = await fetch(studioApiPath("/api/language/governance"));
    const next = await res.json();
    if (!res.ok) throw new Error(next.error || "Governance load failed");
    setData(next);
  };

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Governance load failed"));
  }, []);

  const save = async () => {
    if (!collection) return;
    setError(null);
    setMessage(null);
    const res = await fetch(studioApiPath("/api/language/governance"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, item: draft }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Save failed");
      return;
    }
    setDraft({});
    setMessage(`${section} saved.`);
    await load();
  };

  if (section === "Knowledge Files") {
    const journalistProfiles = data.journalistProfiles ?? [];
    const knowledgeFiles = data.knowledgeFiles ?? [];
    return (
      <Panel title="Knowledge Files" className="space-y-4 p-5">
        <h2 className="text-xl font-bold text-white">Knowledge Files</h2>
        <p className="text-sm text-slate-400">Knowledge is now split into Brand Tone, Content Creator Styles, Glossary, Protected Terms, Market Rules, Sport Rules, Prompt Rules, Compliance Notes and Translation Memory. Creator styles are built from imported article authors.</p>
        {knowledgeFiles.length ? (
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase text-slate-500">AI Quality Fix Lessons</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {knowledgeFiles.map((row) => (
                <div key={String(row.id)} className="rounded-lg border border-[#1f2d26] bg-black/20 p-3 text-sm text-slate-300">
                  <p className="font-semibold text-white">{String(row.title)}</p>
                  <p className="mt-1 text-xs text-slate-500">{String(row.kind)}{row.language ? ` · ${String(row.language)}` : ""}</p>
                  <p className="mt-2 whitespace-pre-line text-xs text-slate-400">{String(row.content || "")}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid gap-2 md:grid-cols-2">
          {journalistProfiles.map((row) => (
            <div key={String(row.id)} className="rounded-lg border border-[#1f2d26] bg-black/20 p-3 text-sm text-slate-300">
              <p className="font-semibold text-white">{String(row.name)} · {String(row.brand)}</p>
              <p className="mt-1 text-xs text-slate-500">
                Content Creator Style · {Array.isArray(row.sports) && row.sports.length ? row.sports.join(", ") : "No sports tagged yet"}
              </p>
              <p className="mt-2 whitespace-pre-line text-xs text-slate-400">{String(row.styleNotes || "No style profile yet.")}</p>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  if (section === "Quality Checks") {
    return (
      <Panel title="Quality Checks" className="space-y-4 p-5">
        <h2 className="text-xl font-bold text-white">Quality Checks</h2>
        <p className="text-sm text-slate-400">Quality checks run in the Review Editor before approval. Red issues block approval unless an admin override reason is supplied.</p>
        <div className="grid gap-2 md:grid-cols-3">
          {["Missing title/body", "Changed numbers/quotes", "Protected terms changed", "SEO/meta length", "Risk/compliance terms", "Possible hallucination"].map((item) => (
            <div key={item} className="rounded-lg border border-[#1f2d26] p-3 text-sm text-slate-300">{item}</div>
          ))}
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={section === "Journalists" ? "Content Creators" : section} className="space-y-4 p-5">
      <div>
        <h2 className="text-xl font-bold text-white">{section === "Journalists" ? "Content Creators" : section}</h2>
        <p className="mt-1 text-sm text-slate-400">Create and edit Language Studio governance data. These controls only affect Language Studio.</p>
      </div>
      {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}
      {section === "Guardrails" ? <GuardrailForm draft={draft} setDraft={setDraft} /> : null}
      {section === "Protected Terms" ? <ProtectedTermForm draft={draft} setDraft={setDraft} /> : null}
      {section === "Market Rules" ? <MarketRuleForm draft={draft} setDraft={setDraft} /> : null}
      {section === "Prompt Rules" ? <PromptRuleForm draft={draft} setDraft={setDraft} /> : null}
      {section === "Compliance Notes" ? <ComplianceForm draft={draft} setDraft={setDraft} /> : null}
      {section === "Journalists" ? <JournalistForm draft={draft} setDraft={setDraft} /> : null}
      <R365Button type="button" onClick={() => void save()}>Save {section === "Journalists" ? "Content Creator" : section}</R365Button>
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map((row) => (
          <button key={String(row.id)} type="button" onClick={() => setDraft(row)} className="rounded-lg border border-[#1f2d26] bg-black/20 p-3 text-left text-sm text-slate-300">
            <p className="font-semibold text-white">{String(row.title || row.term || row.market || row.contentType || row.riskType || row.name || row.id)}</p>
            <p className="mt-1 line-clamp-3 text-xs text-slate-500">{String(row.rule || row.notes || row.toneRules || row.promptInstruction || row.action || row.styleNotes || "")}</p>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function GuardrailForm({ draft, setDraft }: { draft: Record<string, unknown>; setDraft: (next: Record<string, unknown>) => void }) {
  return <div className="grid gap-3 md:grid-cols-4"><input className={inputClass} placeholder="Title" value={String(draft.title ?? "")} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><select className={inputClass} value={String(draft.category ?? "fact-safety")} onChange={(e) => setDraft({ ...draft, category: e.target.value })}><option value="fact-safety">Fact Safety</option><option value="translation-safety">Translation Safety</option><option value="editorial-safety">Editorial Safety</option><option value="seo-safety">SEO Safety</option><option value="compliance-safety">Compliance Safety</option><option value="rights-safety">Rights Safety</option></select><select className={inputClass} value={String(draft.severity ?? "amber")} onChange={(e) => setDraft({ ...draft, severity: e.target.value })}><option value="green">Green</option><option value="amber">Amber</option><option value="red">Red</option></select><label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={draft.active !== false} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />Active</label><textarea className={`${textareaClass} md:col-span-4`} placeholder="Rule" value={String(draft.rule ?? "")} onChange={(e) => setDraft({ ...draft, rule: e.target.value })} /></div>;
}

function ProtectedTermForm({ draft, setDraft }: { draft: Record<string, unknown>; setDraft: (next: Record<string, unknown>) => void }) {
  return <div className="grid gap-3 md:grid-cols-4"><input className={inputClass} placeholder="Term" value={String(draft.term ?? "")} onChange={(e) => setDraft({ ...draft, term: e.target.value })} /><select className={inputClass} value={String(draft.type ?? "technical term")} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option>driver</option><option>team</option><option>race</option><option>sponsor</option><option>person</option><option>place</option><option>technical term</option></select><input className={inputClass} placeholder="Approved variants, comma-separated" value={Array.isArray(draft.approvedVariants) ? draft.approvedVariants.join(", ") : ""} onChange={(e) => setDraft({ ...draft, approvedVariants: csv(e.target.value) })} /><label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={draft.doNotTranslate !== false} onChange={(e) => setDraft({ ...draft, doNotTranslate: e.target.checked })} />Do not translate</label><textarea className={`${textareaClass} md:col-span-4`} placeholder="Notes" value={String(draft.notes ?? "")} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>;
}

function MarketRuleForm({ draft, setDraft }: { draft: Record<string, unknown>; setDraft: (next: Record<string, unknown>) => void }) {
  return <div className="grid gap-3 md:grid-cols-4"><input className={inputClass} placeholder="Market" value={String(draft.market ?? "")} onChange={(e) => setDraft({ ...draft, market: e.target.value })} /><select className={inputClass} value={String(draft.language ?? "es")} onChange={(e) => setDraft({ ...draft, language: e.target.value as LanguageCode })}>{Object.entries(LANGUAGE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><input className={inputClass} placeholder="Locale code" value={String(draft.locale ?? "")} onChange={(e) => setDraft({ ...draft, locale: e.target.value })} /><select className={inputClass} value={String(draft.direction ?? "ltr")} onChange={(e) => setDraft({ ...draft, direction: e.target.value })}><option value="ltr">LTR</option><option value="rtl">RTL</option></select>{["seoKeywordRules", "toneRules", "spellingRules", "headlineStyleNotes", "seoNotes", "dateFormat", "timeFormat", "currencyFormat", "complianceNotes"].map((field) => <textarea key={field} className={textareaClass} placeholder={field} value={String(draft[field] ?? "")} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />)}</div>;
}

function PromptRuleForm({ draft, setDraft }: { draft: Record<string, unknown>; setDraft: (next: Record<string, unknown>) => void }) {
  return <div className="grid gap-3 md:grid-cols-4"><select className={inputClass} value={String(draft.language ?? "")} onChange={(e) => setDraft({ ...draft, language: e.target.value })}><option value="">Any language</option>{Object.entries(LANGUAGE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><input className={inputClass} placeholder="Content type" value={String(draft.contentType ?? "")} onChange={(e) => setDraft({ ...draft, contentType: e.target.value })} /><input className={inputClass} type="number" placeholder="Priority" value={String(draft.priority ?? 0)} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} /><label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={draft.active !== false} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />Active</label><textarea className={`${textareaClass} md:col-span-4`} placeholder="Prompt instruction" value={String(draft.promptInstruction ?? "")} onChange={(e) => setDraft({ ...draft, promptInstruction: e.target.value })} /></div>;
}

function ComplianceForm({ draft, setDraft }: { draft: Record<string, unknown>; setDraft: (next: Record<string, unknown>) => void }) {
  return <div className="grid gap-3 md:grid-cols-4"><input className={inputClass} placeholder="Market" value={String(draft.market ?? "")} onChange={(e) => setDraft({ ...draft, market: e.target.value })} /><input className={inputClass} placeholder="Risk type" value={String(draft.riskType ?? "")} onChange={(e) => setDraft({ ...draft, riskType: e.target.value })} /><label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={Boolean(draft.escalationRequired)} onChange={(e) => setDraft({ ...draft, escalationRequired: e.target.checked })} />Escalation required</label><div /><textarea className={textareaClass} placeholder="Rule" value={String(draft.rule ?? "")} onChange={(e) => setDraft({ ...draft, rule: e.target.value })} /><textarea className={textareaClass} placeholder="Action" value={String(draft.action ?? "")} onChange={(e) => setDraft({ ...draft, action: e.target.value })} /></div>;
}

function JournalistForm({ draft, setDraft }: { draft: Record<string, unknown>; setDraft: (next: Record<string, unknown>) => void }) {
  return <div className="grid gap-3 md:grid-cols-4"><input className={inputClass} placeholder="Content creator name" value={String(draft.name ?? "")} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><input className={inputClass} placeholder="Brand" value={String(draft.brand ?? "")} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} /><input className={inputClass} placeholder="Sports, comma-separated" value={Array.isArray(draft.sports) ? draft.sports.join(", ") : ""} onChange={(e) => setDraft({ ...draft, sports: csv(e.target.value) })} /><label className="mt-3 flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={draft.active !== false} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />Active</label><textarea className={`${textareaClass} md:col-span-2`} placeholder="Creator style: tone, rhythm, structure, sentence length, headline habits" value={String(draft.styleNotes ?? "")} onChange={(e) => setDraft({ ...draft, styleNotes: e.target.value })} /><textarea className={`${textareaClass} md:col-span-2`} placeholder="Article / editorial guidelines for this creator style" value={String(draft.articleGuidelines ?? "")} onChange={(e) => setDraft({ ...draft, articleGuidelines: e.target.value })} /><textarea className={`${textareaClass} md:col-span-4`} placeholder="Example titles, one per line" value={Array.isArray(draft.exampleTitles) ? draft.exampleTitles.join("\n") : ""} onChange={(e) => setDraft({ ...draft, exampleTitles: e.target.value.split(/\n+/).map((item) => item.trim()).filter(Boolean) })} /></div>;
}
