"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";

type BrandRow = {
  slug: string;
  label: string;
  body: string;
  updatedAt: string;
};

export function BrandGuidelinesTab() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/brand-guidelines");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load brand guidelines.");
      setBrands(data.brands ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(slug: string) {
    const row = brands.find((b) => b.slug === slug);
    if (!row) return;
    setSavingSlug(slug);
    setError(null);
    try {
      const res = await fetch("/api/brand-guidelines", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, body: row.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingSlug(null);
    }
  }

  function setBody(slug: string, body: string) {
    setBrands((prev) => prev.map((b) => (b.slug === slug ? { ...b, body } : b)));
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading brand guidelines…</p>;
  }

  return (
    <div className="space-y-6">
      <Panel title="How this is used">
        <p className="text-sm leading-relaxed text-slate-400">
          Text you save here is appended to relevant AI calls:{" "}
          <strong className="text-slate-300">improve racing voiceover</strong> (by template format → brand) and{" "}
          <strong className="text-slate-300">Runway background prompt</strong> (by Racing365 / TEAMtalk / PlanetF1).
          The <strong className="text-slate-300">Planet Sport Studio</strong> field loads from{" "}
          <code className="text-slate-500">data/plexa-brand-guidelines-ui-kit.txt</code> (Planet Sport Studio App UI Kit) unless you
          override it here. <strong className="text-slate-300">F365</strong> is pre-filled from{" "}
          <code className="text-slate-500">data/f365-brand-guidelines-full.txt</code> (F365 Brand Guidelines V1.0). You
          can edit any field; saves override the bundled files for that environment.
        </p>
      </Panel>

      {error && (
        <p className="rounded-lg border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>
      )}

      <div className="space-y-6">
        {brands.map((b) => (
          <Panel key={b.slug} title={b.label}>
            <p className="mb-2 font-mono text-[10px] text-slate-600">
              Key: <span className="text-slate-500">{b.slug}</span>
              {b.updatedAt ? (
                <span className="ml-2 text-slate-600">
                  · Last saved {new Date(b.updatedAt).toLocaleString()}
                </span>
              ) : null}
            </p>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Guidelines text for AI
              <textarea
                className="mt-1 min-h-[180px] w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 font-mono text-xs text-slate-200"
                value={b.body}
                onChange={(e) => setBody(b.slug, e.target.value)}
                spellCheck={true}
              />
            </label>
            <div className="mt-3">
              <R365Button type="button" disabled={savingSlug === b.slug} onClick={() => void save(b.slug)}>
                {savingSlug === b.slug ? "Saving…" : "Save"}
              </R365Button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
