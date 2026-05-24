import type { WorkflowCommentEntry } from "@/features/editing-studio/types/workflow";

/**
 * Editing Studio — domain model for social / promo editorial workflows.
 * Kept flexible for future publishing integrations (extra fields via meta bags).
 */

export type EditingProjectStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "scheduled"
  | "published"
  | "archived";

export type PlatformType =
  | "facebook"
  | "x"
  | "instagram"
  | "instagram_story"
  | "linkedin"
  | "tiktok"
  | "youtube_shorts"
  | "whatsapp"
  | "telegram";

export type ContentType =
  | "link_post"
  | "image_post"
  | "video_post"
  | "story_post"
  | "article_promo"
  | "shorts_promo";

/** Editorial calendar phase when created from Schedule Studio calendar. */
export type EditingCalendarPhase = "pre_match" | "live" | "report_post";

/** How outbound links should treat UTM query parameters. */
export type UtmPolicy = "preserve" | "strip_all" | "append_brand_utms";

/** Affiliate disclosure / tagging behaviour for publishing handoff. */
export type AffiliatePolicy = "none" | "append_tag" | "disclosure_only";

/**
 * Editorial and publishing metadata (scheduling, roles, tracking, presets).
 * Persisted on the project; merged on PATCH.
 */
export type EditorialProjectSettings = {
  /** Marketing / promo campaign label */
  campaign?: string;
  /** IANA timezone for interpreting publish time in UI (stored time remains ISO UTC on the project). */
  timezone?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  utmPolicy?: UtmPolicy;
  /** Pre-approved sign-off line or template id */
  signOffPreset?: string;
  /** Legal / compliance disclaimer template */
  disclaimerPreset?: string;
  affiliateNetwork?: string;
  affiliateTag?: string;
  affiliatePolicy?: AffiliatePolicy;
  /** BCP 47 locale for localisation */
  locale?: string;
  author?: string;
  editor?: string;
  approver?: string;
  /** Human-readable ACL / permissions summary for reviewers */
  permissionsSummary?: string;
};

/** Classify attached or referenced media. */
export type EditingAssetKind = "image" | "video" | "link" | "file" | "other";

/**
 * A single asset attached to a project (upload path, remote URL, or link).
 */
