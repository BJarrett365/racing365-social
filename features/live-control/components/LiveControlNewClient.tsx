"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { PublicPlexaLiveSession } from "@/features/live-control/lib/sanitize-session";
import type { LiveSessionProvider } from "@/features/live-control/types/live-session";
import type { LiveSessionEditingHandoff } from "@/features/live-control/types/live-session-handoff";
import type { RestreamChannel } from "@/features/live-control/services/restream-user-api";
import {
  adminHeaders,
  lcBtnGhost,
  lcBtnGhostStyle,
  lcBtnPrimary,
  lcInputClass,
  lcInputStyle,
  readStoredAdminToken,
  writeStoredAdminToken,
} from "@/features/live-control/components/live-control-ui";

type BrandRow = { slug: string; label: string };

export function LiveControlNewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [adminToken, setAdminToken] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [summary, setSummary] = useState("");
  const [brand, setBrand] = useState("");
  const [provider, setProvider] = useState<LiveSessionProvider>("mux_restream");
  const [headline, setHeadline] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [editingProjectId, setEditingProjectId] = useState("");
  const [approvedStoryId, setApprovedStoryId] = useState("");
  const [assetRefs, setAssetRefs] = useState<string[]>([]);
  const [handoffIntent, setHandoffIntent] = useState<"create" | "send_live" | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [channels, setChannels] = useState<RestreamChannel[] | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAdminToken(readStoredAdminToken());
  }, []);

  const fromEditingProjectId = searchParams.get("fromEditingProjectId")?.trim() ?? "";
  const intentParam = searchParams.get("intent")?.trim() ?? "";

  useEffect(() => {
    if (!fromEditingProjectId) {
      setHandoffError(null);
      return;
    }
    const intent = intentParam === "send_live" ? "send_live" : "create";
    let cancelled = false;
    setHandoffLoading(true);
    setHandoffError(null);
    void (async () => {
      try {
        const q = new URLSearchParams({ intent });
        const res = await fetch(
          `/api/integrations/editing-studio/project/${encodeURIComponent(fromEditingProjectId)}/live-handoff?${q}`,
        );
        const data = await parseApiJson<{ handoff?: LiveSessionEditingHandoff; error?: string }>(res);
        if (!res.ok) throw new Error(data.error || `Handoff failed (${res.status})`);
        const h = data.handoff;
        if (cancelled || !h) return;
        setTitle(h.title);
        setSummary(h.summary ?? "");
        setBrand(h.brand ?? "");
        setHeadline(h.headline ?? "");
        setSourceUrl(h.sourceUrl ?? "");
        setEditingProjectId(h.editingProjectId);
        setAssetRefs(h.assetRefs);
        setHandoffIntent(h.intent);
        setApprovedStoryId(h.intent === "send_live" ? h.editingProjectId : "");
        setDescription(
          h.intent === "send_live"
            ? `Send-to-live handoff from Editing Studio project ${h.editingProjectId}.`
            : `Created from Editing Studio project ${h.editingProjectId}.`,
        );
      } catch (e) {
        if (!cancelled) {
          setHandoffError(e instanceof Error ? e.message : "Could not load Editing Studio handoff");
        }
      } finally {
        if (!cancelled) setHandoffLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromEditingProjectId, intentParam]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/brand-guidelines");
        const data = await parseApiJson<{ brands?: BrandRow[] }>(res);
        if (res.ok && data.brands) setBrands(data.brands);
      } catch {
        /* optional */
      }
    })();
  }, []);

  const loadChannels = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/integrations/restream/channels", { headers: adminHeaders(adminToken) });
      const data = await parseApiJson<{ channels?: RestreamChannel[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || `Channels ${res.status}`);
      setChannels(data.channels ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load Restream channels");
      setChannels([]);
    }
  }, [adminToken]);

  useEffect(() => {
    if (provider === "restream" || provider === "mux_restream") {
      void loadChannels();
    }
  }, [provider, loadChannels]);

  async function createSession() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/live/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders(adminToken) },
        body: JSON.stringify({
          adminToken: adminToken.trim() || undefined,
          title,
          description: description.trim() || undefined,
          brand: brand.trim() || undefined,
          provider,
          restreamChannelIds: selectedChannels.length ? selectedChannels : undefined,
          metadata: {
            headline: headline.trim() || undefined,
            sourceUrl: sourceUrl.trim() || undefined,
            summary: summary.trim() || undefined,
            editingProjectId: editingProjectId.trim() || undefined,
            approvedStoryId: approvedStoryId.trim() || undefined,
            assetRefs: assetRefs.length ? assetRefs : undefined,
            editingHandoffIntent: handoffIntent ?? undefined,
          },
        }),
      });
      const data = await parseApiJson<{ session?: PublicPlexaLiveSession; error?: string }>(res);
      if (!res.ok || !data.session) {
        throw new Error(data.error || `Create failed (${res.status})`);
      }
      router.push(`/live/${encodeURIComponent(data.session.id)}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  function toggleChannel(id: number) {
    setSelectedChannels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Live Control</p>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">New live session</h1>
        </div>
        <Link href="/live" className={lcBtnGhost} style={lcBtnGhostStyle}>
          Back to list
        </Link>
      </div>

      <Panel title="Access">
        <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
          Admin token
          <input
            className={lcInputClass}
            style={lcInputStyle}
            type="password"
            autoComplete="off"
            value={adminToken}
            onChange={(e) => {
              const v = e.target.value;
              setAdminToken(v);
              writeStoredAdminToken(v);
            }}
          />
        </label>
      </Panel>

      {err && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      {fromEditingProjectId && (
        <div
          className="rounded-lg border border-emerald-800/40 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-100"
          role="status"
        >
          {handoffLoading && "Loading data from Editing Studio…"}
          {!handoffLoading && handoffError && <span className="text-amber-200">Handoff: {handoffError}</span>}
          {!handoffLoading && !handoffError && handoffIntent && (
            <>
              Prefilled from Editing Studio project <span className="font-mono">{fromEditingProjectId}</span>
              {handoffIntent === "send_live" ? " (Send to Live)" : " (Create Live Session)"}.
            </>
          )}
        </div>
      )}

      <Panel title="Session">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
            Title
            <input
              className={lcInputClass}
              style={lcInputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Saturday race build-up"
            />
          </label>
          <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
            Brand
            <input
              className={lcInputClass}
              style={lcInputStyle}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Optional"
              list="live-brands"
            />
            <datalist id="live-brands">
              {brands.map((b) => (
                <option key={b.slug} value={b.label} />
              ))}
            </datalist>
          </label>
        </div>

        <label className="mt-4 block text-sm font-medium text-[color:var(--text-secondary)]">
          Editorial summary (metadata)
          <textarea
            className={`${lcInputClass} min-h-[72px] resize-y`}
            style={lcInputStyle}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Short summary for live context / overlays"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-[color:var(--text-secondary)]">
          Description (operators)
          <textarea
            className={`${lcInputClass} min-h-[88px] resize-y`}
            style={lcInputStyle}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Internal notes for operators (not shown on-air)"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-[color:var(--text-secondary)]">
          Provider
          <select
            className={lcInputClass}
            style={lcInputStyle}
            value={provider}
            onChange={(e) => setProvider(e.target.value as LiveSessionProvider)}
          >
            <option value="mux">Mux (ingest + playback)</option>
            <option value="restream">Restream (targets only)</option>
            <option value="mux_restream">Mux + Restream</option>
          </select>
        </label>

        <p className="mt-2 text-xs text-[color:var(--text-muted)]">
          Mux creates a live stream when you press Start on the session page. Restream requires OAuth under{" "}
          <Link href="/live" className="text-[color:var(--accent)] hover:underline">
            Provider accounts
          </Link>
          .
        </p>

        {(provider === "restream" || provider === "mux_restream") && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[color:var(--text-secondary)]">Restream channels</span>
              <button type="button" className={lcBtnGhost} style={lcBtnGhostStyle} onClick={() => void loadChannels()}>
                Reload channels
              </button>
            </div>
            {!channels?.length && (
              <p className="text-sm text-[color:var(--text-muted)]">
                Connect Restream OAuth on the Live Control home page (Provider accounts), then reload channels.
              </p>
            )}
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
              {(channels ?? []).map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={selectedChannels.includes(c.id)}
                      onChange={() => toggleChannel(c.id)}
                    />
                    <span>{c.displayName || `Channel ${c.id}`}</span>
                    {c.active === false && (
                      <span className="text-xs text-[color:var(--text-muted)]">(inactive)</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel title="On-air & story metadata (optional)">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
            On-air headline
            <input
              className={lcInputClass}
              style={lcInputStyle}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
            Source URL
            <input
              className={lcInputClass}
              style={lcInputStyle}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
            Editing Studio project ID
            <input
              className={lcInputClass}
              style={lcInputStyle}
              value={editingProjectId}
              onChange={(e) => setEditingProjectId(e.target.value)}
              placeholder="Set automatically when opened from Editing Studio"
            />
          </label>
          <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
            Approved story / send reference
            <input
              className={lcInputClass}
              style={lcInputStyle}
              value={approvedStoryId}
              onChange={(e) => setApprovedStoryId(e.target.value)}
              placeholder="Optional — prefilled for “Send to Live”"
            />
          </label>
        </div>
        {assetRefs.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-[color:var(--text-secondary)]">Asset references (from project)</p>
            <ul className="mt-1 max-h-32 list-inside list-disc overflow-y-auto text-xs text-[color:var(--text-muted)]">
              {assetRefs.map((r) => (
                <li key={r} className="break-all font-mono">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={lcBtnPrimary} disabled={saving} onClick={() => void createSession()}>
          {saving ? "Creating…" : "Create session"}
        </button>
      </div>
    </div>
  );
}
