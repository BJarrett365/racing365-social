import { newClientCopyVariantId } from "@/features/editing-studio/lib/variant-id";
import type { CopyVariant, CopyVariantSource, EditingProject, PlatformType } from "@/features/editing-studio/types/domain";

export const VARIANT_TONE_PRESETS = ["", "neutral", "conversational", "urgent", "promotional", "authoritative"] as const;

export function platformShort(platform: PlatformType): string {
  if (platform === "x") return "X";
  if (platform === "instagram_story") return "IG Story";
  return platform
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Caption text: prefer explicit caption, fall back to legacy body. */
export function variantCaption(v: CopyVariant): string {
  return (v.caption ?? v.body ?? "").trim();
}

export function displayVariantLabel(v: CopyVariant): string {
  if (v.label?.trim()) return v.label.trim();
  return `${platformShort(v.platform)} · ${v.id.slice(-8)}`;
}

export function defaultVariantLabel(platform: PlatformType, siblings: CopyVariant[]): string {
  const n = siblings.filter((v) => v.platform === platform).length + 1;
  return `${platformShort(platform)} v${n}`;
}

function parseHashtagsFromEditorial(s: string | undefined): string[] {
  if (!s?.trim()) return [];
  return s
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}

export function prefillVariantFromMaster(draft: EditingProject, platform: PlatformType): Partial<CopyVariant> {
  const ec = draft.editorialCopy ?? {};
  const cap = ec.socialCaption?.trim() || ec.shortCaption?.trim() || "";
  return {
    headline: draft.publicHeadline?.trim() || undefined,
    caption: cap || undefined,
    body: cap || undefined,
    cta: ec.cta?.trim() || undefined,
    hashtags: parseHashtagsFromEditorial(ec.hashtags),
    signOff: ec.signOff?.trim() || undefined,
    tone: "neutral",
  };
}

export function newEmptyVariant(draft: EditingProject, platform: PlatformType): CopyVariant {
  const now = new Date().toISOString();
  const siblings = draft.copyVariants;
  return {
    id: newClientCopyVariantId(),
    platform,
    label: defaultVariantLabel(platform, siblings),
    revision: draft.revision,
    approved: false,
    sourceHumanOrAi: "human",
    createdAt: now,
    updatedAt: now,
  };
}

export function newAiDraftVariant(draft: EditingProject, platform: PlatformType): CopyVariant {
  const v = newEmptyVariant(draft, platform);
  return {
    ...v,
    label: `AI draft · ${platformShort(platform)}`,
    sourceHumanOrAi: "ai",
    notes: "Paste copy from AI writing tools (sidebar) or fill manually.",
  };
}

export function duplicateCopyVariant(original: CopyVariant): CopyVariant {
  const now = new Date().toISOString();
  const baseLabel = original.label?.trim() || displayVariantLabel(original);
  return {
    ...original,
    id: newClientCopyVariantId(),
    label: `${baseLabel} (copy)`,
    approved: false,
    createdAt: now,
    updatedAt: now,
    revision: original.revision,
  };
}

export function normalizeVariantForSave(v: CopyVariant, projectRevision: number): CopyVariant {
  const cap = v.caption?.trim() ?? "";
  const bodyLegacy = v.body?.trim() ?? "";
  const caption = cap || bodyLegacy;
  const hashtags = v.hashtags?.filter(Boolean) ?? [];
  return {
    ...v,
    caption: caption || undefined,
    body: caption || bodyLegacy || undefined,
    hashtags: hashtags.length ? hashtags : undefined,
    revision: projectRevision,
    updatedAt: new Date().toISOString(),
  };
}

export function sourceLabel(s: CopyVariantSource | undefined): string {
  if (s === "ai") return "AI";
  if (s === "mixed") return "Mixed";
  if (s === "human") return "Human";
  return "—";
}
