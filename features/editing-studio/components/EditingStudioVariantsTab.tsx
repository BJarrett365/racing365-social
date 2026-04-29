"use client";

import { useEffect, useMemo, useState } from "react";
import type { CopyVariant, CopyVariantSource, EditingProject, PlatformType } from "@/features/editing-studio/types/domain";
import { EDITING_STUDIO_PLATFORM_FILTERS } from "@/features/editing-studio/utils/filter-options";
import {
  VARIANT_TONE_PRESETS,
  displayVariantLabel,
  duplicateCopyVariant,
  newAiDraftVariant,
  newEmptyVariant,
  normalizeVariantForSave,
  platformShort,
  prefillVariantFromMaster,
  sourceLabel,
  variantCaption,
} from "@/features/editing-studio/variants/variant-helpers";

const inputClass =
  "mt-0.5 w-full rounded-lg border bg-[var(--surface)] px-2 py-1.5 text-sm text-[color:var(--text-primary)]";
const inputStyle = { borderColor: "var(--border)" } as const;
const th = "text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]";
const td = "border-t px-2 py-2 align-top text-xs text-[color:var(--text-primary)]";

type Props = {
  draft: EditingProject;
  setDraft: React.Dispatch<React.SetStateAction<EditingProject>>;
};

function parseHashtagInput(s: string): string[] {
  return s
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}

function formatHashtags(arr: string[] | undefined): string {
  return (arr ?? []).join(" ");
}

