"use client";

import { useMemo } from "react";
import {
  applyBrandDefaultsToEditorialCopy,
  buildEditorialCopyDefaultsFromRules,
  getEffectiveCaptionLimitForPlatform,
  getTightestCaptionLimitForPlatforms,
  resolveBrandEditorialRules,
} from "@/features/editing-studio/brands";
import { COPY_LIMITS } from "@/features/editing-studio/copy/copy-limits";
import { computeCopyWarnings } from "@/features/editing-studio/copy/copy-warnings";
import { validateCopyProjectFields } from "@/features/editing-studio/copy/copy-tab-validation";
import type { EditorialCopy, EditingProject } from "@/features/editing-studio/types/domain";

const inputClass =
  "mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]";
const inputStyle = { borderColor: "var(--border)" } as const;
const monoCount = "tabular-nums text-[10px] text-[color:var(--text-muted)]";

function CharHint({
  len,
  max,
  platformHint,
}: {
  len: number;
  max?: number;
  platformHint?: string;
}) {
  return (
    <span className={monoCount}>
      {len}
      {max != null ? ` / ${max}` : ""}
      {platformHint ? ` · ${platformHint}` : ""}
    </span>
  );
}

type Props = {
  draft: EditingProject;
  setDraft: React.Dispatch<React.SetStateAction<EditingProject>>;
};

