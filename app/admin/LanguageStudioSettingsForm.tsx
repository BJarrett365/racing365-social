"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";

type LanguageSettingsStatus = {
  providerMode: "openai" | "deepl" | "deepl-openai";
  openaiModel: string;
  openaiConfigured: boolean;
  deeplConfigured: boolean;
  deeplApiKeyMasked?: string;
  deeplApiUrl?: string;
  adminTokenRequired: boolean;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";

export function LanguageStudioSettingsForm() {
  const [status, setStatus] = useState<LanguageSettingsStatus | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [deeplApiKey, setDeeplApiKey] = useState("");
  const [deeplApiUrl, setDeeplApiUrl] = useState("");
  const [languageProviderMode, setLanguageProviderMode] = useState<LanguageSettingsStatus["providerMode"]>("openai");
  const [languageOpenaiModel, setLanguageOpenaiModel] = useState("gpt-4o-mini");
  const [clearDeeplKey, setClearDeeplKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/language/settings");
    const data = (await res.json()) as LanguageSettingsStatus & { error?: string };
    if (!res.ok) throw new Error(data.error || "Failed to load language settings");
    setStatus(data);
    setLanguageProviderMode(data.providerMode);
    setLanguageOpenaiModel(data.openaiModel || "gpt-4o-mini");
    setDeeplApiUrl(data.deeplApiUrl || "");
  };

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load language settings"));
  }, []);

  const save = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const tok = adminToken.trim();
      const res = await fetch("/api/language/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tok ? { "x-admin-token": tok } : {}),
        },
        body: JSON.stringify({
          adminToken: tok || undefined,
          deeplApiKey: deeplApiKey.trim() || undefined,
          deeplApiUrl: deeplApiUrl.trim() || undefined,
          languageProviderMode,
          languageOpenaiModel: languageOpenaiModel.trim() || undefined,
          clearDeeplKey,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage("Language Studio settings saved.");
      setDeeplApiKey("");
      setClearDeeplKey(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Language Studio" className="space-y-4 p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22c55e]">Language Studio</p>
        <h2 className="mt-1 text-xl font-black text-white">Provider keys and language engine settings</h2>
        <p className="mt-2 text-sm text-slate-400">
          OpenAI is the default MVP provider. DeepL is optional and can be combined with OpenAI localisation.
        </p>
      </div>
      {status ? (
        <div className="grid gap-3 text-xs text-slate-300 md:grid-cols-2">
          <div>OpenAI configured: {status.openaiConfigured ? "yes" : "no"}</div>
          <div>DeepL configured: {status.deeplConfigured ? "yes" : "no"} {status.deeplApiKeyMasked ? `(${status.deeplApiKeyMasked})` : ""}</div>
        </div>
      ) : null}
      {status?.adminTokenRequired ? (
        <div className="rounded-xl border border-[#1f2d26] bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Admin token</p>
              <p className="mt-1 text-xs text-slate-500">Required before protected Language Studio settings can be saved.</p>
            </div>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs font-bold text-amber-200">
              Required
            </span>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            ADMIN_TOKEN
            <input className={inputClass} type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} />
          </label>
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Provider mode
          <select className={inputClass} value={languageProviderMode} onChange={(e) => setLanguageProviderMode(e.target.value as LanguageSettingsStatus["providerMode"])}>
            <option value="openai">OpenAI only</option>
            <option value="deepl">DeepL only</option>
            <option value="deepl-openai">DeepL + OpenAI localisation</option>
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          OpenAI model
          <input className={inputClass} value={languageOpenaiModel} onChange={(e) => setLanguageOpenaiModel(e.target.value)} placeholder="gpt-4o-mini" />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          DeepL API URL (optional)
          <input className={inputClass} value={deeplApiUrl} onChange={(e) => setDeeplApiUrl(e.target.value)} placeholder="https://api-free.deepl.com" />
        </label>
      </div>
      <div className="rounded-xl border border-[#1f2d26] bg-black/20 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">DeepL</p>
            <p className="mt-1 text-xs text-slate-500">Translation provider key for DeepL-only or DeepL + OpenAI localisation mode.</p>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${status?.deeplConfigured ? "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]" : "border-slate-700 bg-slate-900/40 text-slate-500"}`}>
            {status?.deeplConfigured ? "Key on file" : "Optional"}
          </span>
        </div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          DEEPL_API_KEY
          <input
            className={inputClass}
            type="password"
            value={deeplApiKey}
            onChange={(e) => setDeeplApiKey(e.target.value)}
            placeholder={status?.deeplConfigured ? "Leave blank to keep existing, or enter new key" : "Paste new DeepL key"}
          />
        </label>
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={clearDeeplKey} onChange={(e) => setClearDeeplKey(e.target.checked)} />
          Clear stored DeepL key
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <R365Button type="button" onClick={() => void save()} disabled={busy}>{busy ? "Saving..." : "Save Language Studio settings"}</R365Button>
        {message ? <span className="text-xs text-emerald-400">{message}</span> : null}
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </div>
    </Panel>
  );
}
