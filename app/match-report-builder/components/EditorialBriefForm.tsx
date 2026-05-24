"use client";

import Link from "next/link";
import { useEffect, useMemo, type ReactNode } from "react";
import { R365Button } from "@/app/components/R365Button";
import {
  creatorTeamSupportLabel,
  creatorTeamSupportMode,
} from "@/app/lib/language-studio/creator-team-support";
import { targetBrandHasKnowledgeGuide } from "@/app/lib/match-report/brand-knowledge";
import {
  BRAND_LABEL_BY_TARGET,
  BRAND_STYLE_BY_TARGET,
  DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES,
  DEFAULT_MATCH_REPORT_REWRITE_STYLE,
  formatCreatorStyleFromProfile,
  formatJournalistProfilePickerLabel,
} from "@/app/lib/match-report/editorial-governance";
import { isDualReportFormat } from "@/app/lib/match-report/match-report-format";
import type { EditorialProfile, MatchReportFormat, MatchReportTargetBrand } from "@/app/lib/match-report/types";
import { useGovernanceProfiles } from "@/app/match-report-builder/hooks/useGovernanceProfiles";

const BRAND_OPTIONS: MatchReportTargetBrand[] = [
  "football365",
  "teamtalk",
  "planet-football",
  "sport365",
];

export type EditorialBriefDraft = Omit<Partial<EditorialProfile>, "targetBrand"> & {
  targetBrand: MatchReportTargetBrand | "";
};

type Props = {
  value: EditorialBriefDraft;
  onChange: (next: EditorialBriefDraft) => void;
  awayValue?: EditorialBriefDraft;
  onAwayChange?: (next: EditorialBriefDraft) => void;
  reportFormat?: MatchReportFormat;
  onContinue: () => void;
  onBack?: () => void;
  reportFormatLabel?: string;
};

const inputClass =
  "w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]";

