import type { ContentType, PlatformType } from "@/features/editing-studio/types/domain";

/** Stable id for lookups and future CMS sync. */
export type BrandRuleId =
  | "planetf1"
  | "football365"
  | "teamtalk"
  | "planet_rugby"
  | "love_rugby_league"
  | "tennis365"
  | "cricket365"
  | "golf365"
  | "planet_football"
  | "sport365"
  | "racing365"
  /** Umbrella / legacy label still used on some projects */
  | "planetsport";

/** How emojis should be used in copy for this brand. */
export type BrandEmojiGuidance = "avoid" | "sparing" | "allowed" | "encouraged";

/**
 * Link handling expectation for compliance hints (extend with new string tokens as needed).
 * Examples: `strip_utm`, `prefer_https`, `use_canonical`.
 */
export type BrandLinkHandlingRule = string;

/** Suggested image treatment for promos (export / design handoff). */
export type BrandImageOverlayStyle = "none" | "lower_third" | "brand_bug" | "watermark" | "corner_bug" | string;

/**
 * Full editorial rules for one Planet Sport network brand.
 * Add fields here as the product grows — keep optional for backward compatibility.
 */
export type BrandEditorialRules = {
  id: BrandRuleId;
  /** Human-readable name in UI. */
  displayName: string;
  /** Match `draft.brand` case-insensitively; include abbreviations and common typos. */
  aliases: readonly string[];
  /** Default hero / wordmark URL or app-relative path (optional). */
  defaultLogoUrl?: string;
  defaultCta?: string;
  defaultSignOff?: string;
  /** Suggested hashtags (first-class citizens for “apply defaults” / compliance tips). */
  hashtagBank?: readonly string[];
  bannedPhrases?: readonly string[];
  /** Short guidance, e.g. "neutral, fact-led" */
  preferredTone?: string;
  emojiGuidance?: BrandEmojiGuidance;
  /** Per-platform max caption length (characters). Overrides global fallbacks when set. */
  maxCaptionLengthByPlatform?: Partial<Record<PlatformType, number>>;
  linkHandling?: BrandLinkHandlingRule;
  imageOverlayStyle?: BrandImageOverlayStyle;
  /** Optional closing lines / outros (e.g. second sign-off line). */
  outroDefaults?: readonly string[];
  defaultContentType?: ContentType;
  defaultPlatforms?: readonly PlatformType[];
};

export type ResolvedBrandRules = {
  rules: BrandEditorialRules;
  /** Normalized key used to match (e.g. slug). */
  matchedAlias: string;
};
