"use client";

import { useMemo } from "react";
import { resolveBrandEditorialRules } from "@/features/editing-studio/brands";
import { COMMON_IANA_TIMEZONES } from "@/features/editing-studio/settings/common-timezones";
import { datetimeLocalValueToIso, isoToDatetimeLocalValue } from "@/features/editing-studio/settings/datetime-local";
import { buildEditorialSettingsDefaultsFromBrandRules } from "@/features/editing-studio/settings/editorial-settings-brand-defaults";
import { validateSettingsProjectFields } from "@/features/editing-studio/settings/settings-tab-validation";
import {
  EDITING_STUDIO_CONTENT_TYPE_FILTERS,
  EDITING_STUDIO_PLATFORM_FILTERS,
  EDITING_STUDIO_STATUS_FILTERS,
} from "@/features/editing-studio/utils/filter-options";
import type {
  AffiliatePolicy,
  ContentType,
  EditingProject,
  EditingProjectStatus,
  EditorialProjectSettings,
  PlatformType,
  UtmPolicy,
} from "@/features/editing-studio/types/domain";

const inputClass =
  "mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]";
const inputStyle = { borderColor: "var(--border)" } as const;
const labelClass = "text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]";
const sectionTitle = "text-xs font-bold uppercase tracking-wide text-[color:var(--text-secondary)]";

const UTM_POLICIES: readonly UtmPolicy[] = ["preserve", "strip_all", "append_brand_utms"];
const AFFILIATE_POLICIES: readonly AffiliatePolicy[] = ["none", "append_tag", "disclosure_only"];

function statusLabel(s: EditingProjectStatus): string {
  return s.replace(/_/g, " ");
}

function platformLabel(p: PlatformType): string {
  return p.replace(/_/g, " ");
}

function contentTypeLabel(c: ContentType): string {
  return c.replace(/_/g, " ");
}

function utmPolicyLabel(p: UtmPolicy): string {
  switch (p) {
    case "preserve":
      return "Preserve existing query params";
    case "strip_all":
      return "Strip all UTM params";
    case "append_brand_utms":
      return "Append brand / project UTMs";
    default:
      return p;
  }
}

function affiliatePolicyLabel(a: AffiliatePolicy): string {
  switch (a) {
    case "none":
      return "None";
    case "append_tag":
      return "Append affiliate tag";
    case "disclosure_only":
      return "Disclosure text only";
    default:
      return a;
  }
}