export type EditingAsset = {
  id: string;
  kind: EditingAssetKind;
  /** Human label in the UI */
  label?: string;
  /** Remote URL when not stored locally */
  url?: string;
  /** App-relative path under output/ or feature storage */
  relPath?: string;
  mimeType?: string;
  byteSize?: number;
  /** Integration-specific payload (dimensions, CDN id, etc.) */
  meta?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

/** Where the variant copy was authored. */
export type CopyVariantSource = "human" | "ai" | "mixed";

/**
 * Platform-specific copy variant; revision is bumped when copy changes for history/export.
 */
export type CopyVariant = {
  id: string;
  platform: PlatformType;
  /** Display label, e.g. "X v2", "Facebook v1". */
  label?: string;
  locale?: string;
  headline?: string;
  subheadline?: string;
  /** Main post caption (preferred). Legacy `body` is used when caption is absent. */
  caption?: string;
  body?: string;
  cta?: string;
  linkUrl?: string;
  hashtags?: string[];
  signOff?: string;
  /** Editorial tone hint for export / review. */
  tone?: string;
  /** Whether this variant is approved for publishing. */
  approved?: boolean;
  sourceHumanOrAi?: CopyVariantSource;
  notes?: string;
  meta?: Record<string, unknown>;
  /** Aligns with project revision semantics for draft/review flows */
  revision: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Primary editorial copy block for social / promo (persisted on the project).
 * Optional fields — UI merges updates; store as a single JSON object.
 */
export type EditorialCopy = {
  subheading?: string;
  socialCaption?: string;
  shortCaption?: string;
  cta?: string;
  /** Voice / tone line — often prefilled from brand rules. */
  tone?: string;
  /** Comma- or newline-separated in the UI */
  hashtags?: string;
  signOff?: string;
  pinnedComment?: string;
  altText?: string;
  /** Comma- or newline-separated tags / categories */
  tagsCategories?: string;
  canonicalUrl?: string;
  platformNotes?: string;
};

/**
 * Root aggregate for an editing project (revision-ready for optimistic updates / exports).
 */
export type EditingProject = {
  id: string;
  /**
   * Internal project title (list / admin label).
   */
  title: string;
  /** Public-facing headline for social / promo copy (manual or editor). */
  publicHeadline?: string;
  /** Short editorial summary. */
  summary?: string;
  /** Long-form body or internal notes (manual entry). */
  bodyNotes?: string;
  /** Structured copy fields (headlines, captions, CTAs, SEO-adjacent text). */
  editorialCopy?: EditorialCopy;
  /** Original article / page URL when created from import. */
  sourceUrl?: string;
  /** Site / brand label for dashboard filters (e.g. Football365, Racing365). */
  brand?: string;
  /** Optional hero thumbnail under `output/` (served via `/api/file?rel=`). */
  thumbnailRel?: string;
  /** Legacy / short description; often mirrors summary for list previews. */
  description?: string;
  status: EditingProjectStatus;
  contentType: ContentType;
  /** Target surfaces for this post */
  platforms: PlatformType[];
  assets: EditingAsset[];
  copyVariants: CopyVariant[];
  /**
   * Selected variant id per platform for export / publishing (one id per platform at most).
   */
  exportVariantPick?: Partial<Record<PlatformType, string>>;
  /**
   * Monotonic revision counter — bump on meaningful edits; exports snapshot this value.
   */
  revision: number;
  scheduledAt?: string;
  publishedAt?: string;
  archivedAt?: string;
  /** Roles, UTM, affiliate, locale, campaign — see EditorialProjectSettings */
  editorialSettings?: EditorialProjectSettings;
  /** Publishing / external IDs / webhook correlation — keep loose */
  integrationMeta?: Record<string, unknown>;
  /** Append-only workflow / reviewer notes (mutated via workflow API only). */
  workflowComments?: WorkflowCommentEntry[];
  /** Parent editorial calendar event when created from Schedule Studio calendar. */
  calendarEventId?: string;
  /** Phase tab (Pre-match / Live / Report·Post) when linked to a fixture event. */
  calendarPhase?: EditingCalendarPhase;
  createdAt: string;
  updatedAt: string;
};

export type EditingProjectExportFormat = "json" | "markdown" | "zip_placeholder";

/**
 * Persisted row for an export run (artifact path, audit), not the downstream JSON payload.
 */
export type EditingExportRun = {
  id: string;
  projectId: string;
  format: EditingProjectExportFormat;
  /** Project revision at time of export */
  revision: number;
  relPath?: string;
  payload?: Record<string, unknown>;
  /** e.g. "user", "cron", "api" */
  source?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

/** Who performed a revision (optional headers or rollback metadata). */
export type EditingRevisionActor = {
  userId?: string;
  displayName?: string;
  email?: string;
  source?: "api" | "rollback" | "create";
};

export type EditingProjectRevisionKind = "create" | "save" | "rollback";

/**
 * Immutable snapshot of a project after a meaningful save (or initial create / rollback).
 */
export type EditingProjectRevision = {
  id: string;
  projectId: string;
  kind: EditingProjectRevisionKind;
  /** Value of `project.revision` after this change was persisted */
  projectRevisionAfter: number;
  createdAt: string;
  changedBy: EditingRevisionActor;
  /** Top-level field keys that changed vs previous persisted state (or `create` for first save) */
  fieldsChanged: readonly string[];
  note?: string;
  /** Full project row at this point in time (used for compare / rollback) */
  snapshot: EditingProject;
};

/** List rows without embedded snapshot payload. */
export type EditingProjectRevisionSummary = Omit<EditingProjectRevision, "snapshot">;

/** Persisted file shape (versioned for migrations). */
export type EditingStudioStoreV1 = {
  version: 1;
  projects: Record<string, EditingProject>;
  exports: Record<string, EditingExportRun>;
};

export type EditingStudioStoreV2 = {
  version: 2;
  projects: Record<string, EditingProject>;
  exports: Record<string, EditingExportRun>;
  revisions: Record<string, EditingProjectRevision>;
  /** Newest revision id first per project */
  revisionIdsByProject: Record<string, string[]>;
};