export function EditingStudioCopyTab({ draft, setDraft }: Props) {
  const ec = draft.editorialCopy ?? {};

  const fieldErrors = useMemo(() => validateCopyProjectFields(draft), [draft]);
  const warnings = useMemo(() => computeCopyWarnings(draft), [draft]);

  const brandApplyPatch = useMemo(() => {
    const r = resolveBrandEditorialRules(draft.brand ?? "");
    if (!r) return {};
    return buildEditorialCopyDefaultsFromRules(r.rules, draft.editorialCopy ?? {});
  }, [draft.brand, draft.editorialCopy]);

  const canApplyBrandDefaults = Object.keys(brandApplyPatch).length > 0;

  const patchEc = (patch: Partial<EditorialCopy>) => {
    setDraft((p) => ({
      ...p,
      editorialCopy: { ...p.editorialCopy, ...patch },
    }));
  };

  const applyBrandDefaults = () => {
    setDraft((p) => ({
      ...p,
      editorialCopy: applyBrandDefaultsToEditorialCopy(p.brand, p.editorialCopy),
    }));
  };

  const platforms = draft.platforms ?? [];
  const hasX = platforms.includes("x");
  const hasIg = platforms.includes("instagram");

  const errorCount = Object.keys(fieldErrors).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Copy</h2>
          <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
            Changes autosave. Use paste-friendly fields; counts help fit each platform.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canApplyBrandDefaults ? (
            <button
              type="button"
              onClick={applyBrandDefaults}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
              style={{ borderColor: "var(--border)" }}
              title="Fill empty CTA / sign-off when this brand has defaults"
            >
              Apply brand defaults
            </button>
          ) : null}
        </div>
      </div>

      {errorCount > 0 ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">
          {errorCount} validation issue{errorCount === 1 ? "" : "s"} — fix before publishing.
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <ul
          className="space-y-1.5 rounded-lg border border-amber-500/35 bg-amber-500/[0.07] px-3 py-2.5 text-sm"
          aria-label="Editorial warnings"
        >
          {warnings.map((w) => (
            <li
              key={w.id}
              className={
                w.severity === "warning"
                  ? "text-amber-900 dark:text-amber-100"
                  : "text-[color:var(--text-secondary)]"
              }
            >
              {w.message}
            </li>
          ))}
        </ul>
      ) : null}

      <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
          Core
        </legend>
        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Internal project title
            </span>
            <CharHint len={draft.title.length} max={COPY_LIMITS.title} />
          </span>
          <input
            className={inputClass}
            style={inputStyle}
            value={draft.title}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            autoComplete="off"
            aria-invalid={fieldErrors.title ? true : undefined}
          />
          {fieldErrors.title ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.title}</p> : null}
        </label>

        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Public headline
            </span>
            <CharHint len={(draft.publicHeadline ?? "").length} max={COPY_LIMITS.publicHeadline} />
          </span>
          <input
            className={inputClass}
            style={inputStyle}
            value={draft.publicHeadline ?? ""}
            onChange={(e) => setDraft((p) => ({ ...p, publicHeadline: e.target.value }))}
            placeholder="Main promo headline"
            aria-invalid={fieldErrors.publicHeadline ? true : undefined}
          />
          {fieldErrors.publicHeadline ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.publicHeadline}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Subheading / deck
            </span>
            <CharHint len={(ec.subheading ?? "").length} max={500} />
          </span>
          <input
            className={inputClass}
            style={inputStyle}
            value={ec.subheading ?? ""}
            onChange={(e) => patchEc({ subheading: e.target.value })}
            placeholder="Supporting line under the headline"
            aria-invalid={fieldErrors.subheading ? true : undefined}
          />
          {fieldErrors.subheading ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.subheading}</p>
          ) : null}
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
          Captions
        </legend>
        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Social caption
            </span>
            <CharHint
              len={(ec.socialCaption ?? "").length}
              max={getTightestCaptionLimitForPlatforms(draft.brand, platforms)}
              platformHint={
                hasX && hasIg
                  ? `X ≤${getEffectiveCaptionLimitForPlatform(draft.brand, "x")} · IG ~${getEffectiveCaptionLimitForPlatform(draft.brand, "instagram")}`
                  : hasX
                    ? `X ≤${getEffectiveCaptionLimitForPlatform(draft.brand, "x")}`
                    : hasIg
                      ? `IG ~${getEffectiveCaptionLimitForPlatform(draft.brand, "instagram")}`
                      : platforms.includes("linkedin")
                        ? `LI ~${getEffectiveCaptionLimitForPlatform(draft.brand, "linkedin")}`
                        : undefined
              }
            />
          </span>
          <textarea
            className={`${inputClass} min-h-[100px] resize-y font-sans leading-relaxed`}
            style={inputStyle}
            value={ec.socialCaption ?? ""}
            onChange={(e) => patchEc({ socialCaption: e.target.value })}
            placeholder="Full post text for social — paste from docs or notes"
            spellCheck
            aria-invalid={fieldErrors.socialCaption ? true : undefined}
          />
          {fieldErrors.socialCaption ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.socialCaption}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Short caption
            </span>
            <CharHint
              len={(ec.shortCaption ?? "").length}
              max={hasX ? getEffectiveCaptionLimitForPlatform(draft.brand, "x") : 500}
              platformHint={hasX ? `watch ≤${getEffectiveCaptionLimitForPlatform(draft.brand, "x")}` : undefined}
            />
          </span>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            style={inputStyle}
            value={ec.shortCaption ?? ""}
            onChange={(e) => patchEc({ shortCaption: e.target.value })}
            placeholder="Alternate short line or cut-down"
            aria-invalid={fieldErrors.shortCaption ? true : undefined}
          />
          {fieldErrors.shortCaption ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.shortCaption}</p>
          ) : null}
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
          Engagement
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">CTA</span>
              <CharHint len={(ec.cta ?? "").length} max={500} />
            </span>
            <input
              className={inputClass}
              style={inputStyle}
              value={ec.cta ?? ""}
              onChange={(e) => patchEc({ cta: e.target.value })}
              placeholder="e.g. Read more, Watch now"
              aria-invalid={fieldErrors.cta ? true : undefined}
            />
            {fieldErrors.cta ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.cta}</p> : null}
          </label>
          <label className="block sm:col-span-2">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Hashtags
              </span>
              <CharHint len={(ec.hashtags ?? "").length} max={4000} />
            </span>
            <textarea
              className={`${inputClass} min-h-[64px] resize-y`}
              style={inputStyle}
              value={ec.hashtags ?? ""}
              onChange={(e) => patchEc({ hashtags: e.target.value })}
              placeholder="#one #two or line-separated"
              aria-invalid={fieldErrors.hashtags ? true : undefined}
            />
            {fieldErrors.hashtags ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.hashtags}</p>
            ) : null}
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Sign-off line
              </span>
              <CharHint len={(ec.signOff ?? "").length} max={500} />
            </span>
            <input
              className={inputClass}
              style={inputStyle}
              value={ec.signOff ?? ""}
              onChange={(e) => patchEc({ signOff: e.target.value })}
              placeholder="— Brand or byline"
              aria-invalid={fieldErrors.signOff ? true : undefined}
            />
            {fieldErrors.signOff ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.signOff}</p>
            ) : null}
          </label>
          <label className="block sm:col-span-2">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Tone / voice
              </span>
              <CharHint len={(ec.tone ?? "").length} max={500} />
            </span>
            <input
              className={inputClass}
              style={inputStyle}
              value={ec.tone ?? ""}
              onChange={(e) => patchEc({ tone: e.target.value })}
              placeholder="e.g. authoritative, fan-first — often set from brand defaults"
              aria-invalid={fieldErrors.tone ? true : undefined}
            />
            {fieldErrors.tone ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.tone}</p> : null}
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Pinned comment text
              </span>
              <CharHint len={(ec.pinnedComment ?? "").length} max={4000} />
            </span>
            <textarea
              className={`${inputClass} min-h-[64px] resize-y`}
              style={inputStyle}
              value={ec.pinnedComment ?? ""}
              onChange={(e) => patchEc({ pinnedComment: e.target.value })}
              placeholder="First comment to pin (where supported)"
              aria-invalid={fieldErrors.pinnedComment ? true : undefined}
            />
            {fieldErrors.pinnedComment ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.pinnedComment}</p>
            ) : null}
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
          Accessibility & taxonomy
        </legend>
        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Alt text
            </span>
            <CharHint len={(ec.altText ?? "").length} max={4000} />
          </span>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            style={inputStyle}
            value={ec.altText ?? ""}
            onChange={(e) => patchEc({ altText: e.target.value })}
            placeholder="Describe hero or key image for screen readers"
            aria-invalid={fieldErrors.altText ? true : undefined}
          />
          {fieldErrors.altText ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.altText}</p>
          ) : null}
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Tags / categories
            </span>
            <CharHint len={(ec.tagsCategories ?? "").length} max={4000} />
          </span>
          <input
            className={inputClass}
            style={inputStyle}
            value={ec.tagsCategories ?? ""}
            onChange={(e) => patchEc({ tagsCategories: e.target.value })}
            placeholder="Comma-separated"
            aria-invalid={fieldErrors.tagsCategories ? true : undefined}
          />
          {fieldErrors.tagsCategories ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.tagsCategories}</p>
          ) : null}
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
          URLs
        </legend>
        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Source URL
            </span>
            <CharHint len={(draft.sourceUrl ?? "").length} />
          </span>
          <input
            className={inputClass}
            style={inputStyle}
            type="url"
            inputMode="url"
            value={draft.sourceUrl ?? ""}
            onChange={(e) => setDraft((p) => ({ ...p, sourceUrl: e.target.value || undefined }))}
            placeholder="https://…"
            aria-invalid={fieldErrors.sourceUrl ? true : undefined}
          />
          {fieldErrors.sourceUrl ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.sourceUrl}</p>
          ) : null}
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Canonical URL
            </span>
            <CharHint len={(ec.canonicalUrl ?? "").length} max={2000} />
          </span>
          <input
            className={inputClass}
            style={inputStyle}
            type="url"
            inputMode="url"
            value={ec.canonicalUrl ?? ""}
            onChange={(e) => patchEc({ canonicalUrl: e.target.value })}
            placeholder="https://… preferred index URL"
            aria-invalid={fieldErrors.canonicalUrl ? true : undefined}
          />
          {fieldErrors.canonicalUrl ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.canonicalUrl}</p>
          ) : null}
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
          Brief & notes
        </legend>
        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">Summary</span>
            <CharHint len={(draft.summary ?? "").length} max={COPY_LIMITS.summary} />
          </span>
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            style={inputStyle}
            value={draft.summary ?? ""}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                summary: e.target.value,
                description: e.target.value,
              }))
            }
            placeholder="Short editorial summary (list previews)"
            aria-invalid={fieldErrors.summary ? true : undefined}
          />
          {fieldErrors.summary ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.summary}</p>
          ) : null}
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Platform notes
            </span>
            <CharHint len={(ec.platformNotes ?? "").length} max={20_000} />
          </span>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            style={inputStyle}
            value={ec.platformNotes ?? ""}
            onChange={(e) => patchEc({ platformNotes: e.target.value })}
            placeholder="Per-platform caveats, embargo, legal, timing"
            aria-invalid={fieldErrors.platformNotes ? true : undefined}
          />
          {fieldErrors.platformNotes ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.platformNotes}</p>
          ) : null}
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Body / internal notes
            </span>
            <CharHint len={(draft.bodyNotes ?? "").length} max={COPY_LIMITS.bodyNotes} />
          </span>
          <textarea
            className={`${inputClass} min-h-[120px] resize-y`}
            style={inputStyle}
            value={draft.bodyNotes ?? ""}
            onChange={(e) => setDraft((p) => ({ ...p, bodyNotes: e.target.value }))}
            placeholder="Longer briefing, paste of article text, or internal-only notes"
            aria-invalid={fieldErrors.bodyNotes ? true : undefined}
          />
          {fieldErrors.bodyNotes ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.bodyNotes}</p>
          ) : null}
        </label>
      </fieldset>
    </div>
  );
}
