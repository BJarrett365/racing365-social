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
  deeplKeySource?: "admin" | "environment" | "none";
  deeplApiUrl?: string;
  adminTokenRequired: boolean;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";

export function LanguageStudioSettingsForm() {
  const [status, setStatus] = useState<LanguageSettingsStatus | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [deeplApiKey, setDeeplApiKey] = useState("");
  const [deeplKeyDirty, setDeeplKeyDirty] = useState(false);
  const [deeplApiUrl, setDeeplApiUrl] = useState("");
  const [languageProviderMode, setLanguageProviderMode] = useState<LanguageSettingsStatus["providerMode"]>("openai");
  const [languageOpenaiModel, setLanguageOpenaiModel] = useState("gpt-4o-mini");
  const [clearDeeplKey, setClearDeeplKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deeplCheckBusy, setDeeplCheckBusy] = useState(false);
  const [deeplCheckMessage, setDeeplCheckMessage] = useState<string | null>(null);
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
    setDeeplKeyDirty(false);
    setDeeplApiKey("");
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
          deeplApiKey: deeplKeyDirty ? deeplApiKey.trim() || undefined : undefined,
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
      setDeeplKeyDirty(false);
      setClearDeeplKey(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const testDeeplConnection = async () => {
    setDeeplCheckBusy(true);
    setDeeplCheckMessage(null);
    setError(null);
    try {
      const tok = adminToken.trim();
      const res = await fetch("/api/admin/deepl-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tok ? { "x-admin-token": tok } : {}),
        },
        body: JSON.stringify({
          adminToken: tok || undefined,
          deeplApiKey: deeplKeyDirty ? deeplApiKey.trim() || undefined : undefined,
          deeplApiUrl: deeplApiUrl.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        serverUrl?: string;
        characterCount?: number | null;
        characterLimit?: number | null;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "DeepL connection failed");
      const usage =
        data.characterCount != null && data.characterLimit != null
          ? ` Usage: ${data.characterCount.toLocaleString()} / ${data.characterLimit.toLocaleString()} characters.`
          : "";
      setDeeplCheckMessage(`DeepL connected (${data.serverUrl ?? "default API"}).${usage}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "DeepL connection failed");
    } finally {
      setDeeplCheckBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="Language Studio provider mode" className="space-y-4 p-5">
        <p className="text-sm text-slate-400">
          OpenAI is the default MVP provider. DeepL is optional for translation and can be combined with OpenAI
          localisation. Environment variables still override stored values when set.
        </p>
        {status ? (
          <div className="grid gap-3 text-xs text-slate-300 md:grid-cols-2">
            <div>OpenAI configured: {status.openaiConfigured ? "yes" : "no"}</div>
            <div>
              DeepL configured: {status.deeplConfigured ? "yes" : "no"}
              {status.deeplApiKeyMasked ? ` (${status.deeplApiKeyMasked})` : ""}
              {status.deeplKeySource === "environment" ? " — from env" : ""}
            </div>
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
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Provider mode
            <select
              className={inputClass}
              value={languageProviderMode}
              onChange={(e) => setLanguageProviderMode(e.target.value as LanguageSettingsStatus["providerMode"])}
            >
              <option value="openai">OpenAI only</option>
              <option value="deepl">DeepL only</option>
              <option value="deepl-openai">DeepL + OpenAI localisation</option>
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            OpenAI model
            <input
              className={inputClass}
              value={languageOpenaiModel}
              onChange={(e) => setLanguageOpenaiModel(e.target.value)}
              placeholder="gpt-4o-mini"
            />
          </label>
        </div>
      </Panel>

      <Panel title="Translation (DeepL)">
        <p className="text-sm text-slate-400">
          Used by Language Studio when provider mode is <strong className="text-slate-300">DeepL only</strong> or{" "}
          <strong className="text-slate-300">DeepL + OpenAI localisation</strong>. Free-tier keys use the free API host;
          Pro keys use the default API.
        </p>
        <div className="mt-3 rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3">
          <p className="text-xs font-semibold text-slate-300">DeepL API keys &amp; account</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Free API: <code>https://api-free.deepl.com</code> · Pro API: <code>https://api.deepl.com</code>
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <a
              className="inline-flex text-[11px] font-semibold normal-case text-[#22c55e] hover:underline"
              href="https://www.deepl.com/en/your-account/keys"
              target="_blank"
              rel="noreferrer noopener"
            >
              Open DeepL API keys →
            </a>
            <a
              className="inline-flex text-[11px] font-semibold normal-case text-[#22c55e] hover:underline"
              href="https://www.deepl.com/en/pro-api"
              target="_blank"
              rel="noreferrer noopener"
            >
              DeepL API documentation →
            </a>
            <a
              className="inline-flex text-[11px] font-semibold normal-case text-[#22c55e] hover:underline"
              href="https://www.deepl.com/en/your-account/summary"
              target="_blank"
              rel="noreferrer noopener"
            >
              Open DeepL account →
            </a>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <label className="block text-xs font-semibold uppercase text-slate-500">
            DEEPL_API_KEY
            <input
              type="password"
              className={inputClass}
              value={
                clearDeeplKey
                  ? ""
                  : deeplApiKey || (deeplKeyDirty ? "" : (status?.deeplApiKeyMasked ?? ""))
              }
              onChange={(e) => {
                setDeeplKeyDirty(true);
                setDeeplApiKey(e.target.value);
              }}
              placeholder={status?.deeplConfigured ? "••••••••  enter new key to replace" : "Paste DeepL auth key…"}
              autoComplete="off"
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={clearDeeplKey} onChange={(e) => setClearDeeplKey(e.target.checked)} />
              Remove stored DeepL key
            </label>
            <div className="mt-3">
              <R365Button variant="ghost" onClick={() => void testDeeplConnection()} disabled={deeplCheckBusy}>
                {deeplCheckBusy ? "Testing DeepL…" : "Test DeepL key"}
              </R365Button>
              {deeplCheckMessage ? (
                <p className="mt-2 text-xs normal-case text-[#22c55e]">{deeplCheckMessage}</p>
              ) : null}
            </div>
          </label>
          <label className="block text-xs font-semibold uppercase text-slate-500">
            DEEPL_API_URL (optional)
            <input
              className={inputClass}
              value={deeplApiUrl}
              onChange={(e) => setDeeplApiUrl(e.target.value)}
              placeholder="https://api-free.deepl.com"
            />
            <p className="mt-1 text-[11px] normal-case text-slate-500">
              Leave blank for Pro API default. Free-tier keys: use <code>https://api-free.deepl.com</code>
            </p>
          </label>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <R365Button type="button" onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save Language Studio settings"}
        </R365Button>
        {message ? <span className="text-xs text-emerald-400">{message}</span> : null}
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </div>
    </div>
  );
}
