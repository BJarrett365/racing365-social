"use client";

import { useCallback, useEffect, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";

type AiConfig = {
  defaultProvider: "openai" | "deepseek";
  enableDeepseek: boolean;
  openaiConfigured: boolean;
  deepseekConfigured: boolean;
};

type LogEntry = {
  id: string;
  timestamp: string;
  task: string;
  provider: string;
  model: string;
  latencyMs: number;
  costEstimateUsd: number;
  fallbackUsed: boolean;
  success: boolean;
  errorReason?: string;
};

type CompareResult = {
  openai: { text?: string; model?: string; latencyMs?: number; costEstimateUsd?: number; error?: string };
  deepseek: { text?: string; model?: string; latencyMs?: number; costEstimateUsd?: number; error?: string };
};

export function AiProviderGatewayPanel({ onClose }: { onClose?: () => void }) {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [defaultProvider, setDefaultProvider] = useState<"openai" | "deepseek">("openai");
  const [enableDeepseek, setEnableDeepseek] = useState(false);
  const [compareArticle, setCompareArticle] = useState("");
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(studioApiPath("/api/dev-gateway/ai-provider"), { credentials: "include" });
    const data = (await res.json()) as { config?: AiConfig; recentLogs?: LogEntry[] };
    if (data.config) {
      setConfig(data.config);
      setDefaultProvider(data.config.defaultProvider);
      setEnableDeepseek(data.config.enableDeepseek);
    }
    setLogs(data.recentLogs ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async () => {
    setBusy("save");
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(studioApiPath("/api/dev-gateway/ai-provider"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ defaultAiProvider: defaultProvider, enableDeepseek }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; config?: AiConfig };
      if (!res.ok || !data.ok) throw new Error(data.error || "Save failed");
      if (data.config) setConfig(data.config);
      setStatus("AI provider settings saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const testConnection = async (provider: "openai" | "deepseek") => {
    setBusy(`test-${provider}`);
    setError(null);
    try {
      const res = await fetch(studioApiPath("/api/dev-gateway/ai-provider/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; modelCount?: number };
      if (!data.ok) throw new Error(data.error || `${provider} connection failed`);
      setStatus(
        provider === "openai"
          ? `OpenAI OK (${data.modelCount ?? "?"} models).`
          : "DeepSeek connection OK.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection test failed");
    } finally {
      setBusy(null);
    }
  };

  const runCompare = async () => {
    setBusy("compare");
    setError(null);
    setCompareResult(null);
    try {
      const res = await fetch(studioApiPath("/api/dev-gateway/ai-provider/compare"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ article: compareArticle.trim() || undefined }),
      });
      const data = (await res.json()) as CompareResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "Compare failed");
      setCompareResult(data);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border bg-[color:var(--surface)] p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-wide text-[color:var(--text-primary)]">AI Providers</h3>
        {onClose ? (
          <button type="button" onClick={onClose} className="text-xs font-bold text-[color:var(--text-muted)]">
            Close
          </button>
        ) : null}
      </div>

      <p className="text-xs leading-5 text-[color:var(--text-muted)]">
        DeepSeek = low-cost processing. OpenAI = premium editorial. Keys stay server-side only.
      </p>

      {config ? (
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-[color:var(--text-secondary)]">
          <span className="rounded-full border px-2 py-1" style={{ borderColor: "var(--border)" }}>
            OpenAI: {config.openaiConfigured ? "configured" : "missing"}
          </span>
          <span className="rounded-full border px-2 py-1" style={{ borderColor: "var(--border)" }}>
            DeepSeek: {config.deepseekConfigured ? "configured" : "missing"}
          </span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-[color:var(--text-secondary)]">
          Default provider
          <select
            value={defaultProvider}
            onChange={(e) => setDefaultProvider(e.target.value as "openai" | "deepseek")}
            className="mt-1 w-full rounded-xl border bg-[color:var(--surface-muted)] px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </label>
        <label className="flex items-end gap-2 text-sm font-semibold text-[color:var(--text-secondary)]">
          <input
            type="checkbox"
            checked={enableDeepseek}
            onChange={(e) => setEnableDeepseek(e.target.checked)}
            className="size-4"
          />
          Enable DeepSeek processing layer
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <R365Button variant="primary" onClick={() => void saveSettings()} disabled={busy === "save"}>
          Save settings
        </R365Button>
        <R365Button variant="ghost" onClick={() => void testConnection("openai")} disabled={!!busy}>
          Test OpenAI
        </R365Button>
        <R365Button variant="ghost" onClick={() => void testConnection("deepseek")} disabled={!!busy}>
          Test DeepSeek
        </R365Button>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-[color:var(--text-secondary)]">
          Compare providers (same article)
          <textarea
            value={compareArticle}
            onChange={(e) => setCompareArticle(e.target.value)}
            rows={4}
            placeholder="Paste article text or leave blank for sample…"
            className="mt-1 w-full rounded-xl border bg-[color:var(--surface-muted)] px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)" }}
          />
        </label>
        <R365Button variant="ghost" onClick={() => void runCompare()} disabled={busy === "compare"}>
          Compare OpenAI vs DeepSeek
        </R365Button>
      </div>

      {compareResult ? (
        <div className="grid gap-3 md:grid-cols-2">
          {(["openai", "deepseek"] as const).map((key) => {
            const side = compareResult[key];
            return (
              <div key={key} className="rounded-xl bg-[color:var(--surface-muted)] p-3">
                <p className="text-xs font-black uppercase tracking-wide text-[color:var(--text-muted)]">{key}</p>
                {side.error ? (
                  <p className="mt-2 text-sm text-[color:var(--danger)]">{side.error}</p>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      {side.model} · {side.latencyMs}ms · ~${(side.costEstimateUsd ?? 0).toFixed(5)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--text-secondary)]">{side.text}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {logs.length > 0 ? (
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[color:var(--text-muted)]">Recent provider logs</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-[color:var(--text-secondary)]">
            {logs.slice(0, 8).map((log) => (
              <li key={log.id} className="rounded-lg bg-[color:var(--surface-muted)] px-2 py-1">
                {log.provider}/{log.task} · {log.latencyMs}ms · ${log.costEstimateUsd.toFixed(5)}
                {log.fallbackUsed ? " · fallback" : ""}
                {!log.success && log.errorReason ? ` · ${log.errorReason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm font-semibold text-[color:var(--danger)]">{error}</p> : null}
      {status ? <p className="text-sm font-semibold text-emerald-300">{status}</p> : null}
    </div>
  );
}