function BriefSelectionSection({
  label,
  complete,
  children,
}: {
  label: string;
  complete: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-4 transition-colors ${
        complete ? "ring-2 ring-[color:var(--accent)]" : "ring-1 ring-[color:var(--accent)]"
      }`}
      style={{
        borderColor: complete
          ? "color-mix(in srgb, var(--accent) 55%, var(--border))"
          : "color-mix(in srgb, var(--accent) 40%, var(--border))",
        background: complete ? "var(--accent-soft)" : "color-mix(in srgb, var(--accent-soft) 50%, var(--surface-muted))",
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-wide text-[color:var(--text-primary)]">{label}</span>
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black"
          style={{
            borderColor: complete ? "var(--accent)" : "color-mix(in srgb, var(--accent) 65%, var(--border-strong))",
            background: complete ? "var(--accent)" : "transparent",
            color: complete ? "var(--accent-foreground)" : "var(--accent)",
          }}
          aria-hidden
        >
          {complete ? "✓" : "!"}
        </span>
      </div>
      {children}
    </section>
  );
}

function isPerspectiveReady(draft: EditorialBriefDraft): boolean {
  const targetBrand = draft.targetBrand ?? "";
  if (!targetBrand) return false;
  const brandStyle = draft.brandStyle || BRAND_STYLE_BY_TARGET[targetBrand];
  return Boolean(brandStyle);
}

function EditorialBriefPerspectiveFields({
  value,
  onChange,
}: {
  value: EditorialBriefDraft;
  onChange: (next: EditorialBriefDraft) => void;
}) {
  const targetBrand = value.targetBrand ?? "";
  const { profiles, loading: profilesLoading, error: profilesError, reload: reloadProfiles } =
    useGovernanceProfiles(targetBrand);

  const brandStyle = useMemo(() => {
    if (!targetBrand) return "";
    return value.brandStyle || BRAND_STYLE_BY_TARGET[targetBrand];
  }, [targetBrand, value.brandStyle]);

  useEffect(() => {
    if (!targetBrand) return;
    onChange({
      ...value,
      targetBrand,
      brandStyle: BRAND_STYLE_BY_TARGET[targetBrand],
      rewriteStyle: value.rewriteStyle?.trim() || DEFAULT_MATCH_REPORT_REWRITE_STYLE,
      articleGuidelines: value.articleGuidelines?.trim() || DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBrand]);

  const applyJournalistProfile = (profileId: string) => {
    if (!profileId) {
      onChange({
        ...value,
        useCreatorProfile: false,
        journalistProfileId: undefined,
        creatorName: undefined,
        creatorTeamSupportMode: undefined,
        creatorSupportedClub: undefined,
        creatorStyleNotes: "",
        articleGuidelines: value.articleGuidelines?.trim() || DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES,
      });
      return;
    }
    const profile = profiles.find((row) => row.id === profileId);
    if (!profile) return;
    onChange({
      ...value,
      useCreatorProfile: true,
      journalistProfileId: profile.id,
      creatorName: profile.name,
      creatorTeamSupportMode: creatorTeamSupportMode(profile),
      creatorSupportedClub: profile.supportedClub?.trim(),
      creatorStyleNotes: formatCreatorStyleFromProfile(profile),
      articleGuidelines: profile.articleGuidelines?.trim() || DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES,
    });
  };

  const brandComplete = Boolean(targetBrand);
  const creatorProfileComplete = Boolean(value.journalistProfileId) || Boolean(value.creatorStyleNotes?.trim());

  return (
    <div className="space-y-4">
      <BriefSelectionSection label="Brand" complete={brandComplete}>
        <select
          className={inputClass}
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          value={targetBrand}
          onChange={(e) => {
            const nextBrand = e.target.value as MatchReportTargetBrand | "";
            if (!nextBrand) {
              onChange({
                ...value,
                targetBrand: "",
                journalistProfileId: undefined,
                creatorName: undefined,
                useCreatorProfile: false,
                creatorStyleNotes: "",
              });
              return;
            }
            onChange({
              ...value,
              targetBrand: nextBrand,
              brandStyle: BRAND_STYLE_BY_TARGET[nextBrand],
              journalistProfileId: undefined,
              creatorName: undefined,
              useCreatorProfile: false,
              creatorStyleNotes: "",
              rewriteStyle: DEFAULT_MATCH_REPORT_REWRITE_STYLE,
              articleGuidelines: DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES,
            });
          }}
        >
          <option value="">Select brand…</option>
          {BRAND_OPTIONS.map((brand) => (
            <option key={brand} value={brand}>
              {BRAND_LABEL_BY_TARGET[brand]}
            </option>
          ))}
        </select>
      </BriefSelectionSection>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Brand style</span>
        <div
          className="min-h-[72px] rounded-xl border px-4 py-3 text-sm leading-6 text-[color:var(--text-secondary)]"
          style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
        >
          {brandStyle || "Select a brand to load its editorial style."}
        </div>
        {targetBrand && targetBrandHasKnowledgeGuide(targetBrand) ? (
          <p className="text-xs text-[color:var(--text-muted)]">
            Full {BRAND_LABEL_BY_TARGET[targetBrand]} Brand Style Guide lives in{" "}
            <Link href="/language-studio?tab=Knowledge%20Files" className="text-emerald-300 underline">
              Knowledge Base → Knowledge Files
            </Link>
            . AI generation uses the brand tone instruction from that guide.
          </p>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Style</span>
        <textarea
          className={`${inputClass} min-h-[120px]`}
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          value={value.rewriteStyle ?? DEFAULT_MATCH_REPORT_REWRITE_STYLE}
          onChange={(e) => onChange({ ...value, rewriteStyle: e.target.value })}
        />
        <p className="text-xs text-[color:var(--text-muted)]">
          Same Match report style preset used in Language Studio rewrite.
        </p>
      </label>

      <BriefSelectionSection label="Use Content Creator Profile" complete={creatorProfileComplete}>
        <select
          className={inputClass}
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          value={value.journalistProfileId ?? ""}
          disabled={!targetBrand || profilesLoading}
          onChange={(e) => applyJournalistProfile(e.target.value)}
        >
          <option value="">Manual creator style</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {formatJournalistProfilePickerLabel(profile)}
              {profile.sports.length ? ` · ${profile.sports.join(", ")}` : ""}
              {" · "}
              {creatorTeamSupportLabel(profile)}
            </option>
          ))}
        </select>
        {value.journalistProfileId && value.creatorName ? (
          <p
            className="mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              borderColor: "color-mix(in srgb, var(--accent) 40%, var(--border))",
              background: "var(--accent-soft)",
              color: "var(--text-primary)",
            }}
          >
            Team support:{" "}
            {value.creatorTeamSupportMode === "club" && value.creatorSupportedClub
              ? value.creatorSupportedClub
              : "Neutral"}
          </p>
        ) : null}
        {profilesError ? (
          <p className="mt-2 text-xs text-red-300">
            {profilesError}{" "}
            <button type="button" className="font-semibold underline" onClick={() => void reloadProfiles()}>
              Retry
            </button>
          </p>
        ) : null}
        {!profilesLoading && !profilesError && targetBrand && profiles.length === 0 ? (
          <p className="mt-2 text-xs text-amber-300">
            No active Content Creator profiles for {BRAND_LABEL_BY_TARGET[targetBrand]}. Add one in{" "}
            <Link href="/language-studio?tab=Journalists" className="font-semibold underline">
              Language Studio → Content Creators
            </Link>
            , or fill Creator style below.
          </p>
        ) : null}
        {!creatorProfileComplete ? (
          <p className="mt-2 text-xs font-semibold text-[color:var(--primary)]">
            Select a creator profile or add manual creator style below.
          </p>
        ) : null}
      </BriefSelectionSection>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Creator style</span>
        <textarea
          className={`${inputClass} min-h-[120px]`}
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          value={value.creatorStyleNotes ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              creatorStyleNotes: e.target.value,
              useCreatorProfile: Boolean(value.journalistProfileId),
            })
          }
          placeholder="Select a Content Creator profile above, or enter manual creator style…"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          Article / editorial guidelines
        </span>
        <textarea
          className={`${inputClass} min-h-[140px]`}
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          value={value.articleGuidelines ?? DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES}
          onChange={(e) => onChange({ ...value, articleGuidelines: e.target.value })}
        />
      </label>
    </div>
  );
}

export function EditorialBriefForm({
  value,
  onChange,
  awayValue,
  onAwayChange,
  reportFormat,
  onContinue,
  onBack,
  reportFormatLabel,
}: Props) {
  const isDual = reportFormat ? isDualReportFormat(reportFormat) : false;
  const homeReady = isPerspectiveReady(value);
  const awayReady = isDual && awayValue ? isPerspectiveReady(awayValue) : true;
  const canContinue = homeReady && awayReady;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Step 2</p>
        <h2 className="mt-2 text-2xl font-black text-white">Who is this content for?</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          {isDual
            ? "Neutral dual reports create two linked projects — configure editorial voice separately for the home-perspective and away-perspective reports."
            : "Set editorial voice and guidelines before any match data is imported."}{" "}
          Content creator profiles and style rules are loaded from{" "}
          <Link href="/language-studio?tab=Journalists" className="font-semibold text-emerald-300 underline">
            Language Studio → Content Creators
          </Link>
          .
        </p>
        {reportFormatLabel ? (
          <p
            className="mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold text-sky-200"
            style={{ borderColor: "rgba(56,189,248,0.35)", background: "rgba(14,116,144,0.12)" }}
          >
            {reportFormatLabel}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Sport</span>
          <div
            className="rounded-xl border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
          >
            Football
          </div>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Content style</span>
          <div className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-300">
            Match report
          </div>
        </label>
      </div>

      {isDual && awayValue && onAwayChange ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div
            className="space-y-4 rounded-2xl border p-4"
            style={{ borderColor: "rgba(56,189,248,0.25)", background: "rgba(14,116,144,0.06)" }}
          >
            <h3 className="text-sm font-black uppercase tracking-wide text-sky-200">Home perspective</h3>
            <EditorialBriefPerspectiveFields value={value} onChange={onChange} />
          </div>
          <div
            className="space-y-4 rounded-2xl border p-4"
            style={{ borderColor: "rgba(52,211,153,0.25)", background: "rgba(16,185,129,0.06)" }}
          >
            <h3 className="text-sm font-black uppercase tracking-wide text-emerald-200">Away perspective</h3>
            <EditorialBriefPerspectiveFields value={awayValue} onChange={onAwayChange} />
          </div>
        </div>
      ) : (
        <EditorialBriefPerspectiveFields value={value} onChange={onChange} />
      )}

      {isDual && !awayReady ? (
        <p className="text-sm font-semibold text-amber-300">
          Select a brand for both Home and Away perspectives to continue.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {onBack ? (
          <R365Button variant="ghost" onClick={onBack}>
            ← Back to report type
          </R365Button>
        ) : (
          <span />
        )}
        <R365Button disabled={!canContinue} onClick={onContinue}>
          Continue to Match ID
        </R365Button>
      </div>
    </div>
  );
}
