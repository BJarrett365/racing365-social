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
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Admin token
          <input className={inputClass} type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} />
        </label>
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
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        DeepL API key
        <input className={inputClass} type="password" value={deeplApiKey} onChange={(e) => setDeeplApiKey(e.target.value)} placeholder="Paste new DeepL key" />
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" checked={clearDeeplKey} onChange={(e) => setClearDeeplKey(e.target.checked)} />
        Clear stored DeepL key
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <R365Button type="button" onClick={() => void save()} disabled={busy}>{busy ? "Saving..." : "Save Language Studio settings"}</R365Button>
        {message ? <span className="text-xs text-emerald-400">{message}</span> : null}
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </div>
    </Panel>
  );
}