function formatIso(iso: string | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

type Props = {
  draft: EditingProject;
  setDraft: React.Dispatch<React.SetStateAction<EditingProject>>;
};

export function EditingStudioSettingsTab({ draft, setDraft }: Props) {
  const es: EditorialProjectSettings = draft.editorialSettings ?? {};

  const fieldErrors = useMemo(() => validateSettingsProjectFields(draft), [draft]);

  const brandDefaultsPatch = useMemo(() => {
    const r = resolveBrandEditorialRules(draft.brand ?? "");
    if (!r) return {};
    return buildEditorialSettingsDefaultsFromBrandRules(r.rules, draft.editorialSettings);
  }, [draft.brand, draft.editorialSettings]);

  const canApplyBrandDefaults = Object.keys(brandDefaultsPatch).length > 0;

  const patchEs = (patch: Partial<EditorialProjectSettings>) => {
    setDraft((p) => ({
      ...p,
      editorialSettings: { ...(p.editorialSettings ?? {}), ...patch },
    }));
  };

  const applyBrandDefaults = () => {
    if (!canApplyBrandDefaults) return;
    setDraft((p) => ({
      ...p,
      editorialSettings: { ...(p.editorialSettings ?? {}), ...brandDefaultsPatch },
    }));
  };

  const togglePlatform = (platform: PlatformType) => {
    setDraft((p) => {
      const set = new Set(p.platforms);
      if (set.has(platform)) set.delete(platform);
      else set.add(platform);
      return { ...p, platforms: Array.from(set) as PlatformType[] };
    });
  };

  const publishLocal = isoToDatetimeLocalValue(draft.scheduledAt);
  const errorCount = Object.keys(fieldErrors).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Settings</h2>
          <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
            Editorial and publishing metadata. Changes autosave.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {errorCount > 0 ? (
            <span className="rounded-md border border-amber-600/50 px-2 py-1 text-xs text-amber-800 dark:text-amber-300">
              {errorCount} issue{errorCount === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="text-xs text-[color:var(--text-muted)]">All checks passed</span>
          )}
          {canApplyBrandDefaults ? (
            <button
              type="button"
              onClick={applyBrandDefaults}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
              style={inputStyle}
              title="Apply sign-off and UTM defaults from the selected brand"
            >
              Apply brand defaults
            </button>
          ) : null}
        </div>
      </div>

      <section className="rounded-xl border p-4" style={inputStyle}>
        <h3 className={sectionTitle}>Workflow &amp; status</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="ed-settings-status">
              Status
            </label>
            <select
              id="ed-settings-status"
              className={inputClass}
              style={inputStyle}
              value={draft.status}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  status: e.target.value as EditingProjectStatus,
                }))
              }
            >
              {EDITING_STUDIO_STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className={labelClass}>Revision</p>
            <p className="mt-2 font-mono text-sm text-[color:var(--text-primary)]">{draft.revision}</p>
          </div>
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[color:var(--text-muted)]">Published</dt>
            <dd className="text-[color:var(--text-secondary)]">{formatIso(draft.publishedAt)}</dd>
          </div>
          <div>
            <dt className="text-[color:var(--text-muted)]">Archived</dt>
            <dd className="text-[color:var(--text-secondary)]">{formatIso(draft.archivedAt)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-[color:var(--text-muted)]">
          {draft.status === "draft" && "Draft — not visible to schedulers until submitted."}
          {draft.status === "in_review" && "In review — wait for editor / approver before scheduling."}
          {draft.status === "approved" && "Approved — you can schedule or publish."}
          {draft.status === "scheduled" && "Scheduled — ensure publish time and timezone are set."}
          {draft.status === "published" && "Published — edits may require a new revision export."}
          {draft.status === "archived" && "Archived — read-only for most workflows."}
        </p>
      </section>

      <section className="rounded-xl border p-4" style={inputStyle}>
        <h3 className={sectionTitle}>Identity &amp; targeting</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="ed-settings-brand">
              Brand
            </label>
            <input
              id="ed-settings-brand"
              type="text"
              className={inputClass}
              style={inputStyle}
              value={draft.brand ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, brand: e.target.value || undefined }))}
              placeholder="e.g. Football365"
              maxLength={120}
              aria-invalid={fieldErrors.brand ? true : undefined}
            />
            {fieldErrors.brand ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.brand}</p>
            ) : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="ed-settings-campaign">
              Campaign
            </label>
            <input
              id="ed-settings-campaign"
              type="text"
              className={inputClass}
              style={inputStyle}
              value={es.campaign ?? ""}
              onChange={(e) => patchEs({ campaign: e.target.value || undefined })}
              placeholder="Internal campaign label"
              maxLength={200}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ed-settings-content-type">
              Content type
            </label>
            <select
              id="ed-settings-content-type"
              className={inputClass}
              style={inputStyle}
              value={draft.contentType}
              onChange={(e) => setDraft((p) => ({ ...p, contentType: e.target.value as ContentType }))}
            >
              {EDITING_STUDIO_CONTENT_TYPE_FILTERS.map((c) => (
                <option key={c} value={c}>
                  {contentTypeLabel(c)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <p className={labelClass}>Target platforms</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {EDITING_STUDIO_PLATFORM_FILTERS.map((p) => {
              const checked = draft.platforms.includes(p);
              return (
                <label
                  key={p}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 text-sm capitalize"
                  style={inputStyle}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePlatform(p)}
                    className="rounded border-[color:var(--border)]"
                  />
                  {platformLabel(p)}
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={inputStyle}>
        <h3 className={sectionTitle}>Roles</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["author", "Author", es.author],
              ["editor", "Editor", es.editor],
              ["approver", "Approver", es.approver],
            ] as const
          ).map(([key, lab, val]) => (
            <div key={key}>
              <label className={labelClass} htmlFor={`ed-settings-${key}`}>
                {lab}
              </label>
              <input
                id={`ed-settings-${key}`}
                type="text"
                className={inputClass}
                style={inputStyle}
                value={val ?? ""}
                onChange={(e) => patchEs({ [key]: e.target.value || undefined })}
                maxLength={200}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-4" style={inputStyle}>
        <h3 className={sectionTitle}>Schedule</h3>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Publish time is stored on the project as <code className="text-[11px]">scheduledAt</code> (ISO UTC). Pick
          local wall time below.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="ed-settings-publish-at">
              Publish at
            </label>
            <input
              id="ed-settings-publish-at"
              type="datetime-local"
              className={inputClass}
              style={inputStyle}
              value={publishLocal}
              onChange={(e) => {
                const iso = datetimeLocalValueToIso(e.target.value);
                setDraft((p) => ({ ...p, scheduledAt: iso }));
              }}
            />
            {fieldErrors.scheduledAt ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.scheduledAt}</p>
            ) : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="ed-settings-tz">
              Timezone (IANA)
            </label>
            <input
              id="ed-settings-tz"
              type="text"
              className={inputClass}
              style={inputStyle}
              list="ed-common-timezones"
              value={es.timezone ?? ""}
              onChange={(e) => patchEs({ timezone: e.target.value || undefined })}
              placeholder="Europe/London"
              maxLength={80}
              aria-invalid={fieldErrors.timezone ? true : undefined}
            />
            <datalist id="ed-common-timezones">
              {COMMON_IANA_TIMEZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
            {fieldErrors.timezone ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.timezone}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={inputStyle}>
        <h3 className={sectionTitle}>UTM &amp; links</h3>
        <div className="mt-3">
          <label className={labelClass} htmlFor="ed-settings-utm-policy">
            UTM policy
          </label>
          <select
            id="ed-settings-utm-policy"
            className={inputClass}
            style={inputStyle}
            value={es.utmPolicy ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              patchEs({ utmPolicy: v ? (v as UtmPolicy) : undefined });
            }}
          >
            <option value="">— Not set —</option>
            {UTM_POLICIES.map((p) => (
              <option key={p} value={p}>
                {utmPolicyLabel(p)}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="ed-settings-utm_source">
              utm_source
            </label>
            <input
              id="ed-settings-utm_source"
              type="text"
              className={inputClass}
              style={inputStyle}
              value={es.utmSource ?? ""}
              onChange={(e) => patchEs({ utmSource: e.target.value || undefined })}
              maxLength={200}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ed-settings-utm_medium">
              utm_medium
            </label>
            <input
              id="ed-settings-utm_medium"
              type="text"
              className={inputClass}
              style={inputStyle}
              value={es.utmMedium ?? ""}
              onChange={(e) => patchEs({ utmMedium: e.target.value || undefined })}
              maxLength={200}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ed-settings-utm_campaign">
              utm_campaign
            </label>
            <input
              id="ed-settings-utm_campaign"
              type="text"
              className={inputClass}
              style={inputStyle}
              value={es.utmCampaign ?? ""}
              onChange={(e) => patchEs({ utmCampaign: e.target.value || undefined })}
              maxLength={200}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ed-settings-utm_content">
              utm_content
            </label>
            <input
              id="ed-settings-utm_content"
              type="text"
              className={inputClass}
              style={inputStyle}
              value={es.utmContent ?? ""}
              onChange={(e) => patchEs({ utmContent: e.target.value || undefined })}
              maxLength={200}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ed-settings-utm_term">
              utm_term
            </label>
            <input
              id="ed-settings-utm_term"
              type="text"
              className={inputClass}
              style={inputStyle}
              value={es.utmTerm ?? ""}
              onChange={(e) => patchEs({ utmTerm: e.target.value || undefined })}
              maxLength={200}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={inputStyle}>
        <h3 className={sectionTitle}>Presets</h3>
        <div className="mt-3 space-y-4">
          <div>
            <label className={labelClass} htmlFor="ed-settings-signoff">
              Sign-off preset
            </label>
            <textarea
              id="ed-settings-signoff"
              className={`${inputClass} min-h-[72px] resize-y`}
              style={inputStyle}
              value={es.signOffPreset ?? ""}
              onChange={(e) => patchEs({ signOffPreset: e.target.value || undefined })}
              maxLength={2000}
              placeholder="Approved closing line or template reference"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ed-settings-disclaimer">
              Disclaimer preset
            </label>
            <textarea
              id="ed-settings-disclaimer"
              className={`${inputClass} min-h-[96px] resize-y`}
              style={inputStyle}
              value={es.disclaimerPreset ?? ""}
              onChange={(e) => patchEs({ disclaimerPreset: e.target.value || undefined })}
              maxLength={8000}
              placeholder="Legal / affiliate disclaimer block"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={inputStyle}>
        <h3 className={sectionTitle}>Affiliate</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="ed-settings-aff-policy">
              Affiliate policy
            </label>
            <select
              id="ed-settings-aff-policy"
              className={inputClass}
              style={inputStyle}
              value={es.affiliatePolicy ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                patchEs({ affiliatePolicy: v ? (v as AffiliatePolicy) : undefined });
              }}
            >
              <option value="">— Not set —</option>
              {AFFILIATE_POLICIES.map((a) => (
                <option key={a} value={a}>
                  {affiliatePolicyLabel(a)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="ed-settings-aff-network">
              Network / programme
            </label>
            <input
              id="ed-settings-aff-network"
              type="text"
              className={inputClass}
              style={inputStyle}
              value={es.affiliateNetwork ?? ""}
              onChange={(e) => patchEs({ affiliateNetwork: e.target.value || undefined })}
              maxLength={120}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="ed-settings-aff-tag">
              Affiliate tag / ID
            </label>
            <input
              id="ed-settings-aff-tag"
              type="text"
              className={inputClass}
              style={inputStyle}
              value={es.affiliateTag ?? ""}
              onChange={(e) => patchEs({ affiliateTag: e.target.value || undefined })}
              maxLength={200}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={inputStyle}>
        <h3 className={sectionTitle}>Localisation</h3>
        <div className="mt-3 max-w-md">
          <label className={labelClass} htmlFor="ed-settings-locale">
            Language / locale (BCP 47)
          </label>
          <input
            id="ed-settings-locale"
            type="text"
            className={inputClass}
            style={inputStyle}
            value={es.locale ?? ""}
            onChange={(e) => patchEs({ locale: e.target.value || undefined })}
            placeholder="en-GB"
            maxLength={32}
            aria-invalid={fieldErrors.locale ? true : undefined}
          />
          {fieldErrors.locale ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.locale}</p>
          ) : (
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">Example: en, en-GB, fr-FR</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border p-4" style={inputStyle}>
        <h3 className={sectionTitle}>Permissions summary</h3>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Short note for reviewers: who may edit, approve, or publish (your org’s ACL is enforced outside this
          tool).
        </p>
        <div className="mt-3">
          <textarea
            id="ed-settings-perms"
            className={`${inputClass} min-h-[88px] resize-y`}
            style={inputStyle}
            value={es.permissionsSummary ?? ""}
            onChange={(e) => patchEs({ permissionsSummary: e.target.value || undefined })}
            maxLength={4000}
            placeholder="e.g. Edit: newsdesk; Approve: senior editor; Publish: social lead"
          />
        </div>
      </section>
    </div>
  );
}
