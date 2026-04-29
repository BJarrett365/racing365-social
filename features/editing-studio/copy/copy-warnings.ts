import { computeBrandComplianceIssues, getEffectiveCaptionLimitForPlatform, resolveBrandEditorialRules } from "@/features/editing-studio/brands";
import { getCopyDefaultsForBrand } from "@/features/editing-studio/copy/copy-brand-defaults";
import type { EditingProject } from "@/features/editing-studio/types/domain";

export type CopyWarningSeverity = "warning" | "info";

export type CopyWarning = {
  id: string;
  severity: CopyWarningSeverity;
  message: string;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Non-blocking editorial warnings (platform fit, tone, accessibility) plus brand compliance.
 */
export function computeCopyWarnings(project: EditingProject): CopyWarning[] {
  const ec = project.editorialCopy ?? {};
  const platforms = project.platforms ?? [];
  const out: CopyWarning[] = [];
  const brand = project.brand ?? "";

  const headline = (project.publicHeadline ?? "").trim();
  const social = (ec.socialCaption ?? "").trim();
  const short = (ec.shortCaption ?? "").trim();

  if (platforms.includes("x")) {
    const maxX = getEffectiveCaptionLimitForPlatform(brand, "x");
    if (social.length > maxX) {
      out.push({
        id: "x-social-long",
        severity: "warning",
        message: `Social caption is ${social.length} characters — X posts are typically ≤ ${maxX} characters.`,
      });
    } else if (short.length > maxX) {
      out.push({
        id: "x-short-long",
        severity: "warning",
        message: `Short caption is ${short.length} characters — may be too long for X (${maxX}).`,
      });
    }
  }

  if (platforms.includes("instagram")) {
    const maxIg = getEffectiveCaptionLimitForPlatform(brand, "instagram");
    if (social.length > maxIg) {
      out.push({
        id: "ig-caption-long",
        severity: "warning",
        message: `Social caption is ${social.length} characters — Instagram captions are often kept under ${maxIg}.`,
      });
    }
  }

  if (platforms.includes("linkedin")) {
    const maxLi = getEffectiveCaptionLimitForPlatform(brand, "linkedin");
    if (social.length > maxLi) {
      out.push({
        id: "li-post-long",
        severity: "info",
        message: `Social caption is ${social.length} characters — LinkedIn posts are often shorter than ${maxLi} characters.`,
      });
    }
  }

  const wantsCta = ["article_promo", "shorts_promo", "link_post", "image_post", "video_post"].includes(project.contentType);
  if (wantsCta && !ec.cta?.trim()) {
    out.push({
      id: "cta-missing",
      severity: "warning",
      message: "No CTA — add a clear call to action for this content type.",
    });
  }

  const brandDefaults = getCopyDefaultsForBrand(brand);
  if (brandDefaults.signOff && !ec.signOff?.trim()) {
    const resolved = resolveBrandEditorialRules(brand);
    const name = resolved?.rules.displayName ?? project.brand?.trim() ?? "this brand";
    out.push({
      id: "signoff-missing",
      severity: "warning",
      message: `Missing sign-off — ${name} typically uses a closing line.`,
    });
  }

  if (headline && social && norm(headline) === norm(social)) {
    out.push({
      id: "dup-headline-social",
      severity: "warning",
      message: "Public headline and social caption are identical — consider a different hook for social.",
    });
  }
  if (headline && short && norm(headline) === norm(short)) {
    out.push({
      id: "dup-headline-short",
      severity: "warning",
      message: "Public headline and short caption are identical.",
    });
  }
  if (social && short && norm(social) === norm(short)) {
    out.push({
      id: "dup-social-short",
      severity: "warning",
      message: "Social caption and short caption are identical — you may only need one.",
    });
  }

  const hasImageAsset = project.assets.some((a) => a.kind === "image");
  if (hasImageAsset && !ec.altText?.trim()) {
    out.push({
      id: "alt-missing",
      severity: "warning",
      message: "Image asset present but no alt text — add descriptive alt text for accessibility.",
    });
  }

  for (const issue of computeBrandComplianceIssues(project)) {
    out.push({
      id: `brand:${issue.id}`,
      severity: issue.severity,
      message: issue.message,
    });
  }

  return out;
}
