import { defaultVariantLabel } from "@/features/editing-studio/variants/variant-helpers";
import { newClientCopyVariantId } from "@/features/editing-studio/lib/variant-id";
import type { EditorialCopy, EditingProject, PlatformType } from "@/features/editing-studio/types/domain";

/** Fields the AI panel can write into (non-destructive until user accepts). */
export type AiTargetField =
  | "publicHeadline"
  | "socialCaption"
  | "shortCaption"
  | "subheading"
  | "cta"
  | "pinnedComment"
  | "hashtags"
  | "platformNotes"
  | "summary"
  | "bodyNotes";

export const AI_TARGET_FIELDS: readonly AiTargetField[] = [
  "socialCaption",
  "publicHeadline",
  "shortCaption",
  "subheading",
  "cta",
  "pinnedComment",
  "hashtags",
  "platformNotes",
  "summary",
  "bodyNotes",
] as const;

export function aiTargetLabel(f: AiTargetField): string {
  const map: Record<AiTargetField, string> = {
    publicHeadline: "Public headline",
    socialCaption: "Social caption",
    shortCaption: "Short caption",
    subheading: "Subheading / deck",
    cta: "CTA",
    pinnedComment: "Pinned comment",
    hashtags: "Hashtags",
    platformNotes: "Platform notes",
    summary: "Summary",
    bodyNotes: "Body / notes",
  };
  return map[f];
}

export function getFieldString(draft: EditingProject, field: AiTargetField): string {
  const ec = draft.editorialCopy ?? {};
  switch (field) {
    case "publicHeadline":
      return draft.publicHeadline ?? "";
    case "socialCaption":
      return ec.socialCaption ?? "";
    case "shortCaption":
      return ec.shortCaption ?? "";
    case "subheading":
      return ec.subheading ?? "";
    case "cta":
      return ec.cta ?? "";
    case "pinnedComment":
      return ec.pinnedComment ?? "";
    case "hashtags":
      return ec.hashtags ?? "";
    case "platformNotes":
      return ec.platformNotes ?? "";
    case "summary":
      return draft.summary ?? "";
    case "bodyNotes":
      return draft.bodyNotes ?? "";
    default:
      return "";
  }
}

export function setFieldString(
  draft: EditingProject,
  field: AiTargetField,
  value: string,
): EditingProject {
  const ec: EditorialCopy = { ...draft.editorialCopy };
  switch (field) {
    case "publicHeadline":
      return { ...draft, publicHeadline: value };
    case "socialCaption":
      ec.socialCaption = value;
      return { ...draft, editorialCopy: ec };
    case "shortCaption":
      ec.shortCaption = value;
      return { ...draft, editorialCopy: ec };
    case "subheading":
      ec.subheading = value;
      return { ...draft, editorialCopy: ec };
    case "cta":
      ec.cta = value;
      return { ...draft, editorialCopy: ec };
    case "pinnedComment":
      ec.pinnedComment = value;
      return { ...draft, editorialCopy: ec };
    case "hashtags":
      ec.hashtags = value;
      return { ...draft, editorialCopy: ec };
    case "platformNotes":
      ec.platformNotes = value;
      return { ...draft, editorialCopy: ec };
    case "summary":
      return { ...draft, summary: value, description: value };
    case "bodyNotes":
      return { ...draft, bodyNotes: value };
    default:
      return draft;
  }
}

/** Default text sent to AI when no custom source is provided. */
export function defaultAiSourceText(draft: EditingProject): string {
  const ec = draft.editorialCopy ?? {};
  return (
    ec.socialCaption?.trim() ||
    draft.publicHeadline?.trim() ||
    ec.shortCaption?.trim() ||
    draft.summary?.trim() ||
    draft.bodyNotes?.trim() ||
    draft.title
  );
}

export function insertBelowBlock(current: string, addition: string): string {
  const a = current.trimEnd();
  const b = addition.trim();
  if (!b) return current;
  if (!a) return b;
  return `${a}\n\n${b}`;
}

export function mergeHashtags(existing: string, tags: string[]): string {
  const normalized = tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
  const e = existing.trim();
  if (!e) return normalized;
  return `${e} ${normalized}`;
}

/** Save AI output as a copy variant (does not replace editor fields). */
export function appendVariantFromTarget(
  draft: EditingProject,
  text: string,
  platform: PlatformType,
  target: AiTargetField,
): EditingProject {
  const now = new Date().toISOString();
  const id = newClientCopyVariantId();
  const label = defaultVariantLabel(platform, draft.copyVariants);
  const base = {
    id,
    platform,
    label,
    revision: draft.revision,
    createdAt: now,
    updatedAt: now,
    approved: false,
    sourceHumanOrAi: "ai" as const,
  };
  if (target === "publicHeadline") {
    return {
      ...draft,
      copyVariants: [...draft.copyVariants, { ...base, headline: text }],
    };
  }
  if (target === "subheading") {
    return {
      ...draft,
      copyVariants: [...draft.copyVariants, { ...base, subheadline: text }],
    };
  }
  return {
    ...draft,
    copyVariants: [...draft.copyVariants, { ...base, caption: text, body: text }],
  };
}