export function EditingStudioVariantsTab({ draft, setDraft }: Props) {
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; variant: CopyVariant }>(null);
  const [form, setForm] = useState<CopyVariant | null>(null);
  const [hashtagInput, setHashtagInput] = useState("");
  const [prefillMaster, setPrefillMaster] = useState(true);

  useEffect(() => {
    if (modal) {
      setForm(modal.variant);
      setHashtagInput(formatHashtags(modal.variant.hashtags));
      setPrefillMaster(modal.mode === "create");
    } else {
      setForm(null);
      setHashtagInput("");
    }
  }, [modal]);

  const sortedVariants = useMemo(() => {
    return [...draft.copyVariants].sort((a, b) => {
      if (a.platform !== b.platform) return a.platform.localeCompare(b.platform);
      return displayVariantLabel(a).localeCompare(displayVariantLabel(b));
    });
  }, [draft.copyVariants]);

  const variantById = (id: string) => draft.copyVariants.find((v) => v.id === id) ?? null;

  const va = compareA ? variantById(compareA) : null;
  const vb = compareB ? variantById(compareB) : null;

  const setExportPick = (platform: PlatformType, variantId: string | null) => {
    setDraft((p) => {
      const cur = { ...(p.exportVariantPick ?? {}) } as Partial<Record<PlatformType, string>>;
      if (variantId) {
        cur[platform] = variantId;
      } else {
        delete cur[platform];
      }
      return { ...p, exportVariantPick: Object.keys(cur).length ? cur : undefined };
    });
  };

  const deleteVariant = (id: string) => {
    if (!window.confirm("Delete this variant? This cannot be undone.")) return;
    setDraft((p) => {
      const nextPick = { ...(p.exportVariantPick ?? {}) } as Partial<Record<PlatformType, string>>;
      for (const plat of Object.keys(nextPick) as PlatformType[]) {
        if (nextPick[plat] === id) delete nextPick[plat];
      }
      return {
        ...p,
        copyVariants: p.copyVariants.filter((v) => v.id !== id),
        exportVariantPick: Object.keys(nextPick).length ? nextPick : undefined,
      };
    });
  };

  const toggleApproved = (id: string) => {
    setDraft((p) => ({
      ...p,
      copyVariants: p.copyVariants.map((v) =>
        v.id === id ? { ...v, approved: !v.approved, updatedAt: new Date().toISOString() } : v,
      ),
    }));
  };

  const openCreate = (opts?: { ai?: boolean }) => {
    const platform = draft.platforms[0] ?? "x";
    const v = opts?.ai ? newAiDraftVariant(draft, platform) : newEmptyVariant(draft, platform);
    let next = v;
    if (!opts?.ai && prefillMaster) {
      const pre = prefillVariantFromMaster(draft, platform);
      next = { ...v, ...pre };
    }
    setModal({ mode: "create", variant: next });
  };

  const saveModal = () => {
    if (!modal || !form) return;
    setDraft((p) => {
      const tags = parseHashtagInput(hashtagInput);
      let merged: CopyVariant = {
        ...form,
        hashtags: tags.length ? tags : undefined,
      };
      if (modal.mode === "create" && prefillMaster) {
        const pre = prefillVariantFromMaster(p, merged.platform);
        merged = { ...pre, ...merged };
      }
      const saved = normalizeVariantForSave(merged, p.revision);
      if (modal.mode === "create") {
        return { ...p, copyVariants: [...p.copyVariants, saved] };
      }
      return {
        ...p,
        copyVariants: p.copyVariants.map((v) => (v.id === saved.id ? saved : v)),
      };
    });
    setModal(null);
  };

  const FieldBlock = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">{title}</div>
      <div className="mt-1 text-sm whitespace-pre-wrap text-[color:var(--text-primary)]">{children}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Copy variants</h2>
        <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
          One export pick per platform. Use AI tools (sidebar) to generate copy, then save as variant — or build variants
          here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--accent)] hover:underline"
          onClick={() => setDraft((p) => ({ ...p, exportVariantPick: undefined }))}
        >
          Clear export picks
        </button>
        <button
          type="button"
          className="rounded-lg border border-transparent bg-[color:var(--accent)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent-foreground)]"
          onClick={() => openCreate()}
        >
          New variant
        </button>
        <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-medium" style={inputStyle} onClick={() => openCreate({ ai: true })}>
          New variant (AI)
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
          <input
            type="checkbox"
            checked={prefillMaster}
            onChange={(e) => setPrefillMaster(e.target.checked)}
            className="rounded"
          />
          Prefill new variants from master copy
        </label>
        <button
          type="button"
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${compareMode ? "bg-[var(--surface-hover)]" : ""}`}
          style={inputStyle}
          onClick={() => setCompareMode((c) => !c)}
        >
          {compareMode ? "Exit compare" : "Compare two"}
        </button>
      </div>

      {compareMode ? (
        <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-[color:var(--text-secondary)]">
              Variant A
              <select
                className={inputClass}
                style={inputStyle}
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
              >
                <option value="">—</option>
                {sortedVariants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {displayVariantLabel(v)} ({platformShort(v.platform)})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-[color:var(--text-secondary)]">
              Variant B
              <select
                className={inputClass}
                style={inputStyle}
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
              >
                <option value="">—</option>
                {sortedVariants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {displayVariantLabel(v)} ({platformShort(v.platform)})
                  </option>
                ))}
              </select>
            </label>
          </div>
          {va && vb ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px] font-bold uppercase text-[color:var(--accent)]">A · {displayVariantLabel(va)}</p>
                <FieldBlock title="Headline">{va.headline || "—"}</FieldBlock>
                <FieldBlock title="Caption">{variantCaption(va) || "—"}</FieldBlock>
                <FieldBlock title="CTA">{va.cta || "—"}</FieldBlock>
                <FieldBlock title="Hashtags">{formatHashtags(va.hashtags) || "—"}</FieldBlock>
                <FieldBlock title="Sign-off">{va.signOff || "—"}</FieldBlock>
                <FieldBlock title="Tone">{va.tone || "—"}</FieldBlock>
                <FieldBlock title="Source">{sourceLabel(va.sourceHumanOrAi)}</FieldBlock>
              </div>
              <div className="space-y-2 rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px] font-bold uppercase text-[color:var(--accent)]">B · {displayVariantLabel(vb)}</p>
                <FieldBlock title="Headline">{vb.headline || "—"}</FieldBlock>
                <FieldBlock title="Caption">{variantCaption(vb) || "—"}</FieldBlock>
                <FieldBlock title="CTA">{vb.cta || "—"}</FieldBlock>
                <FieldBlock title="Hashtags">{formatHashtags(vb.hashtags) || "—"}</FieldBlock>
                <FieldBlock title="Sign-off">{vb.signOff || "—"}</FieldBlock>
                <FieldBlock title="Tone">{vb.tone || "—"}</FieldBlock>
                <FieldBlock title="Source">{sourceLabel(vb.sourceHumanOrAi)}</FieldBlock>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[color:var(--text-muted)]">Select two variants to compare.</p>
          )}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr>
              <th className={th}>Export</th>
              <th className={th}>Label</th>
              <th className={th}>Platform</th>
              <th className={th}>Headline</th>
              <th className={th}>Caption</th>
              <th className={th}>Tone</th>
              <th className={th}>Src</th>
              <th className={th}>OK</th>
              <th className={th}>Updated</th>
              <th className={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedVariants.length === 0 ? (
              <tr>
                <td className={td} colSpan={10}>
                  No variants yet — create one or use AI → Save as variant.
                </td>
              </tr>
            ) : (
              sortedVariants.map((v) => {
                const exportChecked = draft.exportVariantPick?.[v.platform] === v.id;
                return (
                  <tr key={v.id}>
                    <td className={td}>
                      <input
                        type="radio"
                        name={`export-${v.platform}`}
                        checked={exportChecked}
                        onChange={() => setExportPick(v.platform, v.id)}
                        title="Use for export / publishing for this platform"
                        aria-label={`Export pick for ${platformShort(v.platform)}`}
                      />
                    </td>
                    <td className={td}>{displayVariantLabel(v)}</td>
                    <td className={td}>{platformShort(v.platform)}</td>
                    <td className={`${td} max-w-[140px] truncate`}>{v.headline || "—"}</td>
                    <td className={`${td} max-w-[180px] truncate`}>{variantCaption(v) || "—"}</td>
                    <td className={td}>{v.tone || "—"}</td>
                    <td className={td}>{sourceLabel(v.sourceHumanOrAi)}</td>
                    <td className={td}>{v.approved ? "✓" : "—"}</td>
                    <td className={`${td} whitespace-nowrap text-[color:var(--text-muted)]`}>
                      {new Date(v.updatedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <button
                        type="button"
                        className="mr-1 text-[color:var(--accent)] hover:underline"
                        onClick={() => setModal({ mode: "edit", variant: { ...v } })}
                      >
                        Edit
                      </button>
                      <button type="button" className="mr-1 hover:underline" onClick={() => toggleApproved(v.id)}>
                        {v.approved ? "Unapprove" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="mr-1 hover:underline"
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            copyVariants: [...p.copyVariants, duplicateCopyVariant(v)],
                          }))
                        }
                      >
                        Duplicate
                      </button>
                      <button type="button" className="text-red-600 hover:underline dark:text-red-400" onClick={() => deleteVariant(v.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modal && form ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="variant-modal-title"
          onClick={() => setModal(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-[var(--surface)] p-4 shadow-xl"
            style={{ borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="variant-modal-title" className="text-base font-bold text-[color:var(--text-primary)]">
              {modal.mode === "create" ? "New variant" : "Edit variant"}
            </h3>

            <div className="mt-3 space-y-3">
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)]">
                Label
                <input
                  className={inputClass}
                  style={inputStyle}
                  value={form.label ?? ""}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. X v2"
                />
              </label>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)]">
                Platform
                <select
                  className={inputClass}
                  style={inputStyle}
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value as PlatformType })}
                >
                  {EDITING_STUDIO_PLATFORM_FILTERS.map((p) => (
                    <option key={p} value={p}>
                      {platformShort(p)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)]">
                Headline
                <input
                  className={inputClass}
                  style={inputStyle}
                  value={form.headline ?? ""}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)]">
                Caption
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  style={inputStyle}
                  value={form.caption ?? form.body ?? ""}
                  onChange={(e) => setForm({ ...form, caption: e.target.value, body: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)]">
                CTA
                <input
                  className={inputClass}
                  style={inputStyle}
                  value={form.cta ?? ""}
                  onChange={(e) => setForm({ ...form, cta: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)]">
                Hashtags (space / comma separated)
                <input
                  className={inputClass}
                  style={inputStyle}
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)]">
                Sign-off
                <input
                  className={inputClass}
                  style={inputStyle}
                  value={form.signOff ?? ""}
                  onChange={(e) => setForm({ ...form, signOff: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)]">
                Tone
                <select
                  className={inputClass}
                  style={inputStyle}
                  value={form.tone ?? ""}
                  onChange={(e) => setForm({ ...form, tone: e.target.value || undefined })}
                >
                  {VARIANT_TONE_PRESETS.map((t, i) => (
                    <option key={`tone-${i}-${t}`} value={t}>
                      {t || "—"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)]">
                Source
                <select
                  className={inputClass}
                  style={inputStyle}
                  value={form.sourceHumanOrAi ?? "human"}
                  onChange={(e) => setForm({ ...form, sourceHumanOrAi: e.target.value as CopyVariantSource })}
                >
                  <option value="human">Human</option>
                  <option value="ai">AI</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-[color:var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={form.approved ?? false}
                  onChange={(e) => setForm({ ...form, approved: e.target.checked })}
                />
                Approved for publishing
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-transparent bg-[color:var(--accent)] px-3 py-2 text-sm font-semibold text-[color:var(--accent-foreground)]"
                onClick={saveModal}
              >
                Save variant
              </button>
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} onClick={() => setModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
