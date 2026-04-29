import type { CopyVariant, EditorialCopy, EditingProject } from "@/features/editing-studio/types/domain";
import type { PlatformType } from "@/features/editing-studio/types/domain";
import { resolveBrandEditorialRules } from "./resolve-brand";
import type { BrandEditorialRules } from "./types";

export type BrandComplianceSeverity = "info" | "warning";

export type BrandComplianceIssue = {
  id: string;
  severity: BrandComplianceSeverity;
  message: string;
  /** Optional platform when issue is variant-specific. */
  platform?: PlatformType;
};

const EMOJI_RE = /\p{Extended_Pictographic}/u;

function containsEmoji(text: string): boolean {
  return EMOJI_RE.test(text);
}

function countEmojis(text: string): number {
  const m = text.match(/\p{Extended_Pictographic}/gu);
  return m?.length ?? 0;
}

/** Rough UTM detection in URLs for link-handling hints. */
function hasUtmParams(text: string): boolean {
  return /[?&]utm_/i.test(text);
}

function collectCopyText(editorial: EditorialCopy | undefined, variants: CopyVariant[] | undefined): string {
  const parts: string[] = [];
  if (editorial?.subheading) parts.push(editorial.subheading);
  if (editorial?.socialCaption) parts.push(editorial.socialCaption);
  if (editorial?.shortCaption) parts.push(editorial.shortCaption);
  if (editorial?.cta) parts.push(editorial.cta);
  if (editorial?.tone) parts.push(editorial.tone);
  if (editorial?.signOff) parts.push(editorial.signOff);
  if (editorial?.hashtags) parts.push(editorial.hashtags);
  if (editorial?.pinnedComment) parts.push(editorial.pinnedComment);
  if (editorial?.platformNotes) parts.push(editorial.platformNotes);
  if (editorial?.canonicalUrl) parts.push(editorial.canonicalUrl);
  for (const v of variants ?? []) {
    if (v.headline) parts.push(v.headline);
    if (v.subheadline) parts.push(v.subheadline);
    if (v.caption) parts.push(v.caption);
    if (v.body) parts.push(v.body);
    if (v.cta) parts.push(v.cta);
    if (v.signOff) parts.push(v.signOff);
    if (v.linkUrl) parts.push(v.linkUrl);
  }
  return parts.join("\n");
}

function captionLengthForVariant(v: CopyVariant): number {
  const cap = v.caption ?? v.body ?? "";
  return cap.length;
}

/**
 * Brand-specific compliance checks (banned phrases, emoji policy, caption limits, links).
 * Does not replace spellcheck or global copy limits — merge at the caller.
 */
export function computeBrandComplianceIssues(
  project: Pick<EditingProject, "brand" | "editorialCopy" | "copyVariants" | "platforms" | "publicHeadline" | "summary" | "sourceUrl">
): BrandComplianceIssue[] {
  const resolved = resolveBrandEditorialRules(project.brand);
  if (!resolved) return [];
  const rules: BrandEditorialRules = resolved.rules;
  const issues: BrandComplianceIssue[] = [];
  const ec = project.editorialCopy ?? {};
  const combined = [
    collectCopyText(project.editorialCopy, project.copyVariants),
    project.publicHeadline ?? "",
    project.summary ?? "",
    project.sourceUrl ?? "",
  ]
    .join("\n")
    .toLowerCase();

  for (const phrase of rules.bannedPhrases ?? []) {
    const p = phrase.trim().toLowerCase();
    if (!p) continue;
    if (combined.includes(p)) {
      issues.push({
        id: `banned:${p.slice(0, 24)}`,
        severity: "warning",
        message: `Banned phrase for ${rules.displayName}: “${phrase.trim()}”.`,
      });
    }
  }

  const emojiPolicy = rules.emojiGuidance ?? "allowed";
  const blobForEmoji = collectCopyText(project.editorialCopy, project.copyVariants);
  const emojiCount = countEmojis(blobForEmoji);
  if (emojiPolicy === "avoid" && containsEmoji(blobForEmoji)) {
    issues.push({
      id: "emoji:avoid",
      severity: "warning",
      message: `${rules.displayName} prefers no emojis in this copy.`,
    });
  } else if (emojiPolicy === "sparing" && emojiCount > 2) {
    issues.push({
      id: "emoji:sparing",
      severity: "info",
      message: `${rules.displayName}: use emojis sparingly (more than two detected).`,
    });
  }

  const linkRule = rules.linkHandling;
  const linkBlob = [ec.canonicalUrl ?? "", project.sourceUrl ?? "", ...(project.copyVariants ?? []).map((v) => v.linkUrl ?? "")].join(
    " "
  );
  if (linkRule === "strip_utm" && hasUtmParams(linkBlob)) {
    issues.push({
      id: "link:utm",
      severity: "info",
      message: `${rules.displayName}: consider removing UTM parameters from links before publishing.`,
    });
  }

  const maxByPlatform = rules.maxCaptionLengthByPlatform;

  if (maxByPlatform && project.copyVariants?.length) {
    for (const v of project.copyVariants) {
      const max = maxByPlatform[v.platform];
      if (max == null) continue;
      const len = captionLengthForVariant(v);
      if (len > max) {
        issues.push({
          id: `length:${v.platform}:${v.id}`,
          severity: "warning",
          platform: v.platform,
          message: `${rules.displayName} ${v.platform} variant exceeds brand limit (${len}/${max} characters).`,
        });
      }
    }
  }

  return issues;
}
