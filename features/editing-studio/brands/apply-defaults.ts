import type { EditorialCopy, EditingProject } from "@/features/editing-studio/types/domain";
import type { PlatformType } from "@/features/editing-studio/types/domain";
import { resolveBrandEditorialRules } from "./resolve-brand";
import type { BrandEditorialRules } from "./types";

export type EditorialCopyPatch = Partial<EditorialCopy>;

export type ProjectBrandDefaultsPatch = {
  editorialCopy?: EditorialCopyPatch;
  contentType?: EditingProject["contentType"];
  platforms?: PlatformType[];
  /** When brand supplies a default logo path and project has no hero thumbnail yet. */
  thumbnailRel?: string;
};

/**
 * Build patches for editorial copy from resolved brand rules (only fills empty fields).
 */
export function buildEditorialCopyDefaultsFromRules(
  rules: BrandEditorialRules,
  current: EditorialCopy | undefined
): EditorialCopyPatch {
  const patch: EditorialCopyPatch = {};
  const c = current ?? {};
  if (!c.cta?.trim() && rules.defaultCta) patch.cta = rules.defaultCta;
  if (!c.signOff?.trim() && rules.defaultSignOff) patch.signOff = rules.defaultSignOff;
  if (!c.tone?.trim() && rules.preferredTone) patch.tone = rules.preferredTone;
  if (!c.hashtags?.trim() && rules.hashtagBank?.length) {
    patch.hashtags = rules.hashtagBank.join(", ");
  }
  if (!c.pinnedComment?.trim() && rules.outroDefaults?.length) {
    patch.pinnedComment = rules.outroDefaults[0];
  }
  return patch;
}

/**
 * Merge brand defaults into editorial copy (empty fields only).
 */
export function applyBrandDefaultsToEditorialCopy(
  brandRaw: string | undefined | null,
  current: EditorialCopy | undefined
): EditorialCopy {
  const resolved = resolveBrandEditorialRules(brandRaw);
  if (!resolved) return { ...current };
  const patch = buildEditorialCopyDefaultsFromRules(resolved.rules, current);
  return { ...current, ...patch };
}

/**
 * Project-level defaults: content type, platforms, thumbnail — only when missing.
 */
export function buildProjectBrandDefaultsPatch(
  brandRaw: string | undefined | null,
  project: Pick<EditingProject, "contentType" | "platforms" | "editorialCopy" | "thumbnailRel">
): ProjectBrandDefaultsPatch {
  const resolved = resolveBrandEditorialRules(brandRaw);
  if (!resolved) return {};
  const { rules } = resolved;
  const patch: ProjectBrandDefaultsPatch = {};

  if (!project.contentType && rules.defaultContentType) {
    patch.contentType = rules.defaultContentType;
  }
  if ((!project.platforms || project.platforms.length === 0) && rules.defaultPlatforms?.length) {
    patch.platforms = [...rules.defaultPlatforms];
  }
  if (!project.thumbnailRel?.trim() && rules.defaultLogoUrl?.trim()) {
    patch.thumbnailRel = rules.defaultLogoUrl;
  }

  const copyPatch = buildEditorialCopyDefaultsFromRules(rules, project.editorialCopy);
  if (Object.keys(copyPatch).length > 0) {
    patch.editorialCopy = copyPatch;
  }

  return patch;
}
