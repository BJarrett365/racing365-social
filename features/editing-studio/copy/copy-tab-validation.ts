import { getEffectiveCaptionLimitForPlatform, getTightestCaptionLimitForPlatforms } from "@/features/editing-studio/brands/limits";
import { COPY_LIMITS } from "@/features/editing-studio/copy/copy-limits";
import type { EditingProject } from "@/features/editing-studio/types/domain";
import { editorialCopySchema } from "@/features/editing-studio/validators/editing-studio-schemas";

const FIELD_KEYS = new Set([
  "title",
  "publicHeadline",
  "summary",
  "bodyNotes",
  "sourceUrl",
  "subheading",
  "socialCaption",
  "shortCaption",
  "tone",
  "cta",
  "hashtags",
  "signOff",
  "pinnedComment",
  "altText",
  "tagsCategories",
  "canonicalUrl",
  "platformNotes",
]);

/**
 * Inline validation keyed by logical field name (for Copy tab).
 */
export function validateCopyProjectFields(project: EditingProject): Record<string, string> {
  const errors: Record<string, string> = {};

  if (project.title.trim().length === 0) {
    errors.title = "Internal title is required.";
  } else if (project.title.length > COPY_LIMITS.title) {
    errors.title = `Internal title must be ${COPY_LIMITS.title} characters or fewer.`;
  }

  const ph = project.publicHeadline ?? "";
  if (ph.length > COPY_LIMITS.publicHeadline) {
    errors.publicHeadline = `Public headline must be ${COPY_LIMITS.publicHeadline} characters or fewer.`;
  }

  const sum = project.summary ?? "";
  if (sum.length > COPY_LIMITS.summary) {
    errors.summary = `Summary must be ${COPY_LIMITS.summary} characters or fewer.`;
  }

  const body = project.bodyNotes ?? "";
  if (body.length > COPY_LIMITS.bodyNotes) {
    errors.bodyNotes = `Body / notes must be ${COPY_LIMITS.bodyNotes} characters or fewer.`;
  }

  const source = project.sourceUrl?.trim();
  if (source) {
    try {
      const u = new URL(source);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        errors.sourceUrl = "Source URL must use http or https.";
      }
    } catch {
      errors.sourceUrl = "Enter a valid source URL.";
    }
  }

  const ecParsed = editorialCopySchema.safeParse(project.editorialCopy ?? {});
  if (!ecParsed.success) {
    for (const issue of ecParsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && FIELD_KEYS.has(key) && errors[key] === undefined) {
        errors[key] = issue.message;
      }
    }
  }

  const platforms = project.platforms ?? [];
  const brand = project.brand;
  const maxSocial = getTightestCaptionLimitForPlatforms(brand, platforms);
  const social = project.editorialCopy?.socialCaption ?? "";
  if (maxSocial != null && social.length > maxSocial && errors.socialCaption === undefined) {
    errors.socialCaption = `Social caption must be ${maxSocial} characters or fewer for the selected platform(s).`;
  }
  if (platforms.includes("x") && errors.shortCaption === undefined) {
    const maxX = getEffectiveCaptionLimitForPlatform(brand, "x");
    const short = project.editorialCopy?.shortCaption ?? "";
    if (short.length > maxX) {
      errors.shortCaption = `Short caption must be ${maxX} characters or fewer for X.`;
    }
  }

  return errors;
}

export function copyHasBlockingErrors(project: EditingProject): boolean {
  return Object.keys(validateCopyProjectFields(project)).length > 0;
}
